# StaffBot Dashboard - Vercel Deployment

This folder contains the web dashboard for StaffBot, designed to be deployed on Vercel.

## Prerequisites

- Vercel account
- MongoDB database (shared with bot)
- Discord OAuth2 credentials

## Setup

### 1. Discord Developer Portal Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your bot application
3. Go to "OAuth2" section
4. Add redirect URL: `https://your-vercel-domain.vercel.app/api/auth/callback`
5. Copy the Client ID and Client Secret

### 2. Vercel Deployment

**Option A: Deploy from GitHub**
1. Push this folder to a GitHub repository
2. Import the project in Vercel
3. Configure environment variables in Vercel dashboard

**Option B: Deploy with Vercel CLI**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

### 3. Configure Environment Variables

In Vercel dashboard (Settings > Environment Variables), add:

| Variable | Description |
|----------|-------------|
| `CLIENT_ID` | Discord Application/Client ID |
| `DISCORD_CLIENT_SECRET` | Discord OAuth2 Client Secret |
| `DISCORD_TOKEN` | Discord Bot Token |
| `MONGODB_URI` | MongoDB Connection String |
| `SESSION_SECRET` | Random string for session encryption |
| `NODE_ENV` | Set to `production` |

### 4. Update Discord OAuth2 Redirect

After deployment, update Discord Developer Portal with your actual Vercel URL:
- `https://your-app-name.vercel.app/api/auth/callback`

## Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env.local
   ```
   Then edit `.env.local` with your values.

3. **Run development server:**
   ```bash
   npm run dev
   ```

4. **For local API testing**, you'll need to set up a backend server.
   The development proxy is configured in `vite.config.ts` to forward API requests to `http://localhost:3001`.

## Project Structure

```
dashboard-vercel/
├── api/                  # Vercel API routes (serverless functions)
├── lib/                  # Shared utilities for API
├── public/               # Static assets
├── shared/               # Shared TypeScript types
├── src/
│   ├── components/       # React components
│   ├── contexts/         # React contexts
│   ├── lib/              # Frontend utilities
│   └── pages/            # Page components
├── index.html            # Entry HTML
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── vercel.json           # Vercel configuration
└── vite.config.ts        # Vite configuration
```

## Connection with Bot

The dashboard and bot connect through:

1. **Shared MongoDB Database**: Both use the same `MONGODB_URI`
2. **Discord Bot Token**: Dashboard checks which guilds have the bot
3. **Same Client ID**: Used for OAuth and bot invites

Ensure both projects use identical values for:
- `MONGODB_URI`
- `DISCORD_TOKEN`
- `CLIENT_ID`

## Features

- Discord OAuth2 authentication
- View and manage servers with bot
- Review and manage staff applications
- Configure application settings
- Premium subscription management
- Real-time statistics

## Troubleshooting

### OAuth Redirect Mismatch
- Ensure the redirect URL in Discord Developer Portal exactly matches your Vercel domain
- Include the full path: `/api/auth/callback`

### Bot Not Showing in Guild List
- Verify `DISCORD_TOKEN` is correct
- Check bot has proper permissions

### Database Connection Issues
- Verify `MONGODB_URI` is correct
- Ensure IP whitelist includes Vercel's IPs (or allow all: 0.0.0.0/0)

## Support

For issues or questions, contact the development team.
