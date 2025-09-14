#!/usr/bin/env node

/**
 * Coolify Deployment Troubleshooting Script
 * Helps diagnose connection and credential issues
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

);
);

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
    );
  }

  console.log('\n🔧 Recommended Actions:');
  );
  );
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
