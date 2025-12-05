import { connectToDatabase, User, Session } from './mongodb';
import crypto from 'crypto';

const DISCORD_CLIENT_ID = process.env.CLIENT_ID || "";
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || "";

export function getRedirectUri(host: string): string {
  const protocol = host.includes('localhost') ? 'http' : 'https';
  return `${protocol}://${host}/api/auth/callback`;
}

export function getDiscordOAuthUrl(state: string, host: string): string {
  const redirectUri = getRedirectUri(host);
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify guilds",
    state,
  });
  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string, host: string) {
  const redirectUri = getRedirectUri(host);
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    client_secret: DISCORD_CLIENT_SECRET,
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

export async function refreshDiscordToken(refreshToken: string) {
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    client_secret: DISCORD_CLIENT_SECRET,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const response = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh token");
  }

  return response.json();
}

export async function getDiscordUserFromToken(accessToken: string) {
  const response = await fetch("https://discord.com/api/users/@me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch user");
  }

  return response.json();
}

export async function getDiscordGuildsFromToken(accessToken: string) {
  const response = await fetch("https://discord.com/api/users/@me/guilds", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch guilds");
  }

  return response.json();
}

export async function getValidAccessToken(odId: string): Promise<string | null> {
  await connectToDatabase();
  const user = await User.findOne({ odId }).lean();
  
  if (!user) {
    return null;
  }

  const now = new Date();

  if (new Date(user.tokenExpiresAt) > now) {
    return user.accessToken;
  }

  try {
    const tokens = await refreshDiscordToken(user.refreshToken);
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    await User.findOneAndUpdate(
      { odId },
      {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: expiresAt,
      }
    );

    return tokens.access_token;
  } catch (error) {
    console.error("Failed to refresh token:", error);
    return null;
  }
}

export async function createSession(odId: string): Promise<string> {
  await connectToDatabase();
  const sessionId = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await Session.create({
    odId,
    sessionId,
    expiresAt,
  });

  return sessionId;
}

export async function getSessionOdId(sessionId: string): Promise<string | null> {
  if (!sessionId) return null;
  
  await connectToDatabase();
  const session = await Session.findOne({ 
    sessionId,
    expiresAt: { $gt: new Date() }
  }).lean();
  
  return session?.odId || null;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await connectToDatabase();
  await Session.deleteOne({ sessionId });
}

let botGuildsCache: Set<string> | null = null;
let botGuildsCacheTime = 0;
const BOT_GUILDS_CACHE_TTL = 60000;

export async function getBotGuilds(): Promise<Set<string>> {
  const now = Date.now();
  if (botGuildsCache && now - botGuildsCacheTime < BOT_GUILDS_CACHE_TTL) {
    return botGuildsCache;
  }

  const botToken = process.env.DISCORD_TOKEN;
  if (!botToken) {
    return new Set();
  }

  try {
    const response = await fetch("https://discord.com/api/users/@me/guilds", {
      headers: {
        Authorization: `Bot ${botToken}`,
      },
    });

    if (!response.ok) {
      return botGuildsCache || new Set();
    }

    const guilds = await response.json();
    botGuildsCache = new Set(guilds.map((g: any) => g.id));
    botGuildsCacheTime = now;
    return botGuildsCache;
  } catch (error) {
    return botGuildsCache || new Set();
  }
}

export function getInviteUrl(host: string, guildId?: string): string {
  const permissions = "8";
  const scopes = "bot%20applications.commands";
  const redirectUri = encodeURIComponent(`https://${host}/api/bot/callback`);

  let url = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&permissions=${permissions}&scope=${scopes}&redirect_uri=${redirectUri}`;

  if (guildId) {
    url += `&guild_id=${guildId}&disable_guild_select=true`;
  }

  return url;
}

export function isSecureContext(host: string): boolean {
  return !host.includes('localhost') && !host.startsWith('127.0.0.1');
}

export function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(';').map(cookie => {
      const [key, ...rest] = cookie.trim().split('=');
      return [key, rest.join('=')];
    })
  );
}

export function createSessionCookie(sessionId: string, secure: boolean = true): string {
  const maxAge = 7 * 24 * 60 * 60;
  const secureFlag = secure ? '; Secure' : '';
  return `session=${sessionId}; HttpOnly${secureFlag}; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

export function createOAuthStateCookie(state: string, secure: boolean = true): string {
  const secureFlag = secure ? '; Secure' : '';
  return `oauth_state=${state}; HttpOnly${secureFlag}; SameSite=Lax; Path=/; Max-Age=600`;
}

export function clearSessionCookie(secure: boolean = true): string {
  const secureFlag = secure ? '; Secure' : '';
  return `session=; HttpOnly${secureFlag}; SameSite=Lax; Path=/; Max-Age=0`;
}

export function clearOAuthStateCookie(secure: boolean = true): string {
  const secureFlag = secure ? '; Secure' : '';
  return `oauth_state=; HttpOnly${secureFlag}; SameSite=Lax; Path=/; Max-Age=0`;
}
