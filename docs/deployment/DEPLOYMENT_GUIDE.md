# FloWorx Deployment Guide

## Backend Deployment to Vercel

### Prerequisites
- Vercel account (free) - sign up at https://vercel.com
- Vercel CLI installed globally: `npm install -g vercel`
- Supabase database credentials (already configured)

### Step 1: Login to Vercel
```bash
vercel login
```
Follow the prompts to authenticate with your Vercel account.

### Step 2: Deploy Backend
```bash
cd backend
vercel --prod
```

During deployment, Vercel will ask:
1. **Set up and deploy?** → Yes
2. **Which scope?** → Select your account/team
3. **Link to existing project?** → No (for first deployment)
4. **Project name?** → `floworx-backend` (or your preferred name)
5. **Directory?** → `.` (current directory)

### Step 3: Configure Environment Variables
After deployment, add these environment variables in Vercel dashboard:

**Required Environment Variables:**
```
DB_HOST=aws-1-ca-central-1.pooler.supabase.com
DB_PORT=6543
DB_NAME=postgres
DB_USER=postgres.enamhufwobytrfydarsz
DB_PASSWORD=-U9xNc*qP&zyRc4
JWT_SECRET=a967c6e0599f353537f76d2f1e49ebd407589db3a30f441611191656b6bdf9870273c4739caa10e5af420196aa037b57a6fb170af37b008b3ad4f42eb8e634f3
ENCRYPTION_KEY=Imfoq4i6ReG/OMYPFlKpaF3oz8hgeGkc
NODE_ENV=production
VERCEL=1
FRONTEND_URL=https://app.floworx-iq.com
```

**Optional (for OAuth):**
```
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://your-backend-url.vercel.app/api/oauth/google/callback
N8N_WEBHOOK_URL=your_n8n_webhook_url_here
```

### Step 4: Redeploy After Environment Variables
```bash
vercel --prod
```

### Step 5: Test Deployment
Your backend will be available at: `https://your-project-name.vercel.app`

Test endpoints:
- Health check: `GET https://your-project-name.vercel.app/health`
- Register: `POST https://your-project-name.vercel.app/api/auth/register`
- Login: `POST https://your-project-name.vercel.app/api/auth/login`

### Step 6: Update Frontend Configuration
Update your frontend to use the new backend URL:
```javascript
const API_BASE_URL = 'https://your-project-name.vercel.app';
```

## Production Checklist
- [ ] Database connection working
- [ ] Google OAuth configured
- [ ] Environment variables set
- [ ] Custom domain configured
- [ ] SSL certificate active
- [ ] Error monitoring setup
