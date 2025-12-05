import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSessionUser } from '../../../lib/auth';

interface ServerSettings {
  guildId: string;
  prefix: string;
  language: string;
}

const settingsStore: Record<string, ServerSettings> = {};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const session = await getSessionUser(req, res);
    if (!session?.user?.accessToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const guildId = req.query.id as string;

    if (req.method === 'GET') {
      const guildSettings = settingsStore[guildId] || {
        guildId,
        prefix: "!",
        language: "English",
      };
      return res.json(guildSettings);
    }

    if (req.method === 'PATCH') {
      const { prefix, language } = req.body;

      settingsStore[guildId] = {
        guildId,
        prefix: prefix || settingsStore[guildId]?.prefix || "!",
        language: language || settingsStore[guildId]?.language || "English",
      };

      return res.json(settingsStore[guildId]);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error with settings:', error);
    res.status(500).json({ error: 'Failed to process settings' });
  }
}
