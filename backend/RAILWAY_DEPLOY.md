# Railway Deployment for SalesGPT Backend

## Quick Deploy (2 minutes)

### Step 1: Go to Railway
1. Visit [railway.app/new](https://railway.app/new)
2. Sign up/Login with GitHub

### Step 2: Create New Project
1. Click **"Deploy from GitHub repo"**
2. Select the `Braham27/salesgpt` repository
3. **Important**: Set the root directory to `backend`

### Step 3: Add Environment Variables
In Railway dashboard, go to your service → **Variables** tab and add:

```
DATABASE_URL=postgresql+asyncpg://neondb_owner:...your-neon-connection-string...
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-here
OPENAI_API_KEY=sk-...your-openai-key...
DEEPGRAM_API_KEY=...your-deepgram-key...
```

### Step 4: Generate Domain
1. Go to **Settings** → **Networking**
2. Click **"Generate Domain"**
3. Copy the URL (e.g., `salesgpt-backend-production.up.railway.app`)

### Step 5: Update Frontend Environment
Update your Vercel environment variables:
- `NEXT_PUBLIC_API_URL` = `https://your-railway-url.up.railway.app`
- `NEXT_PUBLIC_WS_URL` = `wss://your-railway-url.up.railway.app`

## Why Railway over Render?

| Feature | Render Free | Railway Trial/Hobby |
|---------|-------------|---------------------|
| Cold start | 30-60 seconds | **No cold start** |
| Spin down | After 15 min idle | **Never spins down** |
| WebSockets | Limited | **Full support** |
| Free credits | Limited hours | **$5/month credit** |

## Pricing
- **Trial**: 30 days free with $5 credit
- **Hobby**: $5/month (includes $5 credit - so effectively free if under that)
- Pay only for actual usage (by the second)

## Troubleshooting

### Build fails
- Check that `requirements.txt` is in the `backend` folder
- Ensure Python version is compatible (3.9+)

### WebSocket issues
- Railway fully supports WebSockets on all plans
- No special configuration needed

### Database connection
- Use the Neon connection string with `postgresql+asyncpg://` prefix
- Ensure SSL is enabled: `?sslmode=require`
