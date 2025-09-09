# 🚀 FloWorx Coolify Deployment Guide

This guide provides step-by-step instructions for deploying the FloWorx SaaS application to Coolify.

## 📋 Prerequisites

- Coolify instance running (self-hosted or cloud)
- Git repository accessible to Coolify
- Supabase project configured
- Google OAuth credentials
- SMTP email service configured

## 🔧 Coolify Setup

### 1. Create New Project

1. Log into your Coolify dashboard
2. Click "Create Project"
3. Choose "Import from Git"
4. Enter your repository URL
5. Select the main branch

### 2. Configure Services

#### Database (PostgreSQL)
1. In your Coolify project, click "Add Service"
2. Select "Database" → "PostgreSQL"
3. Configure:
   - **Name**: `floworx-db`
   - **Version**: Latest stable (15+)
   - **Database Name**: `floworx_prod`
   - **Username**: `floworx_user`
   - Generate a secure password

#### Cache (KeyDB/Redis)
1. Click "Add Service"
2. Select "Database" → "KeyDB" (or Redis)
3. Configure:
   - **Name**: `floworx-cache`
   - **Version**: Latest stable
   - Set a password for security

### 3. Deploy Application

1. In your Coolify project, click "Add Service"
2. Select "Application"
3. Configure:
   - **Name**: `floworx-app`
   - **Build Pack**: `docker-compose`
   - **Source**: Select your git repository
   - **Docker Compose File**: `docker-compose.coolify.yml`
   - **Port**: `80`

## 🌍 Environment Variables Configuration

### Core Application Settings
```bash
NODE_ENV=production
PORT=5000
BUILD_ENV=production
DEPLOYMENT_PLATFORM=coolify
```

### Database Configuration
Get these values from your Coolify PostgreSQL service:
```bash
DATABASE_URL=postgresql://floworx_user:your_password@floworx-db:5432/floworx_prod
```

### Redis/KeyDB Configuration
Get these values from your Coolify KeyDB service:
```bash
REDIS_HOST=floworx-cache
REDIS_PORT=6379
REDIS_PASSWORD=your_keydb_password
REDIS_URL=redis://floworx-cache:6379
```

### Supabase Configuration
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Security Configuration
Generate secure random strings (32+ characters):
```bash
JWT_SECRET=your_super_long_random_jwt_secret_key_here
ENCRYPTION_KEY=your_32_character_encryption_key_here
```

### Google OAuth Configuration
```bash
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your_google_client_secret
GOOGLE_REDIRECT_URI=https://your-coolify-domain.com/api/oauth/google/callback
```

### Email Configuration
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=FloWorx Team
```

### Application URLs
Replace with your actual Coolify domain:
```bash
FRONTEND_URL=https://your-coolify-domain.com
CORS_ORIGIN=https://your-coolify-domain.com
```

### Performance Configuration
```bash
MAX_REQUEST_SIZE=10mb
COMPRESSION_LEVEL=6
CACHE_TTL=300
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
```

### Optional: N8N Integration
```bash
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/your-webhook-id
N8N_API_KEY=your_n8n_api_key
N8N_BASE_URL=https://your-n8n-instance.com
```

## 🚀 Deployment Steps

### 1. Initial Deployment

1. Push the `docker-compose.coolify.yml` file to your repository
2. In Coolify, go to your application service
3. Click "Deploy" to start the initial build

### 2. Environment Variables Setup

1. In your Coolify application service, go to "Environment Variables"
2. Add all the environment variables listed above
3. Click "Save" and redeploy

### 3. Database Migration

After the first successful deployment:

1. Access your application container logs in Coolify
2. Run database migrations if needed:
   ```bash
   docker exec -it floworx-app npm run migrate
   ```

### 4. Health Check Configuration

Coolify will automatically use the health check defined in the Docker Compose file:
- **Health Check URL**: `/api/health`
- **Interval**: 30 seconds
- **Timeout**: 10 seconds
- **Retries**: 3

## 🔍 Post-Deployment Verification

### 1. Application Health
```bash
curl https://your-coolify-domain.com/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0"
}
```

### 2. Database Connection Test
```bash
curl https://your-coolify-domain.com/api/test-db
```

### 3. Redis Connection Test
```bash
curl https://your-coolify-domain.com/api/test-redis
```

### 4. Frontend Access
Visit `https://your-coolify-domain.com` in your browser

## 🐛 Troubleshooting

### Common Issues

#### Application Won't Start
- Check environment variables are properly set
- Verify database and Redis services are running
- Check application logs in Coolify

#### Database Connection Failed
- Ensure PostgreSQL service is healthy
- Verify `DATABASE_URL` format
- Check database credentials

#### Redis Connection Failed
- Ensure KeyDB/Redis service is running
- Verify `REDIS_HOST` and `REDIS_PASSWORD`
- Check service networking

#### Build Failures
- Ensure all dependencies are in `package.json`
- Check Dockerfile syntax
- Verify build context

### Logs and Debugging

#### View Application Logs
```bash
# In Coolify dashboard
1. Go to your application service
2. Click "Logs" tab
3. Select time range and log level
```

#### View Database Logs
```bash
# In Coolify dashboard
1. Go to PostgreSQL service
2. Click "Logs" tab
```

#### Debug Container
```bash
# Access container shell
docker exec -it floworx-app /bin/sh

# Run connection tests
node scripts/test-keydb-connection.js
```

## 🔄 Updates and Maintenance

### Application Updates
1. Push changes to your git repository
2. Coolify will automatically detect changes
3. Click "Deploy" to update

### Database Backups
- Coolify automatically backs up PostgreSQL databases
- Configure backup schedules in service settings

### Scaling
- Adjust resource limits in `docker-compose.coolify.yml`
- Coolify supports horizontal scaling for applications

## 📊 Monitoring

### Built-in Monitoring
- Application health checks
- Resource usage monitoring
- Automatic restarts on failure

### External Monitoring
Consider integrating with:
- Uptime monitoring services
- Log aggregation (ELK stack)
- Performance monitoring (New Relic, DataDog)

## 🔒 Security Considerations

### Environment Variables
- Never commit secrets to git
- Use Coolify's secret management
- Rotate credentials regularly

### Network Security
- Configure proper firewall rules
- Use HTTPS only
- Implement rate limiting

### Database Security
- Use strong passwords
- Enable SSL connections
- Regular security updates

## 📞 Support

If you encounter issues:
1. Check Coolify documentation
2. Review application logs
3. Test individual components
4. Contact Coolify support if needed

## 🎯 Success Checklist

- [ ] Coolify project created
- [ ] PostgreSQL database configured
- [ ] KeyDB/Redis cache configured
- [ ] Application service deployed
- [ ] Environment variables set
- [ ] Health checks passing
- [ ] Frontend accessible
- [ ] Database connections working
- [ ] OAuth configured
- [ ] Email service working

---

**Happy Deploying! 🚀**

For more information, visit the [Coolify Documentation](https://coolify.io/docs).
