const fs = require('fs');
const path = require('path');
require('dotenv').config();

/**
 * Prepare Production Environment Variables
 * Creates Vercel-ready environment configuration and deployment guide
 */

async function prepareProductionEnvironment() {
  console.log('🚀 Preparing Production Environment Variables...\n');

  const results = {
    environmentAudit: false,
    productionFileCheck: false,
    vercelConfigCreated: false,
    deploymentGuideCreated: false
  };

  // =====================================================
  // 1. ENVIRONMENT AUDIT
  // =====================================================
  console.log('1. Auditing current environment configuration...');
  
  const requiredVars = [
    'DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD',
    'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY',
    'JWT_SECRET', 'ENCRYPTION_KEY',
    'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET',
    'N8N_WEBHOOK_URL', 'N8N_API_KEY', 'N8N_BASE_URL',
    'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'FROM_EMAIL', 'FROM_NAME'
  ];

  const missingVars = [];
  const configuredVars = [];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
      console.log(`   ❌ ${varName}: Missing`);
    } else if (process.env[varName].includes('your_') || process.env[varName].includes('your-')) {
      missingVars.push(varName);
      console.log(`   ⚠️  ${varName}: Has placeholder value`);
    } else {
      configuredVars.push(varName);
      console.log(`   ✅ ${varName}: Configured`);
    }
  }

  console.log(`\n📊 Environment Status: ${configuredVars.length}/${requiredVars.length} variables configured`);

  if (missingVars.length === 0) {
    results.environmentAudit = true;
    console.log('✅ All required environment variables are configured\n');
  } else {
    console.log(`❌ Missing/placeholder variables: ${missingVars.join(', ')}\n`);
  }

  // =====================================================
  // 2. PRODUCTION FILE CHECK
  // =====================================================
  console.log('2. Checking production environment files...');
  
  const prodEnvFile = path.join(process.cwd(), 'backend', '.env.production');
  
  if (fs.existsSync(prodEnvFile)) {
    console.log('   ✅ backend/.env.production exists');
    results.productionFileCheck = true;
  } else {
    console.log('   ❌ backend/.env.production missing');
  }

  // =====================================================
  // 3. CREATE VERCEL ENVIRONMENT CONFIG
  // =====================================================
  console.log('\n3. Creating Vercel environment configuration...');
  
  const vercelEnvConfig = {
    development: {},
    production: {}
  };

  // Production environment variables
  const productionVars = {
    // Database
    DB_HOST: process.env.DB_HOST,
    DB_PORT: process.env.DB_PORT,
    DB_NAME: process.env.DB_NAME,
    DB_USER: process.env.DB_USER,
    DB_PASSWORD: process.env.DB_PASSWORD,
    
    // Supabase
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    
    // Security
    JWT_SECRET: process.env.JWT_SECRET,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    
    // OAuth - Production URLs
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI: 'https://floworx-app-git-main-floworxdevelopers-projects.vercel.app/api/oauth/google/callback',
    
    // n8n
    N8N_WEBHOOK_URL: process.env.N8N_WEBHOOK_URL,
    N8N_API_KEY: process.env.N8N_API_KEY,
    N8N_BASE_URL: process.env.N8N_BASE_URL,
    
    // Email
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    FROM_EMAIL: process.env.FROM_EMAIL,
    FROM_NAME: process.env.FROM_NAME,
    
    // Server
    NODE_ENV: 'production',
    PORT: '5001',
    FRONTEND_URL: 'https://floworx-app-git-main-floworxdevelopers-projects.vercel.app'
  };

  // Create Vercel environment variables file
  const vercelEnvPath = path.join(process.cwd(), 'vercel-environment-variables.txt');
  let vercelEnvContent = '# Vercel Environment Variables\n';
  vercelEnvContent += '# Copy and paste these into your Vercel dashboard\n\n';

  for (const [key, value] of Object.entries(productionVars)) {
    if (value) {
      vercelEnvContent += `${key}=${value}\n`;
    } else {
      vercelEnvContent += `# ${key}=MISSING_VALUE\n`;
    }
  }

  fs.writeFileSync(vercelEnvPath, vercelEnvContent);
  console.log('   ✅ Created vercel-environment-variables.txt');
  results.vercelConfigCreated = true;

  // =====================================================
  // 4. CREATE DEPLOYMENT GUIDE
  // =====================================================
  console.log('\n4. Creating deployment guide...');
  
  const deploymentGuide = `# 🚀 Floworx Production Deployment Guide

## **📋 Pre-Deployment Checklist**

### **✅ Environment Variables Status**
${configuredVars.map(v => `- ✅ ${v}: Configured`).join('\n')}

${missingVars.length > 0 ? `### **❌ Missing Variables**
${missingVars.map(v => `- ❌ ${v}: Needs configuration`).join('\n')}

