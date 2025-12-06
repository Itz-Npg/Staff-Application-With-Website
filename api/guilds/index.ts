import type { VercelRequest, VercelResponse } from '@vercel/node';
import { 
  getSessionOdId, 
  parseCookies, 
  getValidAccessToken, 
  getDiscordGuildsFromToken,
  getBotGuilds 
} from '../../lib/auth';

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
}
