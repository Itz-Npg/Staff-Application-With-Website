import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDiscordOAuthUrl, createOAuthStateCookie, isSecureContext } from '../../lib/auth';
import crypto from 'crypto';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const state = crypto.randomBytes(16).toString('hex');
  const host = req.headers.host || '';
  const secure = isSecureContext(host);
  
  const oauthUrl = getDiscordOAuthUrl(state, host);
  
  res.setHeader('Set-Cookie', createOAuthStateCookie(state, secure));
  res.redirect(302, oauthUrl);
}
