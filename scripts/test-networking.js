#!/usr/bin/env node

/**
 * Test Networking Configuration for Coolify Deployment
 * Checks environment variables and configuration without requiring Redis connection
 */

);
console.log('================================================================\n');

// Check environment variables
);
const envVars = [
  'NODE_ENV',
  'DATABASE_URL',
  'REDIS_HOST',
  'REDIS_PORT',
  'REDIS_PASSWORD',
  'JWT_SECRET',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'SMTP_HOST',
  'SMTP_USER',
  'SMTP_PASS',
  'FRONTEND_URL',
  'CORS_ORIGIN'
];

let missingVars = [];
let setVars = [];

envVars.forEach(varName => {
  if (process.env[varName]) {
    setVars.push(varName);
    );
  } else {
    missingVars.push(varName);
    console.log(`  ❌ ${varName}: not set`);
  }
});

);
);
);

if (missingVars.length > 0) {
  );
  missingVars.forEach(varName => console.log(`    - ${varName}`));
}

// Check Docker Compose configuration
console.log('\n🐳 Docker Compose Configuration Check:');
const fs = require('fs');
const path = require('path');

const composeFile = path.join(__dirname, '..', 'docker-compose.coolify.yml');
if (fs.existsSync(composeFile)) {
  );

  try {
    const composeContent = fs.readFileSync(composeFile, 'utf8');

    // Check for key configurations
    const checks = [
      { name: 'App service defined', pattern: /services:\s*\n\s*app:/ },
      { name: 'Port mapping', pattern: /ports:\s*\n\s*-\s*"80:5000"/ },
      { name: 'Environment variables', pattern: /environment:/ },
      { name: 'Health check', pattern: /healthcheck:/ },
      { name: 'Resource limits', pattern: /deploy:\s*\n\s*resources:/ }
    ];

    checks.forEach(check => {
      if (check.pattern.test(composeContent)) {
        console.log(`  ✅ ${check.name}`);
      } else {
        console.log(`  ❌ ${check.name} - not found`);
      }
    });

  } catch (error) {
    , error.message);
  }
} else {
  );
}

// Check Dockerfile
console.log('\n🏗️  Dockerfile Configuration Check:');
const dockerfile = path.join(__dirname, '..', 'Dockerfile');
if (fs.existsSync(dockerfile)) {
  console.log('  ✅ Dockerfile exists');

  try {
    const dockerContent = fs.readFileSync(dockerfile, 'utf8');

    const dockerChecks = [
      { name: 'Node.js base image', pattern: /FROM node:/ },
      { name: 'Working directory', pattern: /WORKDIR \/app/ },
      { name: 'Port exposure', pattern: /EXPOSE 5000/ },
      { name: 'Health check', pattern: /HEALTHCHECK/ },
      { name: 'Non-root user', pattern: /USER floworx/ }
    ];

    dockerChecks.forEach(check => {
      if (check.pattern.test(dockerContent)) {
        console.log(`  ✅ ${check.name}`);
      } else {
        console.log(`  ❌ ${check.name} - not found`);
      }
    });

  } catch (error) {
    console.log('  ❌ Error reading Dockerfile:', error.message);
  }
} else {
  console.log('  ❌ Dockerfile not found');
}

// Check start.sh script
console.log('\n🚀 Startup Script Check:');
const startScript = path.join(__dirname, '..', 'start.sh');
if (fs.existsSync(startScript)) {
  console.log('  ✅ start.sh exists');

  try {
    const startContent = fs.readFileSync(startScript, 'utf8');

    const startChecks = [
      { name: 'Environment validation', pattern: /DATABASE_URL.*must be set/ },
      { name: 'JWT validation', pattern: /JWT_SECRET.*must be set/ },
      { name: 'Production check', pattern: /NODE_ENV.*production/ },
      { name: 'Redis fallback', pattern: /KeyDB.*not configured/ }
    ];

    startChecks.forEach(check => {
      if (check.pattern.test(startContent)) {
        console.log(`  ✅ ${check.name}`);
      } else {
        console.log(`  ❌ ${check.name} - not found`);
      }
    });

  } catch (error) {
    console.log('  ❌ Error reading start.sh:', error.message);
  }
} else {
  console.log('  ❌ start.sh not found');
}

// Check cache service configuration
console.log('\n💾 Cache Service Configuration Check:');
const cacheService = path.join(__dirname, '..', 'backend', 'services', 'cacheService.js');
if (fs.existsSync(cacheService)) {
  console.log('  ✅ cacheService.js exists');

  try {
    const cacheContent = fs.readFileSync(cacheService, 'utf8');

    const cacheChecks = [
      { name: 'Offline queue enabled', pattern: /enableOfflineQueue:\s*true/ },
      { name: 'Multiple host fallback', pattern: /possibleHosts/ },
      { name: 'Memory cache fallback', pattern: /node-cache/ },
      { name: 'Connection retry logic', pattern: /retryStrategy/ }
    ];

    cacheChecks.forEach(check => {
      if (check.pattern.test(cacheContent)) {
        console.log(`  ✅ ${check.name}`);
      } else {
        console.log(`  ❌ ${check.name} - not found`);
      }
    });

  } catch (error) {
    console.log('  ❌ Error reading cacheService.js:', error.message);
  }
} else {
  console.log('  ❌ cacheService.js not found');
}

// Network configuration analysis
console.log('\n🌐 Network Configuration Analysis:');
);
);
console.log('    2. Database and Redis services are running and healthy');
console.log('    3. Network connectivity between application and database containers');
console.log('    4. Port configurations match service definitions');
);

);
console.log('  Database: floworx-db (PostgreSQL)');
console.log('  Cache: floworx-cache (KeyDB/Redis)');
console.log('  Application: floworx-app');

console.log('\n✅ Networking configuration check completed!');
);
