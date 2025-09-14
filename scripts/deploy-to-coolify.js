#!/usr/bin/env node

/**
 * Coolify Deployment Helper Script
 * Automates the deployment process and provides validation
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

);
);

  console.log('✅ Files validated:');
  );
  console.log('   - Dockerfile');
  );

  console.log('\n📝 Next Steps:');
  console.log('1. Push changes to your git repository');
  );
  console.log('3. Configure PostgreSQL and KeyDB services');
  );
  console.log('5. Deploy the application');

  console.log('\n🔗 Useful Links:');
  );
  );
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
    );
  } else {
    console.log('\n❌ Some checks failed. Please fix the issues before deploying.');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main, checkEnvironmentVariables, validateDockerCompose, checkDockerfile, testDatabaseConnection };
