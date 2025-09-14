#!/usr/bin/env node

/**
 * FloWorx Production Deployment Script
 * Automates the production deployment process
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 FloWorx Production Deployment');
console.log('================================');

// Pre-deployment checks
console.log('\n🔍 Running pre-deployment checks...');

try {
  // Check if build works
  console.log('✅ Testing build process...');
  execSync('npm run vercel-build', { stdio: 'pipe' });
  console.log('✅ Build successful');

  // Check environment variables
  );
  const envFile = path.join(__dirname, '..', 'vercel-environment-variables-PRODUCTION.txt');
  if (fs.existsSync(envFile)) {
    );
  } else {
    );
  }

  // Check vercel.json
  console.log('✅ Checking Vercel configuration...');
  const vercelConfig = path.join(__dirname, '..', 'vercel.json');
  if (fs.existsSync(vercelConfig)) {
    const config = JSON.parse(fs.readFileSync(vercelConfig, 'utf8'));
    if (config.name === 'floworx-saas') {
      console.log('✅ Vercel configuration is ready for production');
    }
  }

  console.log('\n🎉 Pre-deployment checks passed!');
  console.log('\n📋 Next Steps:');
  console.log('1. Deploy to Vercel using: vercel --prod');
  );
  console.log('3. Set up custom domain: app.floworx-iq.com');
  console.log('4. Update Google OAuth settings');
  console.log('5. Run post-deployment tests');

} catch (error) {
  console.error('❌ Pre-deployment check failed:', error.message);
  process.exit(1);
}
