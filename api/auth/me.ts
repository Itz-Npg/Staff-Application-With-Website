import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSessionOdId, parseCookies } from '../../lib/auth';
import { connectToDatabase, User } from '../../lib/mongodb';

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
    
    await connectToDatabase();
    const user = await User.findOne({ odId }).lean();
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    res.json({
      id: user.odId,
      username: user.username,
      discriminator: user.discriminator,
      avatar: user.avatar,
      globalName: user.globalName,
    });
  } catch (error) {
    console.error('Auth me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
