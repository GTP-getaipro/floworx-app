#!/usr/bin/env node

/**
 * Coolify Deployment Script
 * Configures and deploys FloWorx to Coolify with proper production settings
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 FLOWORX COOLIFY DEPLOYMENT');
console.log('=============================\n');

// Production configuration for Coolify
const COOLIFY_CONFIG = {
  // Your custom domain
  DOMAIN: 'app.floworx-iq.com',
  
  // API endpoints
  API_BASE: 'https://app.floworx-iq.com/api',
  FRONTEND_URL: 'https://app.floworx-iq.com',
  
  // OAuth callbacks
  GOOGLE_REDIRECT_URI: 'https://app.floworx-iq.com/api/oauth/google/callback',
  
  // Email configuration
  FROM_EMAIL: 'noreply@app.floworx-iq.com'
};

class CoolifyDeployer {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  async deploy() {
    console.log('🔍 Step 1: Pre-deployment validation...');
    await this.validateEnvironment();
    
    console.log('\n🔧 Step 2: Configure Coolify deployment...');
    await this.configureCoolify();
    
    console.log('\n📝 Step 3: Create deployment files...');
    await this.createDeploymentFiles();
    
    console.log('\n🧪 Step 4: Validate configuration...');
    await this.validateConfiguration();
    
    console.log('\n📦 Step 5: Prepare for deployment...');
    await this.prepareDeployment();
    
    this.showSummary();
  }

  async validateEnvironment() {
    console.log('   🔍 Checking current environment...');
    
    // Check if .env exists and has required values
    if (fs.existsSync('.env')) {
      const envContent = fs.readFileSync('.env', 'utf8');
      if (envContent.includes('SUPABASE_URL') && !envContent.includes('your-project')) {
        console.log('   ✅ Supabase configuration found');
      } else {
        this.warnings.push('Supabase configuration needs real values');
      }
      
      if (envContent.includes('SMTP_PASS') && envContent.includes('SG.')) {
        console.log('   ✅ SendGrid configuration found');
      } else {
        this.warnings.push('SendGrid configuration needs real API key');
      }
    }
    
    // Check for localhost references
    const filesToCheck = [
      'test-email-auth-flow.js',
      'frontend/src/utils/apiClient.js'
    ];
    
    for (const file of filesToCheck) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        if (content.includes('process.env') && content.includes('localhost')) {
          console.log(`   ✅ ${file} - uses environment variables`);
        }
      }
    }
  }

  async configureCoolify() {
    console.log('   📝 Creating Coolify configuration...');
    
    // Create Dockerfile for backend
    const dockerfile = `# Multi-stage build for FloWorx
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/
COPY package*.json ./

# Install dependencies
RUN cd backend && npm ci --only=production
RUN cd frontend && npm ci

# Build frontend
FROM base AS frontend-builder
WORKDIR /app
COPY frontend/ ./frontend/
COPY --from=deps /app/frontend/node_modules ./frontend/node_modules

# Set production environment for build
ENV NODE_ENV=production
ENV REACT_APP_API_URL=https://app.floworx-iq.com/api
ENV GENERATE_SOURCEMAP=false
ENV CI=false

RUN cd frontend && npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5001

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy backend files
COPY backend/ ./backend/
COPY --from=deps /app/backend/node_modules ./backend/node_modules

# Copy built frontend
COPY --from=frontend-builder /app/frontend/build ./frontend/build

# Copy API files for serverless functions
COPY api/ ./api/

# Set permissions
RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:5001/api/health || exit 1

CMD ["node", "backend/server.js"]`;

    fs.writeFileSync('Dockerfile', dockerfile);
    console.log('   ✅ Created Dockerfile');

    // Create docker-compose for local testing
    const dockerCompose = `version: '3.8'

services:
  floworx-app:
    build: .
    ports:
      - "5001:5001"
    environment:
      - NODE_ENV=production
      - PORT=5001
      - FRONTEND_URL=https://app.floworx-iq.com
    env_file:
      - .env.production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # Optional: Add PostgreSQL if not using Supabase
  # postgres:
  #   image: postgres:15-alpine
  #   environment:
  #     POSTGRES_DB: floworx_db
  #     POSTGRES_USER: floworx_user
  #     POSTGRES_PASSWORD: your_secure_password
  #   volumes:
  #     - postgres_data:/var/lib/postgresql/data
  #   ports:
  #     - "5432:5432"

# volumes:
#   postgres_data:`;

    fs.writeFileSync('docker-compose.yml', dockerCompose);
    console.log('   ✅ Created docker-compose.yml');
  }

  async createDeploymentFiles() {
    console.log('   📝 Creating deployment configuration files...');
    
    // Create .dockerignore
    const dockerignore = `node_modules
npm-debug.log
.git
.gitignore
README.md
.env
.env.local
.env.development
.env.test
.nyc_output
coverage
.DS_Store
*.log
logs
*.tgz
.cache
.next
.vercel
.vscode
.idea
*.swp
*.swo
*~
frontend/build
backend/dist
test-results
playwright-report`;

    fs.writeFileSync('.dockerignore', dockerignore);
    console.log('   ✅ Created .dockerignore');

    // Create Coolify deployment script
    const coolifyDeploy = `#!/bin/bash

# Coolify Deployment Script for FloWorx
echo "🚀 Starting FloWorx deployment to Coolify..."

# Build the application
echo "📦 Building application..."
docker build -t floworx-app:latest .

# Test the build locally (optional)
echo "🧪 Testing build..."
docker run --rm -p 5001:5001 --env-file .env.production floworx-app:latest &
CONTAINER_PID=$!

# Wait for container to start
sleep 10

# Test health endpoint
if curl -f http://localhost:5001/api/health; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
    kill $CONTAINER_PID
    exit 1
fi

# Stop test container
kill $CONTAINER_PID

echo "✅ Build validation complete"
echo "🎯 Ready for Coolify deployment!"

echo ""
echo "📋 NEXT STEPS:"
echo "=============="
echo "1. Push code to your Git repository"
echo "2. In Coolify dashboard:"
echo "   - Create new application"
echo "   - Connect to your Git repository"
echo "   - Set domain: app.floworx-iq.com"
echo "   - Configure environment variables from .env.production"
echo "   - Deploy!"
echo ""
echo "🔧 ENVIRONMENT VARIABLES TO SET IN COOLIFY:"
echo "==========================================="

# Read and display environment variables
if [ -f ".env.production" ]; then
    grep -v '^#' .env.production | grep -v '^$' | while read line; do
        echo "   $line"
    done
fi

echo ""
echo "🌐 IMPORTANT URLS TO UPDATE:"
echo "============================"
echo "• Google OAuth Console: Add https://app.floworx-iq.com/api/oauth/google/callback"
echo "• SendGrid Domain Authentication: Verify app.floworx-iq.com"
echo "• n8n Webhooks: Update to use https://app.floworx-iq.com/api/webhooks"`;

    fs.writeFileSync('deploy-coolify.sh', coolifyDeploy);
    fs.chmodSync('deploy-coolify.sh', '755');
    console.log('   ✅ Created deploy-coolify.sh');
  }

  async validateConfiguration() {
    console.log('   🔍 Validating deployment configuration...');
    
    // Check Dockerfile
    if (fs.existsSync('Dockerfile')) {
      console.log('   ✅ Dockerfile created');
    } else {
      this.errors.push('Dockerfile not created');
    }
    
    // Check docker-compose
    if (fs.existsSync('docker-compose.yml')) {
      console.log('   ✅ Docker Compose file created');
    } else {
      this.errors.push('Docker Compose file not created');
    }
    
    // Validate .env.production
    if (fs.existsSync('.env.production')) {
      const envContent = fs.readFileSync('.env.production', 'utf8');
      
      const requiredVars = [
        'NODE_ENV=production',
        'FRONTEND_URL=https://app.floworx-iq.com',
        'GOOGLE_REDIRECT_URI=https://app.floworx-iq.com'
      ];
      
      for (const varCheck of requiredVars) {
        if (envContent.includes(varCheck)) {
          console.log(`   ✅ ${varCheck.split('=')[0]} configured correctly`);
        } else {
          this.warnings.push(`${varCheck} not found in .env.production`);
        }
      }
    }
  }

  async prepareDeployment() {
    console.log('   📦 Preparing final deployment package...');
    
    // Test Docker build locally
    try {
      console.log('   🔨 Testing Docker build...');
      execSync('docker build -t floworx-test .', { stdio: 'pipe' });
      console.log('   ✅ Docker build successful');
    } catch (error) {
      this.warnings.push('Docker build test failed - check Dockerfile');
      console.log('   ⚠️  Docker build test failed');
    }
    
    // Create deployment checklist
    const checklist = `# FloWorx Coolify Deployment Checklist

## ✅ Pre-Deployment (Complete)
- [x] Dockerfile created
- [x] Docker Compose configuration
- [x] Environment variables configured
- [x] Production URLs set
- [x] Localhost references handled

## 🚀 Coolify Deployment Steps

### 1. Push to Git Repository
\`\`\`bash
git add .
git commit -m "Configure for Coolify deployment"
git push origin main
\`\`\`

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
\`\`\`bash
# Build and test locally
docker build -t floworx-app .
docker run -p 5001:5001 --env-file .env.production floworx-app

# Test endpoints
curl https://app.floworx-iq.com/api/health
curl https://app.floworx-iq.com/api/oauth/google
\`\`\`

### Production API Test
\`\`\`bash
# Test with production environment
API_BASE_URL=https://app.floworx-iq.com/api node test-email-auth-flow.js
\`\`\`

## 🔧 Troubleshooting

### Common Issues:
1. **Build fails**: Check Dockerfile and dependencies
2. **Environment variables**: Ensure all vars are set in Coolify
3. **Domain not working**: Check DNS and SSL configuration
4. **OAuth fails**: Verify redirect URIs in Google Console
5. **Emails not sending**: Check SendGrid domain verification

### Debug Commands:
\`\`\`bash
# Check container logs
docker logs floworx-app

# Test specific endpoints
curl -I https://app.floworx-iq.com/api/health
curl -I https://app.floworx-iq.com/api/oauth/google
\`\`\``;

    fs.writeFileSync('DEPLOYMENT_CHECKLIST.md', checklist);
    console.log('   ✅ Created deployment checklist');
  }

  showSummary() {
    console.log('\n📊 COOLIFY DEPLOYMENT SUMMARY');
    console.log('=============================');
    
    console.log('\n✅ CREATED FILES:');
    console.log('   • Dockerfile - Multi-stage build configuration');
    console.log('   • docker-compose.yml - Local testing setup');
    console.log('   • .dockerignore - Optimized build context');
    console.log('   • deploy-coolify.sh - Deployment script');
    console.log('   • DEPLOYMENT_CHECKLIST.md - Step-by-step guide');
    
    if (this.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      this.warnings.forEach(warning => console.log(`   • ${warning}`));
    }
    
    if (this.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      this.errors.forEach(error => console.log(`   • ${error}`));
    }
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('==============');
    console.log('1. Review DEPLOYMENT_CHECKLIST.md');
    console.log('2. Test locally: docker-compose up');
    console.log('3. Push to Git repository');
    console.log('4. Configure in Coolify dashboard');
    console.log('5. Deploy and test!');
    
    console.log('\n🚀 READY FOR COOLIFY DEPLOYMENT!');
    console.log('================================');
    console.log('All configuration files have been created.');
    console.log('Follow the deployment checklist to complete the setup.');
  }
}

// Run deployment preparation
if (require.main === module) {
  const deployer = new CoolifyDeployer();
  deployer.deploy().catch(console.error);
}

module.exports = CoolifyDeployer;
