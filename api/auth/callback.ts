import type { VercelRequest, VercelResponse } from '@vercel/node';
import { 
  exchangeCodeForTokens, 
  getDiscordUserFromToken, 
  createSession,
  createSessionCookie,
  clearOAuthStateCookie,
  parseCookies,
  isSecureContext
} from '../../lib/auth';
import { connectToDatabase, User } from '../../lib/mongodb';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { code, state } = req.query;
    const cookies = parseCookies(req.headers.cookie || '');
    const savedState = cookies['oauth_state'];
    const host = req.headers.host || '';
    const secure = isSecureContext(host);
    
    if (!code || typeof code !== 'string') {
      return res.redirect('/?error=no_code');
    }
    
    if (state !== savedState) {
      return res.redirect('/?error=invalid_state');
    }
    
    const tokens = await exchangeCodeForTokens(code, host);
    const discordUser = await getDiscordUserFromToken(tokens.access_token);
    
    await connectToDatabase();
    
    const odId = discordUser.id;
    const avatarUrl = discordUser.avatar 
      ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
      : `https://cdn.discordapp.com/embed/avatars/${parseInt(discordUser.discriminator || '0') % 5}.png`;
    
    await User.findOneAndUpdate(
      { odId },
      {
        odId,
        discordId: discordUser.id,
        username: discordUser.username,
        discriminator: discordUser.discriminator || '0',
        avatar: avatarUrl,
        globalName: discordUser.global_name || null,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      },
      { upsert: true, new: true }
    );
    
    const sessionId = await createSession(odId);
    
    res.setHeader('Set-Cookie', [
      createSessionCookie(sessionId, secure),
      clearOAuthStateCookie(secure)
    ]);
    
    res.redirect('/servers');
  } catch (error) {
    console.error('Auth callback error:', error);
    res.redirect('/?error=auth_failed');
  }
}
