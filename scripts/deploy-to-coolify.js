#!/usr/bin/env node

/**
 * Coolify Deployment Helper Script
 * Automates the deployment process and provides validation
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 FloWorx Coolify Deployment Helper');
console.log('=====================================');

const requiredEnvVars = [
  'DATABASE_URL',
  'REDIS_HOST',
  'JWT_SECRET',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'SMTP_USER',
  'SMTP_PASS'
];

const optionalEnvVars = [
  'REDIS_PASSWORD',
  'SUPABASE_SERVICE_ROLE_KEY',
  'N8N_WEBHOOK_URL',
  'N8N_API_KEY'
];

function checkEnvironmentVariables() {
  console.log('\n🔍 Checking Environment Variables...');

  let missingRequired = [];
  let missingOptional = [];

  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      missingRequired.push(varName);
    }
  });

  optionalEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      missingOptional.push(varName);
    }
  });

  if (missingRequired.length > 0) {
    console.log('❌ Missing Required Environment Variables:');
    missingRequired.forEach(varName => {
      console.log(`   - ${varName}`);
    });
  }

  if (missingOptional.length > 0) {
    console.log('⚠️  Missing Optional Environment Variables:');
    missingOptional.forEach(varName => {
      console.log(`   - ${varName}`);
    });
  }

  return missingRequired.length === 0;
}

function validateDockerCompose() {
  console.log('\n🔍 Validating Docker Compose Configuration...');

  const composeFile = path.join(__dirname, '..', 'docker-compose.coolify.yml');

  if (!fs.existsSync(composeFile)) {
    console.log('❌ docker-compose.coolify.yml not found');
    return false;
  }

  try {
    execSync(`docker-compose -f "${composeFile}" config`, { stdio: 'pipe' });
    console.log('✅ Docker Compose configuration is valid');
    return true;
  } catch (error) {
    console.log('❌ Docker Compose validation failed:');
    console.log(error.stdout?.toString() || error.message);
    return false;
  }
}

function checkDockerfile() {
  console.log('\n🔍 Validating Dockerfile...');

  const dockerfile = path.join(__dirname, '..', 'Dockerfile');

  if (!fs.existsSync(dockerfile)) {
    console.log('❌ Dockerfile not found');
    return false;
  }

  try {
    execSync(`docker build --dry-run -f "${dockerfile}" .`, { stdio: 'pipe' });
    console.log('✅ Dockerfile syntax is valid');
    return true;
  } catch (error) {
    console.log('❌ Dockerfile validation failed:');
    console.log(error.stdout?.toString() || error.message);
    return false;
  }
}

function testDatabaseConnection() {
  console.log('\n🔍 Testing Database Connection...');

  if (!process.env.DATABASE_URL) {
    console.log('⚠️  DATABASE_URL not set, skipping database test');
    return true;
  }

  try {
    // Simple connection test using pg
    const testScript = `
      const { Client } = require('pg');
      const client = new Client({ connectionString: process.env.DATABASE_URL });
      client.connect()
        .then(() => {
          console.log('✅ Database connection successful');
          return client.end();
        })
        .catch(err => {
          console.log('❌ Database connection failed:', err.message);
          process.exit(1);
        });
    `;

    execSync(`node -e "${testScript}"`, { stdio: 'inherit', timeout: 10000 });
    return true;
  } catch (error) {
    console.log('❌ Database connection test failed');
    return false;
  }
}

function generateDeploymentSummary() {
  console.log('\n📋 Deployment Summary');
  console.log('=====================');

  console.log('✅ Files validated:');
  console.log('   - docker-compose.coolify.yml');
  console.log('   - Dockerfile');
  console.log('   - Environment variables');

  console.log('\n📝 Next Steps:');
  console.log('1. Push changes to your git repository');
  console.log('2. In Coolify dashboard, create/import your project');
  console.log('3. Configure PostgreSQL and KeyDB services');
  console.log('4. Set environment variables in Coolify');
  console.log('5. Deploy the application');

  console.log('\n🔗 Useful Links:');
  console.log('   - Coolify Documentation: https://coolify.io/docs');
  console.log('   - Deployment Guide: COOLIFY_DEPLOYMENT_GUIDE.md');
}

function main() {
  let allChecksPass = true;

  // Check environment variables
  if (!checkEnvironmentVariables()) {
    allChecksPass = false;
  }

  // Validate Docker Compose
  if (!validateDockerCompose()) {
    allChecksPass = false;
  }

  // Validate Dockerfile
  if (!checkDockerfile()) {
    allChecksPass = false;
  }

  // Test database connection
  if (!testDatabaseConnection()) {
    allChecksPass = false;
  }

  // Generate summary
  generateDeploymentSummary();

  if (allChecksPass) {
    console.log('\n🎉 Pre-deployment checks completed successfully!');
    console.log('You are ready to deploy to Coolify.');
  } else {
    console.log('\n❌ Some checks failed. Please fix the issues before deploying.');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main, checkEnvironmentVariables, validateDockerCompose, checkDockerfile, testDatabaseConnection };
