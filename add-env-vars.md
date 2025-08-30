# Environment Variables for Vercel

Please add these environment variables to your Vercel project:

## Go to: https://vercel.com/dashboard
1. Select your FloWorx project
2. Go to Settings → Environment Variables
3. Add each of these variables:

## Required Environment Variables:

### JWT & Encryption
```
JWT_SECRET = a967c6e0599f353537f76d2f1e49ebd407589db3a30f441611191656b6bdf9870273c4739caa10e5af420196aa037b57a6fb170af37b008b3ad4f42eb8e634f3

ENCRYPTION_KEY = Imfoq4i6ReG/OMYPFlKpaF3oz8hgeGkc
```

### Database (Supabase) - Updated credentials
```
DB_HOST = db.enamhufwobytrfydarsz.supabase.co
DB_PORT = 5432
DB_NAME = postgres
DB_USER = postgres
DB_PASSWORD = -U9xNc*qP&zyRc4
```

### Application URLs
```
FRONTEND_URL = https://floworx-k093uji1-floworxdevelopers-projects.vercel.app
NODE_ENV = production
```

### Google OAuth (Optional - for later)
```
GOOGLE_CLIENT_ID = your_google_client_id
GOOGLE_CLIENT_SECRET = your_google_client_secret
GOOGLE_REDIRECT_URI = https://floworx-k093uji1-floworxdevelopers-projects.vercel.app/api/oauth/google/callback
```

## After adding environment variables:
1. Go to the Deployments tab
2. Click "Redeploy" on the latest deployment
3. The API endpoints will be available at:
   - https://your-app.vercel.app/api/auth/login
   - https://your-app.vercel.app/api/auth/register
   - https://your-app.vercel.app/api/auth/verify
   - https://your-app.vercel.app/api/user/status
