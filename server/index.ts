import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { connectToDatabase, User, Session, ApplicationConfig, ApplicationSubmission, GuildPremium, PremiumCode, FREE_TIER_LIMIT, PREMIUM_TIER_LIMIT } from '../lib/mongodb';
import {
  getDiscordUserFromToken,
  getDiscordGuildsFromToken,
  getValidAccessToken,
  createSession,
  getSessionOdId,
  deleteSession,
  getBotGuilds,
  parseCookies,
  createSessionCookie,
  createOAuthStateCookie,
  clearSessionCookie,
  clearOAuthStateCookie,
} from '../lib/auth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.header('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Helper function to get session user for authenticated routes
async function getSessionUser(req: Request): Promise<{ odId: string; accessToken: string | null } | null> {
  const cookies = parseCookies(req.headers.cookie || '');
  const sessionId = cookies['session'];
  
  if (!sessionId) return null;
  
  const odId = await getSessionOdId(sessionId);
  if (!odId) return null;
  
  const accessToken = await getValidAccessToken(odId);
  return { odId, accessToken };
}

// Auth middleware
async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const cookies = parseCookies(req.headers.cookie || '');
  const sessionId = cookies['session'];
  
  if (!sessionId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const odId = await getSessionOdId(sessionId);
  
  if (!odId) {
    return res.status(401).json({ error: 'Invalid session' });
  }
  
  (req as any).odId = odId;
  next();
}

// =====================
// AUTH ROUTES
// =====================

// Helper to get host for OAuth redirect URIs
// - In production (behind proxy), use x-forwarded-host without port
// - In development (localhost), keep the full host:port for local testing
function getOAuthHost(req: Request): string {
  // If there's a forwarded host (common in proxied setups like Render), use that
  const forwardedHost = req.headers['x-forwarded-host'] as string;
  if (forwardedHost) {
    // Forwarded hosts from proxies typically don't include port (standard 443)
    return forwardedHost;
  }
  
  const host = req.headers.host || '';
  
  // For localhost/development, keep the full host:port so Discord callback works
  const hostname = host.split(':')[0];
  if (hostname === 'localhost' || hostname.startsWith('127.')) {
    return host; // Keep port for local development
  }
  
  // For production without x-forwarded-host, strip non-standard ports
  // (standard ports 80/443 are typically not included in host header)
  return host;
}

// Helper to check if connection is secure (respects x-forwarded-proto from reverse proxies)
function isSecureRequest(req: Request): boolean {
  // Check x-forwarded-proto header (set by Render, Heroku, etc.)
  const forwardedProto = req.headers['x-forwarded-proto'] as string;
  if (forwardedProto) {
    return forwardedProto === 'https';
  }
  
  // Fallback to checking the host
  const host = req.headers.host || '';
  return !host.includes('localhost') && !host.startsWith('127.0.0.1');
}

// Helper to get the correct protocol for OAuth redirect URIs
function getProtocol(req: Request): string {
  const forwardedProto = req.headers['x-forwarded-proto'] as string;
  if (forwardedProto) {
    return forwardedProto;
  }
  
  const host = req.headers.host || '';
  return host.includes('localhost') ? 'http' : 'https';
}

// Build redirect URI respecting forwarded headers
function buildRedirectUri(req: Request): string {
  const protocol = getProtocol(req);
  const host = getOAuthHost(req);
  return `${protocol}://${host}/api/auth/callback`;
}

// Build Discord OAuth URL using request-aware redirect URI
function buildDiscordOAuthUrl(state: string, req: Request): string {
  const redirectUri = buildRedirectUri(req);
  const clientId = process.env.CLIENT_ID || "";
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify guilds",
    state,
  });
  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

