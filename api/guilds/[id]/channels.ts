import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSessionUser } from '../../../lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getSessionUser(req, res);
    if (!session?.user?.accessToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const guildId = req.query.id as string;

    const botToken = process.env.DISCORD_BOT_TOKEN;
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
}
