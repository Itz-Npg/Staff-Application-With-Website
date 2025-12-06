import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSessionOdId, parseCookies } from '../../../lib/auth';
import { connectToDatabase, ApplicationConfig } from '../../../lib/mongodb';
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
      
      return res.json(config);
    }
    
    if (req.method === 'PUT' || req.method === 'PATCH') {
      const updates = await parseJsonBody(req);
      
      if (!updates || Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No updates provided' });
      }
      
      const config = await ApplicationConfig.findOneAndUpdate(
        { guildId },
        { $set: { ...updates, guildId } },
        { upsert: true, new: true }
      ).lean();
      
      return res.json(config);
    }
    
    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Config error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
