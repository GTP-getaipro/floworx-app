# FloWorx SaaS Integration Guide

## 🎯 Integration with floworx-iq.com

This guide explains how to integrate the new SaaS application with your existing FloWorx website at https://www.floworx-iq.com.

## 🏗️ Architecture Overview

```
Current Setup:
├── www.floworx-iq.com (Squarespace - Marketing site)
└── Contact form leads to floworx.ai@gmail.com

New Integrated Setup:
├── www.floworx-iq.com (Squarespace - Marketing/Landing)
├── app.floworx-iq.com (SaaS Application - User Dashboard)
└── api.floworx-iq.com (Backend API - Optional subdomain)
```

## 🚀 Deployment Options

### Option 1: Subdomain Deployment (Recommended)

#### Benefits:
- Clean separation of marketing vs. application
- Easy to manage and scale
- Professional appearance
- SEO-friendly

#### Setup:
1. **Frontend**: Deploy to `app.floworx-iq.com`
2. **Backend**: Deploy to same server or `api.floworx-iq.com`
3. **Database**: PostgreSQL on cloud provider

### Option 2: Single Domain with Path

#### Setup:
1. **Marketing**: `floworx-iq.com/` (existing Squarespace)
2. **Application**: `floworx-iq.com/app/` (new SaaS app)
3. **API**: `floworx-iq.com/api/` (backend)

## 📋 Integration Steps

### Step 1: Domain Configuration

1. **Add DNS Records** (in your domain registrar):
   ```
   Type: CNAME
   Name: app
   Value: your-server-ip-or-domain
   
   Type: CNAME  
   Name: api (optional)
   Value: your-server-ip-or-domain
   ```

2. **SSL Certificates**: Ensure HTTPS for both subdomains

### Step 2: Update Squarespace Site

Add a "Login" or "Dashboard" button to your existing site:

```html
<!-- Add to your Squarespace site -->
<a href="https://app.floworx-iq.com" class="dashboard-button">
  Access Dashboard
</a>
```

### Step 3: Environment Configuration

Update your production environment variables:

```env
# Production Backend (.env)
NODE_ENV=production
FRONTEND_URL=https://app.floworx-iq.com
GOOGLE_REDIRECT_URI=https://app.floworx-iq.com/api/oauth/google/callback

# Database (use cloud provider)
DB_HOST=your-postgres-host
DB_USER=your-db-user
DB_PASSWORD=your-secure-password
DB_NAME=floworx_production

# Google OAuth (get from Google Cloud Console)
GOOGLE_CLIENT_ID=your-production-client-id
GOOGLE_CLIENT_SECRET=your-production-client-secret
```

### Step 4: Google OAuth Setup

1. **Google Cloud Console**: https://console.cloud.google.com/
2. **Add Production Redirect URI**:
   - `https://app.floworx-iq.com/api/oauth/google/callback`
3. **Update Authorized Domains**:
   - `floworx-iq.com`

## 🌐 Hosting Recommendations

### Option A: Vercel + Railway (Easy)
- **Frontend**: Deploy to Vercel (automatic from GitHub)
- **Backend**: Deploy to Railway (PostgreSQL included)
- **Cost**: ~$20-50/month

### Option B: DigitalOcean Droplet (Cost-effective)
- **Server**: $12/month droplet
- **Database**: Managed PostgreSQL $15/month
- **Total**: ~$27/month

### Option C: AWS/Google Cloud (Scalable)
- **Frontend**: CloudFront + S3
- **Backend**: EC2/Compute Engine
- **Database**: RDS/Cloud SQL

## 🔄 User Flow Integration

### Current Flow:
1. User visits `floworx-iq.com`
2. Fills contact form
3. You manually follow up

### New Integrated Flow:
1. User visits `floworx-iq.com` (marketing)
2. Clicks "Get Started" → redirects to `app.floworx-iq.com`
3. User registers/logs in
4. Connects Google account
5. Automated email processing begins

## 📧 Email Integration Strategy

### Phase 1: Basic OAuth Connection
- Users connect their Gmail accounts
- System stores encrypted tokens
- Ready for email processing

### Phase 2: AI Email Processing
- Integrate with your existing email AI
- Process emails based on hot tub business rules
- Auto-categorize: Service calls, Sales, Parts, Warranty

### Phase 3: Advanced Automation
- Connect with CRM systems (Jobber, Housecall Pro)
- Automated responses based on email type
- Smart routing to appropriate team members

## 🔧 Technical Implementation

### Frontend Deployment (Vercel)
```bash
# Build and deploy
npm run build
vercel --prod
```

### Backend Deployment (Railway)
```bash
# Connect to Railway
railway login
railway init
railway add postgresql
railway deploy
```

### Database Migration
```bash
# Run on production database
psql -h your-host -U your-user -d floworx_production -f backend/database/schema.sql
```

## 🔒 Security Checklist

- [ ] HTTPS enabled on all domains
- [ ] Environment variables secured
- [ ] Database access restricted
- [ ] Google OAuth configured for production
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Regular security updates

## 📊 Analytics & Monitoring

### Recommended Tools:
- **Google Analytics**: Track user engagement
- **Sentry**: Error monitoring
- **Uptime Robot**: Service monitoring
- **LogRocket**: User session recording

## 🎨 Branding Consistency

The SaaS app now matches your existing branding:
- **Name**: FloWorx (consistent with your site)
- **Tagline**: "Email AI Built by Hot Tub Pros—For Hot Tub Pros"
- **Focus**: Hot tub/spa business email automation
- **Colors**: Can be customized to match your brand

## 📞 Support Integration

Update contact information to match your existing:
- **Email**: floworx.ai@gmail.com
- **Phone**: (403) 550-7680
- **Support**: Integrate with your existing support process

## 🚀 Go-Live Checklist

- [ ] Domain DNS configured
- [ ] SSL certificates installed
- [ ] Production database created
- [ ] Environment variables set
- [ ] Google OAuth configured
- [ ] Application deployed and tested
- [ ] Monitoring tools configured
- [ ] Backup strategy implemented
- [ ] User documentation created
- [ ] Support process defined

## 📈 Next Steps

1. **Deploy to staging environment** for testing
2. **Set up Google OAuth** with production credentials
3. **Configure PostgreSQL** database
4. **Test full user flow** from registration to Google connection
5. **Update marketing site** with links to new app
6. **Launch and monitor** user adoption

This integration will transform your current lead generation site into a full SaaS platform while maintaining your existing marketing presence.
