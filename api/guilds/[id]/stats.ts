import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSessionUser } from '../../../lib/auth';
import { connectToDatabase, ApplicationConfig, Application } from '../../../lib/mongodb';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getSessionUser(req, res);
    if (!session?.user?.accessToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    await connectToDatabase();
    const guildId = req.query.id as string;

    const config = await ApplicationConfig.findOne({ guildId }).lean();

    const [totalApplications, approved, rejected, pending] = await Promise.all([
      Application.countDocuments({ guildId }),
      Application.countDocuments({ guildId, status: 'approved' }),
      Application.countDocuments({ guildId, status: 'rejected' }),
      Application.countDocuments({ guildId, status: 'pending' }),
    ]);

    res.json({
      totalApplications,
      approved,
      rejected,
      pending,
      enabled: config?.enabled ?? false,
      questionsCount: config?.questions?.length ?? 0,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
}
