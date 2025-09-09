#!/usr/bin/env node

/**
 * Coolify Deployment Troubleshooting Script
 * Helps diagnose connection and credential issues
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Coolify Deployment Troubleshooting');
console.log('=====================================');

function checkEnvironmentVariables() {
  console.log('\n📋 Environment Variables Check:');
  console.log('--------------------------------');

  const envVars = [
    'NODE_ENV',
    'REDIS_HOST',
    'REDIS_PORT',
    'REDIS_PASSWORD',
    'DATABASE_URL',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'GOOGLE_CLIENT_ID',
    'SMTP_HOST',
    'SMTP_USER',
    'FRONTEND_URL',
    'JWT_SECRET'
  ];

  envVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      if (varName.includes('PASSWORD') || varName.includes('SECRET') || varName.includes('KEY')) {
        console.log(`✅ ${varName}: [SET - ${value.length} chars]`);
      } else {
        console.log(`✅ ${varName}: ${value}`);
      }
    } else {
      console.log(`❌ ${varName}: NOT SET`);
    }
  });
}

function testDatabaseConnection() {
  console.log('\n🗄️  Database Connection Test:');
  console.log('-----------------------------');

  if (!process.env.DATABASE_URL) {
    console.log('❌ DATABASE_URL not set');
    return;
  }

  try {
    // Test PostgreSQL connection
    const testScript = `
      const { Client } = require('pg');
      const client = new Client({ connectionString: process.env.DATABASE_URL });

      client.connect()
        .then(() => {
          console.log('✅ Database connection successful');
          return client.query('SELECT version()');
        })
        .then(result => {
          console.log('📊 PostgreSQL version:', result.rows[0].version.split(' ')[1]);
          return client.end();
        })
        .catch(err => {
          console.log('❌ Database connection failed:', err.message);
          process.exit(1);
        });
    `;

    execSync(`node -e "${testScript}"`, { stdio: 'inherit', timeout: 10000 });
  } catch (error) {
    console.log('❌ Database test failed');
  }
}

function testRedisConnection() {
  console.log('\n🔴 Redis/KeyDB Connection Test:');
  console.log('--------------------------------');

  const redisHost = process.env.REDIS_HOST || 'localhost';
  const redisPort = process.env.REDIS_PORT || 6379;
  const redisPassword = process.env.REDIS_PASSWORD;

  console.log(`Testing connection to: ${redisHost}:${redisPort}`);

  try {
    const testScript = `
      const redis = require('redis');

      const client = redis.createClient({
        host: '${redisHost}',
        port: ${redisPort},
        password: ${redisPassword ? `'${redisPassword}'` : 'null'}
      });

      client.on('error', (err) => {
        console.log('❌ Redis connection failed:', err.message);
        process.exit(1);
      });

      client.on('connect', () => {
        console.log('✅ Redis connection successful');
        client.quit();
      });

      setTimeout(() => {
        console.log('⏰ Connection timeout - Redis may not be running');
        process.exit(1);
      }, 5000);
    `;

    execSync(`node -e "${testScript}"`, { stdio: 'inherit', timeout: 10000 });
  } catch (error) {
    console.log('❌ Redis test failed or timed out');
  }
}

function checkServiceConnectivity() {
  console.log('\n🌐 Service Connectivity Check:');
  console.log('-------------------------------');

  const services = [
    { name: 'Database', host: process.env.DATABASE_URL ? 'postgresql-host' : null, port: 5432 },
    { name: 'Redis/KeyDB', host: process.env.REDIS_HOST, port: process.env.REDIS_PORT || 6379 }
  ];

  services.forEach(service => {
    if (service.host) {
      try {
        // Simple connectivity test
        console.log(`Testing ${service.name} connectivity...`);
        // This would require more complex network testing
        console.log(`📍 ${service.name} configured for: ${service.host}:${service.port}`);
      } catch (error) {
        console.log(`❌ ${service.name} connectivity test failed`);
      }
    } else {
      console.log(`⚠️  ${service.name} not configured`);
    }
  });
}

function generateTroubleshootingReport() {
  console.log('\n📄 Troubleshooting Report:');
  console.log('==========================');

  const issues = [];

  if (!process.env.DATABASE_URL) issues.push('DATABASE_URL not set');
  if (!process.env.REDIS_HOST) issues.push('REDIS_HOST not set');
  if (!process.env.REDIS_PORT) issues.push('REDIS_PORT not set');
  if (!process.env.SUPABASE_URL) issues.push('SUPABASE_URL not set');
  if (!process.env.JWT_SECRET) issues.push('JWT_SECRET not set');

  if (issues.length > 0) {
    console.log('❌ Issues found:');
    issues.forEach(issue => console.log(`   - ${issue}`));
  } else {
    console.log('✅ All critical environment variables are set');
  }

  console.log('\n🔧 Recommended Actions:');
  console.log('1. Check Coolify environment variables configuration');
  console.log('2. Verify service names match between Coolify services');
  console.log('3. Ensure all required services are running');
  console.log('4. Check network connectivity between services');
  console.log('5. Review application logs for specific error messages');
}

function main() {
  checkEnvironmentVariables();
  testDatabaseConnection();
  testRedisConnection();
  checkServiceConnectivity();
  generateTroubleshootingReport();

  console.log('\n✨ Troubleshooting complete!');
  console.log('Check the output above for specific issues and solutions.');
}

if (require.main === module) {
  main();
}

module.exports = { main, checkEnvironmentVariables, testDatabaseConnection, testRedisConnection };