// Exchange code for tokens using request-aware redirect URI
async function exchangeCodeWithRequest(code: string, req: Request) {
  const redirectUri = buildRedirectUri(req);
  const clientId = process.env.CLIENT_ID || "";
  const clientSecret = process.env.DISCORD_CLIENT_SECRET || "";
  
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  const response = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to exchange code for tokens: ${errorText}`);
  }

  return response.json();
}

// GET /api/auth/login
app.get('/api/auth/login', (req: Request, res: Response) => {
  const state = crypto.randomBytes(16).toString('hex');
  const secure = isSecureRequest(req);
  
  const oauthUrl = buildDiscordOAuthUrl(state, req);
  
  res.setHeader('Set-Cookie', createOAuthStateCookie(state, secure));
  res.redirect(302, oauthUrl);
});

// GET /api/auth/callback
app.get('/api/auth/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;
    const cookies = parseCookies(req.headers.cookie || '');
    const savedState = cookies['oauth_state'];
    const secure = isSecureRequest(req);
    
    if (!code || typeof code !== 'string') {
      return res.redirect('/?error=no_code');
    }
    
    if (state !== savedState) {
      return res.redirect('/?error=invalid_state');
    }
    
    const tokens = await exchangeCodeWithRequest(code, req);
    const discordUser = await getDiscordUserFromToken(tokens.access_token);
    
    await connectToDatabase();
    
    const odId = discordUser.id;
    const avatarUrl = discordUser.avatar 
      ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
      : `https://cdn.discordapp.com/embed/avatars/${parseInt(discordUser.discriminator || '0') % 5}.png`;
    
    await User.findOneAndUpdate(
      { odId },
      {
        odId,
        discordId: discordUser.id,
        username: discordUser.username,
        discriminator: discordUser.discriminator || '0',
        avatar: avatarUrl,
        globalName: discordUser.global_name || null,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      },
      { upsert: true, new: true }
    );
    
    const sessionId = await createSession(odId);
    
    res.setHeader('Set-Cookie', [
      createSessionCookie(sessionId, secure),
      clearOAuthStateCookie(secure)
    ]);
    
    res.redirect('/servers');
  } catch (error) {
    console.error('Auth callback error:', error);
    res.redirect('/?error=auth_failed');
  }
});

