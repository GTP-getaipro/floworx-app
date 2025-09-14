# 🔧 Environment Configuration Guide - FloworxInvite

## **Complete Environment Setup Documentation**

This guide provides comprehensive documentation for all environment variables required by the FloworxInvite SaaS application.

---

## 📋 **REQUIRED ENVIRONMENT VARIABLES**

### **🔐 Authentication & Security**
```bash
# JWT Secret (minimum 32 characters)
JWT_SECRET=your_super_long_random_jwt_secret_key_here_make_it_at_least_64_characters_long_for_security

# Encryption Key (exactly 32 characters for AES-256)
ENCRYPTION_KEY=your_32_character_encryption_key_

# Token Expiry (optional, defaults to 24h)
JWT_EXPIRY=24h
```

### **🗄️ Database Configuration**
```bash
# Primary Database Connection (RECOMMENDED)
DATABASE_URL=postgresql://username:password@host:port/database

# Alternative: Individual Database Variables
DB_HOST=your-database-host.com
DB_PORT=5432
DB_NAME=postgres
DB_USER=your_database_user
DB_PASSWORD=your_database_password
```

### **🔗 Supabase Configuration**
```bash
# Supabase API Credentials
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your_supabase_anonymous_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### **🔑 Google OAuth Configuration**
```bash
# Google OAuth Credentials
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://your-domain.com/api/oauth/google/callback
```

---

## 📧 **EMAIL CONFIGURATION**

### **📮 SMTP Settings**
```bash
# SMTP Server Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_SECURE=false

# Email From Settings
FROM_EMAIL=noreply@your-domain.com
FROM_NAME=FloworxInvite
```

---

## 🔄 **REDIS CONFIGURATION**

### **💾 Cache Settings**
```bash
# Redis Connection (RECOMMENDED)
REDIS_URL=redis://username:password@host:port

# Alternative: Individual Redis Variables
REDIS_HOST=your-redis-host.com
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# Disable Redis (for environments without Redis)
DISABLE_REDIS=true
```

---

## 🤖 **N8N WORKFLOW CONFIGURATION**

### **⚡ Automation Settings**
```bash
# n8n API Configuration
N8N_API_KEY=your_n8n_api_key
N8N_BASE_URL=https://your-n8n-instance.com
N8N_ENABLED=true
```

---

## 🌐 **APPLICATION CONFIGURATION**

### **🚀 Server Settings**
```bash
# Environment & Server
NODE_ENV=production
PORT=5001
FRONTEND_URL=https://your-frontend-domain.com

# Logging
LOG_LEVEL=info

# Performance
MAX_REQUEST_SIZE=10mb
COMPRESSION_LEVEL=6
CACHE_TTL=300
```

### **🛡️ Rate Limiting**
```bash
# Rate Limiting Configuration
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### **📊 Monitoring & Performance**
```bash
# Performance Monitoring
ENABLE_METRICS=true
ENABLE_TRACING=false

# Deployment Information
DEPLOYMENT_PLATFORM=coolify
BUILD_ENV=production
HEALTH_CHECK_PATH=/api/health
APP_VERSION=1.0.0
```

---

## 🏗️ **ENVIRONMENT-SPECIFIC CONFIGURATIONS**

### **🔧 Development Environment (.env)**
```bash
NODE_ENV=development
PORT=5001
DATABASE_URL=postgresql://localhost:5432/floworx_dev
JWT_SECRET=development_jwt_secret_at_least_32_characters_long
ENCRYPTION_KEY=dev_encryption_key_32_chars_long
FRONTEND_URL=http://localhost:3000
LOG_LEVEL=debug
DISABLE_REDIS=true
```

### **🚀 Production Environment (.env.production)**
```bash
NODE_ENV=production
PORT=5001
DATABASE_URL=postgresql://user:pass@host:port/db
JWT_SECRET=production_jwt_secret_128_characters_minimum_for_security
ENCRYPTION_KEY=prod_encryption_key_32_chars_long
FRONTEND_URL=https://app.floworx-iq.com
LOG_LEVEL=info
# ... all other production variables
```

