import type { VercelRequest, VercelResponse } from '@vercel/node';
import { deleteSession, clearSessionCookie, parseCookies, isSecureContext } from '../../lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const cookies = parseCookies(req.headers.cookie || '');
    const sessionId = cookies['session'];
    const host = req.headers.host || '';
    const secure = isSecureContext(host);
    
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
