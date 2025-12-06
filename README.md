# StaffBot Dashboard

This folder contains the web dashboard for StaffBot, with support for both Vercel and Render deployment.

## Prerequisites

- Vercel or Render account
- MongoDB database (shared with bot)
- Discord OAuth2 credentials

## Setup

### 1. Discord Developer Portal Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your bot application
3. Go to "OAuth2" section
4. Add redirect URL: `https://your-domain.com/api/auth/callback`
5. Copy the Client ID and Client Secret

---

## Deployment Options

### Option 1: Render Deployment (Recommended)

**Deploy from GitHub (Blueprint)**
1. Push this folder to a GitHub repository
2. Go to [Render Dashboard](https://dashboard.render.com)
3. Click "New" > "Blueprint"
4. Connect your repository and select the `dashboard-vercel` folder
5. Render will detect `render.yaml` and configure automatically
6. Add environment variables in Render dashboard

**Deploy Manually**
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New" > "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Root Directory**: `dashboard-vercel`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
   - **Environment**: `Node`
5. Add environment variables (see below)

**Environment Variables for Render:**

| Variable | Description |
|----------|-------------|
| `CLIENT_ID` | Discord Application/Client ID |
| `DISCORD_CLIENT_SECRET` | Discord OAuth2 Client Secret |
| `DISCORD_TOKEN` | Discord Bot Token |
| `DISCORD_BOT_TOKEN` | Discord Bot Token (same as above) |
| `MONGODB_URI` | MongoDB Connection String |
| `NODE_ENV` | Set to `production` |

---

### Option 2: Vercel Deployment

**Deploy from GitHub**
1. Push this folder to a GitHub repository
2. Import the project in Vercel
3. Configure environment variables in Vercel dashboard

**Deploy with Vercel CLI**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

**Environment Variables for Vercel:**

| Variable | Description |
|----------|-------------|
| `CLIENT_ID` | Discord Application/Client ID |
| `DISCORD_CLIENT_SECRET` | Discord OAuth2 Client Secret |
| `DISCORD_TOKEN` | Discord Bot Token |
| `MONGODB_URI` | MongoDB Connection String |
| `SESSION_SECRET` | Random string for session encryption |
| `NODE_ENV` | Set to `production` |

---

## Update Discord OAuth2 Redirect

After deployment, update Discord Developer Portal with your actual URL:
- For Render: `https://your-app-name.onrender.com/api/auth/callback`
- For Vercel: `https://your-app-name.vercel.app/api/auth/callback`

## Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   Create a `.env` file with your values:
   ```env
   CLIENT_ID=your_client_id
   DISCORD_CLIENT_SECRET=your_client_secret
   DISCORD_TOKEN=your_bot_token
   MONGODB_URI=your_mongodb_uri
   ```

3. **Run development server:**
   ```bash
   npm run dev
   ```

   This runs both the Vite frontend (port 5173) and Express backend (port 3001) concurrently.

4. **Run frontend only:**
   ```bash
   npm run dev:frontend
   ```

5. **Run server only:**
   ```bash
   npm run dev:server
   ```

## Project Structure

```
dashboard-vercel/
├── api/                  # Vercel API routes (serverless functions)
├── server/               # Express server for Render deployment
│   └── index.ts          # Main server file
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
├── render.yaml           # Render configuration
├── tailwind.config.ts
├── tsconfig.json
├── vercel.json           # Vercel configuration
└── vite.config.ts        # Vite configuration
```

## Architecture

### Vercel Deployment
- Uses serverless functions in `/api` folder
- Each API endpoint is a separate function
- Auto-scaled by Vercel

### Render Deployment
- Uses Express server in `/server` folder
- All API routes consolidated in one server
- Serves static frontend files
- Single process with built-in routing

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
- Ensure the redirect URL in Discord Developer Portal exactly matches your domain
- Include the full path: `/api/auth/callback`

### Bot Not Showing in Guild List
- Verify `DISCORD_TOKEN` is correct
- Check bot has proper permissions

### Database Connection Issues
- Verify `MONGODB_URI` is correct
- Ensure IP whitelist includes your deployment platform's IPs (or allow all: 0.0.0.0/0)

### Render-specific Issues
- Check the Render logs for startup errors
- Ensure all environment variables are set
- Verify the build completed successfully

## Support

For issues or questions, contact the development team.