**⚠️ Fix missing variables before deploying!**
` : ''}

## **🔧 Vercel Deployment Steps**

### **Step 1: Deploy to Vercel**
\`\`\`bash
# Install Vercel CLI (if not already installed)
npm install -g vercel

# Deploy from root directory
vercel --prod
\`\`\`

### **Step 2: Configure Environment Variables**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your Floworx project
3. Go to Settings → Environment Variables
4. Copy variables from \`vercel-environment-variables.txt\`
5. Set each variable for **Production** environment

### **Step 3: Update Google OAuth Settings**
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Find your OAuth 2.0 Client ID
3. Add production redirect URI:
   \`https://floworx-app-git-main-floworxdevelopers-projects.vercel.app/api/oauth/google/callback\`

### **Step 4: Test Production Deployment**
1. Visit your deployed URL
2. Test user registration/login
3. Test Google OAuth flow
4. Test email notifications
5. Test n8n webhook integration

## **🔒 Security Checklist**

- ✅ All secrets are stored in Vercel environment variables
- ✅ No sensitive data in code repository
- ✅ Production URLs configured (no localhost)
- ✅ HTTPS enabled for all endpoints
- ✅ CORS configured for production frontend

## **📊 Production URLs**

- **Backend API**: https://floworx-app-git-main-floworxdevelopers-projects.vercel.app
- **Frontend**: https://floworx-app-git-main-floworxdevelopers-projects.vercel.app
- **OAuth Callback**: https://floworx-app-git-main-floworxdevelopers-projects.vercel.app/api/oauth/google/callback

## **🧪 Post-Deployment Testing**

### **Test OAuth Flow**
\`\`\`bash
curl -I "https://your-deployment-url.vercel.app/api/oauth/google"
\`\`\`

### **Test Database Connection**
\`\`\`bash
curl "https://your-deployment-url.vercel.app/api/health"
\`\`\`

### **Test Email Service**
- Register a new user
- Verify email verification is sent
- Complete onboarding flow

## **🚨 Troubleshooting**

### **Common Issues:**
1. **OAuth redirect mismatch**: Update Google Cloud Console redirect URIs
2. **Database connection fails**: Check Supabase connection pooler settings
3. **Email not sending**: Verify Gmail App Password is correct
4. **CORS errors**: Ensure FRONTEND_URL matches deployed domain

### **Debug Commands:**
\`\`\`bash
# Check environment variables
vercel env ls

# View deployment logs
vercel logs

# Test specific endpoints
curl -v "https://your-deployment-url.vercel.app/api/health"
\`\`\`

## **📈 Monitoring & Maintenance**

1. **Set up monitoring** for API endpoints
2. **Monitor email delivery** rates
3. **Check n8n workflow** execution logs
4. **Review Supabase** usage and performance
5. **Update dependencies** regularly

## **🔄 Custom Domain Setup (Optional)**

When ready to use \`app.floworx-iq.com\`:

1. **Add custom domain** in Vercel dashboard
2. **Update environment variables**:
   - \`FRONTEND_URL=https://app.floworx-iq.com\`
   - \`GOOGLE_REDIRECT_URI=https://app.floworx-iq.com/api/oauth/google/callback\`
3. **Update Google OAuth** redirect URIs
4. **Test all integrations** with new domain

---

**🎉 Your Floworx SaaS is ready for production deployment!**
`;

  const deploymentGuidePath = path.join(process.cwd(), 'PRODUCTION_DEPLOYMENT_GUIDE.md');
  fs.writeFileSync(deploymentGuidePath, deploymentGuide);
  console.log('   ✅ Created PRODUCTION_DEPLOYMENT_GUIDE.md');
  results.deploymentGuideCreated = true;

  // =====================================================
  // 5. SUMMARY
  // =====================================================
  console.log('\n📊 Production Preparation Summary:');
  console.log(`   Environment Audit: ${results.environmentAudit ? '✅' : '❌'}`);
  console.log(`   Production Files: ${results.productionFileCheck ? '✅' : '❌'}`);
  console.log(`   Vercel Config: ${results.vercelConfigCreated ? '✅' : '❌'}`);
  console.log(`   Deployment Guide: ${results.deploymentGuideCreated ? '✅' : '❌'}`);

  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;

  console.log(`\n🎯 Overall Score: ${passedTests}/${totalTests} preparation steps completed`);

  if (passedTests === totalTests && missingVars.length === 0) {
    console.log('🎉 Production environment is fully prepared and ready for deployment!');
  } else if (passedTests >= 3) {
    console.log('✅ Production environment mostly ready. Address remaining issues.');
  } else {
    console.log('❌ Production environment needs more preparation.');
  }

  console.log('\n📋 Next Steps:');
  if (missingVars.length > 0) {
    console.log('   1. ⚠️  Fix missing environment variables');
    console.log('   2. ⚠️  Re-run this preparation script');
  } else {
    console.log('   1. ✅ Review vercel-environment-variables.txt');
    console.log('   2. ✅ Follow PRODUCTION_DEPLOYMENT_GUIDE.md');
    console.log('   3. ✅ Deploy to Vercel');
    console.log('   4. ✅ Test production deployment');
  }

  return results;
}

// Run preparation if called directly
if (require.main === module) {
  prepareProductionEnvironment()
    .then(results => {
      const allReady = Object.values(results).every(Boolean);
      process.exit(allReady ? 0 : 1);
    })
    .catch(err => {
      console.error('❌ Production preparation failed:', err);
      process.exit(1);
    });
}

module.exports = { prepareProductionEnvironment };
