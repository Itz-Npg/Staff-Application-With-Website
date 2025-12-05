import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { guild_id, error } = req.query;
  
  if (error) {
    return res.redirect(`/servers?error=${encodeURIComponent(error as string)}`);
  }
  
  if (guild_id) {
    return res.redirect(`/dashboard/${guild_id}?bot_added=true`);
  }
  
  res.redirect('/servers?bot_added=true');
}