// GET /api/auth/me
app.get('/api/auth/me', async (req: Request, res: Response) => {
  try {
    const cookies = parseCookies(req.headers.cookie || '');
    const sessionId = cookies['session'];
    
    if (!sessionId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const odId = await getSessionOdId(sessionId);
    
    if (!odId) {
      return res.status(401).json({ error: 'Invalid session' });
    }
    
    await connectToDatabase();
    const user = await User.findOne({ odId }).lean();
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    res.json({
      id: (user as any).odId,
      username: (user as any).username,
      discriminator: (user as any).discriminator,
      avatar: (user as any).avatar,
      globalName: (user as any).globalName,
    });
  } catch (error) {
    console.error('Auth me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout handler - shared logic
async function handleLogout(req: Request, res: Response) {
  try {
    const cookies = parseCookies(req.headers.cookie || '');
    const sessionId = cookies['session'];
    const secure = isSecureRequest(req);
    
    if (sessionId) {
      await deleteSession(sessionId);
    }
    
    res.setHeader('Set-Cookie', clearSessionCookie(secure));
    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// GET/POST /api/auth/logout - Support both methods for compatibility
app.get('/api/auth/logout', handleLogout);
app.post('/api/auth/logout', handleLogout);

// =====================
// BOT ROUTES
// =====================

// GET /api/bot/callback
app.get('/api/bot/callback', (req: Request, res: Response) => {
  const { guild_id, error } = req.query;
  
  if (error) {
    return res.redirect(`/servers?error=${encodeURIComponent(error as string)}`);
  }
  
  if (guild_id) {
    return res.redirect(`/dashboard/${guild_id}?bot_added=true`);
  }
  
  res.redirect('/servers?bot_added=true');
});

// =====================
// GUILDS ROUTES
// =====================

// GET /api/guilds
app.get('/api/guilds', async (req: Request, res: Response) => {
  try {
    const cookies = parseCookies(req.headers.cookie || '');
    const sessionId = cookies['session'];
    
    if (!sessionId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const odId = await getSessionOdId(sessionId);
    
    if (!odId) {
      return res.status(401).json({ error: 'Invalid session' });
    }
    
    const accessToken = await getValidAccessToken(odId);
    
    if (!accessToken) {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    const [userGuilds, botGuildIds] = await Promise.all([
      getDiscordGuildsFromToken(accessToken),
      getBotGuilds()
    ]);
    
    const ADMIN_PERMISSION = BigInt(0x8);
    
    const adminGuilds = userGuilds
      .filter((guild: any) => {
        const permissions = BigInt(guild.permissions);
        return guild.owner || (permissions & ADMIN_PERMISSION) === ADMIN_PERMISSION;
      })
      .map((guild: any) => ({
        id: guild.id,
        name: guild.name,
        icon: guild.icon 
          ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`
          : null,
        owner: guild.owner,
        permissions: guild.permissions,
        isAdmin: true,
        botAdded: botGuildIds.has(guild.id),
        prefix: '!',
      }));
    
    res.json(adminGuilds);
  } catch (error) {
    console.error('Guilds error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/guilds/:id/channels
app.get('/api/guilds/:id/channels', async (req: Request, res: Response) => {
  try {
    const session = await getSessionUser(req);
    if (!session?.accessToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const guildId = req.params.id;

    const botToken = process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN;
    if (!botToken) {
      return res.status(500).json({ error: 'Bot token not configured' });
    }

    const channelsResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
      headers: {
        'Authorization': `Bot ${botToken}`,
      },
    });

    if (!channelsResponse.ok) {
      if (channelsResponse.status === 403) {
        return res.status(403).json({ error: 'Bot does not have access to this server' });
      }
      return res.status(channelsResponse.status).json({ error: 'Failed to fetch channels' });
    }

    const channels = await channelsResponse.json();

    const textChannels = channels
      .filter((c: any) => c.type === 0)
      .map((c: any) => ({
        id: c.id,
        name: c.name,
        type: 'text',
        parentId: c.parent_id,
      }));

    const categories = channels
      .filter((c: any) => c.type === 4)
      .map((c: any) => ({
        id: c.id,
        name: c.name,
        type: 'category',
      }));

    res.json({ textChannels, categories });
  } catch (error) {
    console.error('Error fetching channels:', error);
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

// GET/PUT/PATCH /api/guilds/:id/config
app.get('/api/guilds/:id/config', requireAuth, async (req: Request, res: Response) => {
  try {
    const guildId = req.params.id;
    
    await connectToDatabase();
    const config = await ApplicationConfig.findOne({ guildId }).lean();
    
    if (!config) {
      return res.json({
        guildId,
        channelId: null,
        logsChannelId: null,
        categoryId: null,
        enabled: false,
        questions: [],
        requiredRole: null,
        approvedRole: null,
        rejectedRole: null,
        staffAdminRole: null,
        cooldown: 86400000,
        stats: {
          totalApplications: 0,
          approved: 0,
          rejected: 0,
          pending: 0,
        },
      });
    }
    
    res.json(config);
  } catch (error) {
    console.error('Config error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/guilds/:id/config', requireAuth, async (req: Request, res: Response) => {
  try {
    const guildId = req.params.id;
    const updates = req.body;
    
    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }
    
    await connectToDatabase();
    const config = await ApplicationConfig.findOneAndUpdate(
      { guildId },
      { $set: { ...updates, guildId } },
      { upsert: true, new: true }
    ).lean();
    
    res.json(config);
  } catch (error) {
    console.error('Config error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.patch('/api/guilds/:id/config', requireAuth, async (req: Request, res: Response) => {
  try {
    const guildId = req.params.id;
    const updates = req.body;
    
    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }
    
    await connectToDatabase();
    const config = await ApplicationConfig.findOneAndUpdate(
      { guildId },
      { $set: { ...updates, guildId } },
      { upsert: true, new: true }
    ).lean();
    
    res.json(config);
  } catch (error) {
    console.error('Config error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET/PATCH /api/guilds/:id/applications
app.get('/api/guilds/:id/applications', requireAuth, async (req: Request, res: Response) => {
  try {
    const guildId = req.params.id;
    
    await connectToDatabase();
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    
    const query: any = { guildId };
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query.status = status;
    }
    
    const [applications, total] = await Promise.all([
      ApplicationSubmission.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ApplicationSubmission.countDocuments(query),
    ]);
    
    res.json({
      applications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Applications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.patch('/api/guilds/:id/applications', requireAuth, async (req: Request, res: Response) => {
  try {
    const guildId = req.params.id;
    const odId = (req as any).odId;
    const { applicationId, status, reason } = req.body;
    
    if (!applicationId) {
      return res.status(400).json({ error: 'Application ID required' });
    }
    
    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Valid status (approved/rejected) required' });
    }
    
    await connectToDatabase();
    
    const application = await ApplicationSubmission.findOneAndUpdate(
      { applicationId, guildId },
      {
        $set: {
          status,
          reason: reason || null,
          reviewedBy: odId,
          reviewedAt: new Date(),
        }
      },
      { new: true }
    ).lean();
    
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    const statsUpdate: Record<string, number> = {
      [`stats.${status}`]: 1,
      'stats.pending': -1,
    };
    
    await ApplicationConfig.findOneAndUpdate(
      { guildId },
      { $inc: statsUpdate }
    );
    
    res.json({ success: true, application });
  } catch (error) {
    console.error('Applications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET/POST /api/guilds/:id/premium
app.get('/api/guilds/:id/premium', requireAuth, async (req: Request, res: Response) => {
  try {
    const guildId = req.params.id;
    
    await connectToDatabase();
    
    let premium: any = await GuildPremium.findOne({ guildId }).lean();
    
    if (!premium) {
      premium = {
        guildId,
        isPremium: false,
        premiumSince: null,
        premiumExpiry: null,
        applicationLimit: FREE_TIER_LIMIT,
        applicationsUsed: 0,
        tier: 'free',
      };
    }
    
    const now = new Date();
    const isPremiumActive = premium.isPremium && 
      premium.premiumExpiry && 
      new Date(premium.premiumExpiry) > now;
    
    res.json({
      guildId,
      isPremium: isPremiumActive,
      premiumSince: premium.premiumSince,
      premiumExpiry: premium.premiumExpiry,
      applicationLimit: isPremiumActive ? PREMIUM_TIER_LIMIT : FREE_TIER_LIMIT,
      applicationsUsed: premium.applicationsUsed || 0,
      tier: isPremiumActive ? 'premium' : 'free',
    });
  } catch (error) {
    console.error('Premium error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/guilds/:id/premium', requireAuth, async (req: Request, res: Response) => {
  try {
    const guildId = req.params.id;
    const odId = (req as any).odId;
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ success: false, message: 'Code is required' });
    }
    
    await connectToDatabase();
    
    const premiumCode: any = await PremiumCode.findOne({ 
      code: code.toUpperCase(),
      isActive: true,
    });
    
    if (!premiumCode) {
      return res.status(400).json({ success: false, message: 'Invalid or expired code' });
    }
    
    if (premiumCode.maxUses > 0 && premiumCode.usedCount >= premiumCode.maxUses) {
      return res.status(400).json({ success: false, message: 'Code has reached maximum uses' });
    }
    
    if (premiumCode.expiresAt && new Date(premiumCode.expiresAt) < new Date()) {
      return res.status(400).json({ success: false, message: 'Code has expired' });
    }
    
    const alreadyUsed = premiumCode.usedBy?.some(
      (use: any) => use.guildId === guildId
    );
    
    if (alreadyUsed) {
      return res.status(400).json({ success: false, message: 'Code already used for this server' });
    }
    
    let guildPremium: any = await GuildPremium.findOne({ guildId });
    
    if (!guildPremium) {
      guildPremium = new GuildPremium({
        guildId,
        isPremium: false,
        applicationLimit: FREE_TIER_LIMIT,
        applicationsUsed: 0,
      });
    }
    
    const now = new Date();
    const currentExpiry = guildPremium.premiumExpiry && new Date(guildPremium.premiumExpiry) > now
      ? new Date(guildPremium.premiumExpiry)
      : now;
    
    const newExpiry = new Date(currentExpiry.getTime() + premiumCode.duration);
    
    guildPremium.isPremium = true;
    guildPremium.premiumSince = guildPremium.premiumSince || now;
    guildPremium.premiumExpiry = newExpiry;
    guildPremium.applicationLimit = PREMIUM_TIER_LIMIT;
    guildPremium.redeemedCodes = guildPremium.redeemedCodes || [];
    guildPremium.redeemedCodes.push({
      code: premiumCode.code,
      redeemedAt: now,
      duration: premiumCode.duration,
    });
    
    await guildPremium.save();
    
    premiumCode.usedCount += 1;
    premiumCode.usedBy = premiumCode.usedBy || [];
    premiumCode.usedBy.push({
      guildId,
      usedAt: now,
      usedByUserId: odId,
    });
    await premiumCode.save();
    
    res.json({
      success: true,
      message: 'Premium activated successfully!',
      premium: {
        isPremium: true,
        premiumExpiry: newExpiry.toISOString(),
        applicationLimit: PREMIUM_TIER_LIMIT,
        applicationsUsed: guildPremium.applicationsUsed,
      },
    });
  } catch (error) {
    console.error('Premium error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/guilds/:id/send-panel
app.post('/api/guilds/:id/send-panel', async (req: Request, res: Response) => {
  try {
    const session = await getSessionUser(req);
    if (!session?.accessToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    await connectToDatabase();
    const guildId = req.params.id;
    const { channelId: targetChannelId, updateConfig: shouldUpdateConfig } = req.body || {};

    const botToken = process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN;
    if (!botToken) {
      return res.status(500).json({ error: 'Bot token not configured' });
    }

    let config: any = await ApplicationConfig.findOne({ guildId });

    if (!config && targetChannelId) {
      config = new ApplicationConfig({
        guildId,
        channelId: targetChannelId,
        logsChannelId: targetChannelId,
        categoryId: null,
        enabled: true,
        questions: [
          "What is your age?",
          "What timezone are you in?",
          "Why do you want to become a staff member?",
          "Do you have any previous moderation experience?",
          "How active can you be per week?"
        ],
        cooldown: 86400000,
      });
      await config.save();
    } else if (!config) {
      return res.status(404).json({ error: "Application system not configured. Please select a channel to send the panel or configure the system in the Config tab." });
    }

    const sendToChannel = targetChannelId || config.channelId;

    if (!sendToChannel) {
      return res.status(400).json({ error: "No channel specified. Please select a channel to send the panel." });
    }

    if (shouldUpdateConfig && targetChannelId && targetChannelId !== config.channelId) {
      await ApplicationConfig.findOneAndUpdate(
        { guildId },
        { $set: { channelId: targetChannelId } }
      );
    }

    const panelContent = {
      components: [
        {
          type: 17,
          accent_color: 5793266,
          components: [
            {
              type: 10,
              content: "## Staff Application"
            },
            {
              type: 14,
              divider: true
            },
            {
              type: 10,
              content: "Want to become a staff member? Click the button below to apply!\n\n**Requirements:**\n- Be respectful and follow all server rules\n- Be active in the community\n- Have a clear microphone (if applicable)\n\n**Note:** You can only apply once every 24 hours."
            },
            {
              type: 14,
              divider: true
            },
            {
              type: 10,
              content: "-# Staff Application System"
            },
            {
              type: 14,
              divider: false
            },
            {
              type: 1,
              components: [
                {
                  type: 2,
                  style: 1,
                  label: "Apply Now",
                  custom_id: "app_apply_button"
                }
              ]
            }
          ]
        }
      ],
      flags: 32768
    };

    const response = await fetch(`https://discord.com/api/v10/channels/${sendToChannel}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bot ${botToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(panelContent)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Discord API error:", response.status, errorData);
      
      if (response.status === 403) {
        return res.status(403).json({ error: "Bot doesn't have permission to send messages in the selected channel" });
      }
      if (response.status === 404) {
        return res.status(404).json({ error: "Channel not found. The channel may have been deleted." });
      }
      
      return res.status(500).json({ error: "Failed to send panel to Discord" });
    }

    const messageData = await response.json();

    res.json({ 
      success: true, 
      message: "Application panel sent successfully",
      messageId: messageData.id,
      channelId: sendToChannel
    });
  } catch (error) {
    console.error('Error sending panel:', error);
    res.status(500).json({ error: 'Failed to send panel' });
  }
});

// GET/PATCH /api/guilds/:id/settings
const settingsStore: Record<string, any> = {};

app.get('/api/guilds/:id/settings', async (req: Request, res: Response) => {
  try {
    const session = await getSessionUser(req);
    if (!session?.accessToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const guildId = req.params.id;

    const guildSettings = settingsStore[guildId] || {
      guildId,
      prefix: "!",
      language: "English",
    };
    res.json(guildSettings);
  } catch (error) {
    console.error('Error with settings:', error);
    res.status(500).json({ error: 'Failed to process settings' });
  }
});

app.patch('/api/guilds/:id/settings', async (req: Request, res: Response) => {
  try {
    const session = await getSessionUser(req);
    if (!session?.accessToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const guildId = req.params.id;
    const { prefix, language } = req.body;

    settingsStore[guildId] = {
      guildId,
      prefix: prefix || settingsStore[guildId]?.prefix || "!",
      language: language || settingsStore[guildId]?.language || "English",
    };

    res.json(settingsStore[guildId]);
  } catch (error) {
    console.error('Error with settings:', error);
    res.status(500).json({ error: 'Failed to process settings' });
  }
});

// GET /api/guilds/:id/stats
app.get('/api/guilds/:id/stats', async (req: Request, res: Response) => {
  try {
    const session = await getSessionUser(req);
    if (!session?.accessToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    await connectToDatabase();
    const guildId = req.params.id;

    const config = await ApplicationConfig.findOne({ guildId }).lean();

    const [totalApplications, approved, rejected, pending] = await Promise.all([
      ApplicationSubmission.countDocuments({ guildId }),
      ApplicationSubmission.countDocuments({ guildId, status: 'approved' }),
      ApplicationSubmission.countDocuments({ guildId, status: 'rejected' }),
      ApplicationSubmission.countDocuments({ guildId, status: 'pending' }),
    ]);

    res.json({
      totalApplications,
      approved,
      rejected,
      pending,
      enabled: (config as any)?.enabled ?? false,
      questionsCount: (config as any)?.questions?.length ?? 0,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// =====================
// STATIC FILE SERVING
// =====================

// Serve static files from the dist folder in production
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req: Request, res: Response) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(distPath, 'index.html'));
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