### **🧪 Test Environment (.env.test)**
```bash
NODE_ENV=test
DATABASE_URL=postgresql://localhost:5432/floworx_test
JWT_SECRET=test_jwt_secret_32_characters_long
ENCRYPTION_KEY=test_encryption_key_32_chars_long
DISABLE_REDIS=true
DISABLE_EMAIL=true
```

---

## ✅ **VALIDATION RULES**

### **🔒 Security Requirements**
- **JWT_SECRET**: Minimum 32 characters, recommended 64+ characters
- **ENCRYPTION_KEY**: Exactly 32 characters for AES-256 encryption
- **Database passwords**: Minimum 8 characters with complexity
- **OAuth secrets**: Use values provided by Google OAuth console

### **🌐 URL Format Requirements**
- **DATABASE_URL**: Must start with `postgresql://`
- **SUPABASE_URL**: Must start with `https://` and end with `.supabase.co`
- **FRONTEND_URL**: Must be a valid HTTPS URL in production
- **REDIS_URL**: Must start with `redis://` or `rediss://`

### **📊 Numeric Validations**
- **PORT**: Valid port number (1-65535)
- **SMTP_PORT**: Common values: 25, 465, 587, 2525
- **REDIS_PORT**: Default 6379
- **DB_PORT**: Default 5432 for PostgreSQL

---

## 🛠️ **CONFIGURATION MANAGEMENT**

### **📁 File Locations**
The application looks for environment files in this order:
1. `/.env` (Root directory)
2. `/backend/.env` (Backend directory)
3. `/.env.production` (Production environment)
4. `/.env.local` (Local overrides)
5. System environment variables

### **🔍 Validation on Startup**
The application automatically validates all environment variables on startup:
- **Required variables**: Application fails to start if missing
- **Optional variables**: Warnings logged, features disabled gracefully
- **Format validation**: URLs, ports, and key lengths validated
- **Security checks**: Minimum security requirements enforced

### **📊 Health Check Endpoint**
Access configuration status at: `GET /api/health/config`
```json
{
  "status": "healthy",
  "configuration": {
    "valid": true,
    "errors": 0,
    "warnings": 2
  },
  "services": {
    "database": true,
    "redis": false,
    "email": true,
    "oauth": true,
    "n8n": false
  }
}
```

---

## 🚨 **TROUBLESHOOTING**

### **Common Issues**
1. **Database Connection Failed**: Check DATABASE_URL format and credentials
2. **JWT Errors**: Ensure JWT_SECRET is at least 32 characters
3. **OAuth Failures**: Verify Google OAuth credentials and redirect URI
4. **Email Not Sending**: Check SMTP credentials and firewall settings
5. **Redis Connection Issues**: Verify REDIS_URL or set DISABLE_REDIS=true

### **Debug Commands**
```bash
# Check configuration validation
node -e "require('./backend/config/config'); console.log('Config loaded successfully')"

# View safe configuration (development only)
curl http://localhost:5001/api/config/view

# Health check with configuration status
curl http://localhost:5001/api/health/config
```

---

## 🔐 **SECURITY BEST PRACTICES**

1. **Never commit .env files** to version control
2. **Use different secrets** for each environment
3. **Rotate secrets regularly** in production
4. **Use environment-specific values** for all credentials
5. **Enable HTTPS** for all production URLs
6. **Use strong passwords** for all database and service accounts
7. **Limit access** to environment variables in production

---

## 📞 **SUPPORT**

For configuration assistance:
1. Check the health endpoint: `/api/health/config`
2. Review application logs for validation errors
3. Use the configuration validation script: `node scripts/validate-environment.js`
4. Consult this documentation for required formats and values

**The centralized configuration system ensures consistent, secure, and maintainable environment management across all deployment environments!** 🚀
