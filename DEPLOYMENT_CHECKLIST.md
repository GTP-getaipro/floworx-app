# FloWorx Coolify Deployment Checklist

## ✅ Pre-Deployment (Complete)
- [x] Dockerfile created
- [x] Docker Compose configuration
- [x] Environment variables configured
- [x] Production URLs set
- [x] Localhost references handled

## 🚀 Coolify Deployment Steps

### 1. Push to Git Repository
```bash
git add .
git commit -m "Configure for Coolify deployment"
git push origin main
```

### 2. Coolify Dashboard Setup
1. **Create New Application**
   - Name: floworx-app
   - Repository: your-git-repo-url
   - Branch: main

2. **Configure Domain**
   - Domain: app.floworx-iq.com
   - Enable HTTPS/SSL

3. **Set Environment Variables**
   Copy all variables from .env.production:
   - NODE_ENV=production
   - FRONTEND_URL=https://app.floworx-iq.com
   - SUPABASE_URL=your_supabase_url
   - SUPABASE_ANON_KEY=your_key
   - GOOGLE_CLIENT_ID=your_client_id
   - GOOGLE_CLIENT_SECRET=your_secret
   - GOOGLE_REDIRECT_URI=https://app.floworx-iq.com/api/oauth/google/callback
   - SMTP_PASS=your_sendgrid_api_key
   - FROM_EMAIL=noreply@app.floworx-iq.com
   - (Add all other variables from .env.production)

4. **Deploy**
   - Click Deploy button
   - Monitor build logs
   - Verify deployment success

### 3. Post-Deployment Configuration

#### Update Google OAuth
1. Go to Google Cloud Console
2. OAuth 2.0 Client IDs
3. Add redirect URI: https://app.floworx-iq.com/api/oauth/google/callback

#### Update SendGrid
1. Domain Authentication
2. Verify app.floworx-iq.com domain
3. Add DNS records as instructed

#### Test Deployment
1. Visit: https://app.floworx-iq.com
2. Test registration flow
3. Test email verification
4. Test Google OAuth login
5. Test API endpoints

## 🧪 Testing Commands

### Local Docker Test
```bash
# Build and test locally
docker build -t floworx-app .
docker run -p 5001:5001 --env-file .env.production floworx-app

# Test endpoints
curl https://app.floworx-iq.com/api/health
curl https://app.floworx-iq.com/api/oauth/google
```

### Production API Test
```bash
# Test with production environment
API_BASE_URL=https://app.floworx-iq.com/api node test-email-auth-flow.js
```

## 🔧 Troubleshooting

### Common Issues:
1. **Build fails**: Check Dockerfile and dependencies
2. **Environment variables**: Ensure all vars are set in Coolify
3. **Domain not working**: Check DNS and SSL configuration
4. **OAuth fails**: Verify redirect URIs in Google Console
5. **Emails not sending**: Check SendGrid domain verification

### Debug Commands:
```bash
# Check container logs
docker logs floworx-app

# Test specific endpoints
curl -I https://app.floworx-iq.com/api/health
curl -I https://app.floworx-iq.com/api/oauth/google
```