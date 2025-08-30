# FloWorx Deployment Guide

## Deploy to Vercel

### Prerequisites
- GitHub account
- Vercel account (free)
- Supabase database credentials

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Initial FloWorx application"
git branch -M main
git remote add origin https://github.com/yourusername/floworx-app.git
git push -u origin main
```

### Step 2: Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click "New Project"
4. Import your FloWorx repository
5. Configure environment variables:

### Step 3: Environment Variables
Add these in Vercel dashboard:

```
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-here
DB_HOST=db.dzjeykouycxmamtsvsbj.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-supabase-password
FRONTEND_URL=https://your-app.vercel.app
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://your-app.vercel.app/api/auth/google/callback
```

### Step 4: Deploy
- Vercel will automatically build and deploy
- Your app will be available at: `https://your-app.vercel.app`

### Step 5: Custom Domain (Optional)
1. In Vercel dashboard, go to your project
2. Settings → Domains
3. Add `app.floworx-iq.com`
4. Configure DNS in your domain provider

## Production Checklist
- [ ] Database connection working
- [ ] Google OAuth configured
- [ ] Environment variables set
- [ ] Custom domain configured
- [ ] SSL certificate active
- [ ] Error monitoring setup
