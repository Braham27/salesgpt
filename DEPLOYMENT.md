# Deployment Guide for SalesGPT

## Architecture (Cheapest Option)
- **Frontend**: Vercel (FREE)
- **Backend**: Render.com (FREE tier)
- **Database**: Neon PostgreSQL (FREE tier)

**Total Cost: $0/month** (within free tier limits)

---

## Step 1: Set Up Neon Database

1. Go to [console.neon.tech](https://console.neon.tech)
2. Create a new project named `salesgpt`
3. Copy the connection string (looks like):
   ```
   postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
   ```
4. Run the schema from `backend/schema.sql` in Neon's SQL Editor

---

## Step 2: Deploy Backend to Render

1. Go to [render.com](https://render.com) and sign up (free)
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `salesgpt-api`
   - **Root Directory**: `backend`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

5. Add Environment Variables:
   ```
   DATABASE_URL=postgresql+asyncpg://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
   SECRET_KEY=your-secret-key-here
   JWT_SECRET_KEY=your-jwt-secret
   JWT_ALGORITHM=HS256
   JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
   JWT_REFRESH_TOKEN_EXPIRE_DAYS=7
   OPENAI_API_KEY=your-openai-key
   DEEPGRAM_API_KEY=your-deepgram-key
   APP_ENV=production
   DEBUG=false
   ```

6. Click "Create Web Service"
7. Note your backend URL: `https://salesgpt-api.onrender.com`

---

## Step 3: Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`

5. Add Environment Variables:
   ```
   NEXT_PUBLIC_API_URL=https://salesgpt-api.onrender.com
   NEXT_PUBLIC_WS_URL=wss://salesgpt-api.onrender.com
   ```

6. Click "Deploy"
7. Your app is live at: `https://salesgpt.vercel.app`

---

## Free Tier Limits

### Neon (Free)
- 0.5 GB storage
- 1 project
- Unlimited databases

### Render (Free)
- 750 hours/month
- Sleeps after 15 min inactivity
- Auto-wakes on request (30s delay)

### Vercel (Free)
- 100 GB bandwidth/month
- Unlimited deployments
- Serverless functions

---

## Optional: Use Vercel for Backend Too

To keep everything on Vercel, you can convert the FastAPI backend to Vercel Serverless Functions. This is more complex but keeps everything in one place.

See `vercel.json` in the backend folder for this setup.

---

## Post-Deployment Checklist

- [ ] Database schema created in Neon
- [ ] Backend deployed to Render
- [ ] Frontend deployed to Vercel
- [ ] Environment variables set correctly
- [ ] Test registration/login
- [ ] Test creating a call
- [ ] Configure custom domain (optional)
