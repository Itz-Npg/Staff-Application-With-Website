import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSessionOdId, parseCookies } from '../../../lib/auth';
import { connectToDatabase, GuildPremium, PremiumCode, FREE_TIER_LIMIT, PREMIUM_TIER_LIMIT } from '../../../lib/mongodb';
import { parseJsonBody } from '../../../lib/utils-api';

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
    
    const { id: guildId } = req.query;
    
    if (!guildId || typeof guildId !== 'string') {
      return res.status(400).json({ error: 'Guild ID required' });
    }
    
    await connectToDatabase();
    
    if (req.method === 'GET') {
      let premium = await GuildPremium.findOne({ guildId }).lean();
      
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
      
      return res.json({
        guildId,
        isPremium: isPremiumActive,
        premiumSince: premium.premiumSince,
        premiumExpiry: premium.premiumExpiry,
        applicationLimit: isPremiumActive ? PREMIUM_TIER_LIMIT : FREE_TIER_LIMIT,
        applicationsUsed: premium.applicationsUsed || 0,
        tier: isPremiumActive ? 'premium' : 'free',
      });
    }
    
    if (req.method === 'POST') {
      const body = await parseJsonBody<{ code?: string }>(req);
      const { code } = body;
      
      if (!code) {
        return res.status(400).json({ success: false, message: 'Code is required' });
      }
      
      const premiumCode = await PremiumCode.findOne({ 
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
      
      let guildPremium = await GuildPremium.findOne({ guildId });
      
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
      
      return res.json({
        success: true,
        message: 'Premium activated successfully!',
        premium: {
          isPremium: true,
          premiumExpiry: newExpiry.toISOString(),
          applicationLimit: PREMIUM_TIER_LIMIT,
          applicationsUsed: guildPremium.applicationsUsed,
        },
      });
    }
    
    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Premium error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
