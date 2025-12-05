import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSessionOdId, parseCookies } from '../../../lib/auth';
import { connectToDatabase, ApplicationSubmission, ApplicationConfig } from '../../../lib/mongodb';
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
      
      return res.json({
        applications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    }
    
    if (req.method === 'PATCH') {
      const body = await parseJsonBody<{ applicationId?: string; status?: string; reason?: string }>(req);
      const { applicationId, status, reason } = body;
      
      if (!applicationId) {
        return res.status(400).json({ error: 'Application ID required' });
      }
      
      if (!status || !['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Valid status (approved/rejected) required' });
      }
      
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
      
      return res.json({ success: true, application });
    }
    
    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Applications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
