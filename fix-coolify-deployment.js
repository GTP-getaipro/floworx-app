// Script to diagnose and fix Coolify deployment issues
require('dotenv').config();
const fs = require('fs');
const path = require('path');

console.log('🔧 COOLIFY DEPLOYMENT DIAGNOSTIC & FIX TOOL');
console.log('==========================================\n');

// 1. Check for database connection issues
console.log('📋 CHECKING DATABASE CONNECTION ISSUES:');
console.log('=====================================');

// Extract credentials from test.env
let testEnvCredentials = {};
if (fs.existsSync('./test.env')) {
  const testEnvContent = fs.readFileSync('./test.env', 'utf8');
  
  // Extract each variable
  const variables = [
    'DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME',
    'DATABASE_URL', 'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  variables.forEach(key => {
    const match = testEnvContent.match(new RegExp(`${key}=([^\\n]+)`));
    if (match && match[1]) {
      testEnvCredentials[key] = match[1];
    }
  });
  
  console.log('✅ Found test.env with credentials');
} else {
  console.log('❌ test.env not found');
}

// Check for KeyDB connection issues
console.log('\n📋 CHECKING KEYDB CONNECTION ISSUES:');
console.log('=================================');
console.log('From Coolify logs: ⚠️ KeyDB error: getaddrinfo EAI_AGAIN bgkgcogwgcksc0sccw48c8s0');

// Create a fix for the KeyDB connection issue
console.log('\n🔧 CREATING FIXES:');
console.log('===============');

// 1. Create a fix for the database connection
const dbFixContent = `
// Add this to your backend/database/unified-connection.js file

// Fix for Coolify database connection
getConnectionConfig() {
  // Check if we're in Coolify environment
  const isCoolify = process.env.COOLIFY === 'true';
  
  // For Coolify, prioritize individual connection parameters
  if (isCoolify) {
    console.log('🔍 Using Coolify database connection configuration');
    return {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '6543'),
      database: process.env.DB_NAME || 'postgres',
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false }
    };
  }
  
  // For other environments, try DATABASE_URL first
  if (process.env.DATABASE_URL) {
    console.log('🔍 Using DATABASE_URL for connection');
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    };
  }
  
  // Fallback to individual parameters
  console.log('🔍 Using individual database parameters for connection');
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false }
  };
}
`;

// 2. Create a fix for the KeyDB connection
const keydbFixContent = `
// Add this to your backend/services/cache-service.js or similar file

// Fix for Coolify KeyDB connection
initializeKeyDB() {
  try {
    // Get Redis URL from environment
    const redisUrl = process.env.REDIS_URL;
    
    if (!redisUrl) {
      console.log('⚠️ REDIS_URL not set, skipping KeyDB initialization');
      return null;
    }
    
    // Parse Redis URL to extract host
    const urlMatch = redisUrl.match(/redis:\/\/.*@([^:]+):/);
    if (!urlMatch || !urlMatch[1]) {
      console.log('⚠️ Could not parse Redis host from URL, using default');
      return this.createKeyDBClient(redisUrl);
    }
    
    const redisHost = urlMatch[1];
    
    // Check if we're in Coolify and the host looks like a Coolify internal hostname
    if (process.env.COOLIFY === 'true' && redisHost.includes('cog') && redisHost.includes('sc')) {
      console.log('⚠️ Detected Coolify internal Redis hostname, using IP address instead');
      
      // Replace the hostname with localhost or the container IP
      const fixedRedisUrl = redisUrl.replace(redisHost, '127.0.0.1');
      console.log('🔧 Modified Redis URL to use IP address');
      
      return this.createKeyDBClient(fixedRedisUrl);
    }
    
    // Use original URL
    return this.createKeyDBClient(redisUrl);
  } catch (error) {
    console.error('❌ KeyDB initialization error:', error.message);
    return null;
  }
}

// Helper method to create KeyDB client
createKeyDBClient(url) {
  try {
    const Redis = require('ioredis');
    const client = new Redis(url, {
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
      // Add error handling
      retryStrategy: (times) => {
        if (times > 3) {
          console.log('⚠️ KeyDB connection failed after 3 retries, giving up');
          return null;
        }
        return Math.min(times * 100, 3000);
      }
    });
    
    // Add event listeners
    client.on('error', (err) => {
      console.log('⚠️ KeyDB error:', err.message);
    });
    
    client.on('connect', () => {
      console.log('✅ KeyDB connected successfully');
    });
    
    return client;
  } catch (error) {
    console.error('❌ KeyDB client creation error:', error.message);
    return null;
  }
}
`;

// 3. Create a debug script for Coolify
const debugScriptContent = `
// Add this to your backend/server.js at the beginning

// Debug Coolify environment
console.log('🔍 COOLIFY ENVIRONMENT DEBUG:');
console.log('================================');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ SET' : '❌ NOT SET');
console.log('REDIS_URL:', process.env.REDIS_URL ? 'SET (' + process.env.REDIS_URL + ')' : '❌ NOT SET');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'SET' : '❌ NOT SET');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('PORT:', process.env.PORT);
console.log('================================');
console.log('');
`;

// 4. Create a Coolify environment variables file
const coolifyEnvContent = `
# Coolify Environment Variables
# Add these to your Coolify dashboard

# Mark as Coolify environment
COOLIFY=true

# Database Connection (Supabase)
DB_HOST=aws-1-ca-central-1.pooler.supabase.com
DB_PORT=6543
DB_USER=postgres.enamhufwobytrfydarsz
DB_PASSWORD=${testEnvCredentials.DB_PASSWORD || '<YOUR_DB_PASSWORD>'}
DB_NAME=postgres

# Supabase API
SUPABASE_URL=https://enamhufwobytrfydarsz.supabase.co
SUPABASE_ANON_KEY=${testEnvCredentials.SUPABASE_ANON_KEY || '<YOUR_ANON_KEY>'}
SUPABASE_SERVICE_ROLE_KEY=${testEnvCredentials.SUPABASE_SERVICE_ROLE_KEY || '<YOUR_SERVICE_ROLE_KEY>'}

# Environment
NODE_ENV=production
PORT=5001

# Optional: Alternative connection string format
# DATABASE_URL=postgresql://postgres.enamhufwobytrfydarsz:${testEnvCredentials.DB_PASSWORD || '<YOUR_DB_PASSWORD>'}@aws-1-ca-central-1.pooler.supabase.com:6543/postgres
`;

// Save the fix files
fs.writeFileSync('./db-connection-fix.js', dbFixContent.trim());
fs.writeFileSync('./keydb-connection-fix.js', keydbFixContent.trim());
fs.writeFileSync('./coolify-debug.js', debugScriptContent.trim());
fs.writeFileSync('./coolify.env', coolifyEnvContent.trim());

console.log('✅ Created db-connection-fix.js');
console.log('✅ Created keydb-connection-fix.js');
console.log('✅ Created coolify-debug.js');
console.log('✅ Created coolify.env with credentials');

// Create a comprehensive fix guide
const fixGuideContent = `# 🔧 COOLIFY DEPLOYMENT FIX GUIDE

## 🚨 Issues Identified:

1. **Database Connection Error**: \`ECONNREFUSED\` to Supabase
2. **KeyDB Connection Error**: \`getaddrinfo EAI_AGAIN bgkgcogwgcksc0sccw48c8s0\`
3. **Missing Environment Variables**: \`DATABASE_URL\` not set

## 🚀 Fix Steps:

### 1️⃣ Update Coolify Environment Variables

In Coolify dashboard:
1. Go to **app.floworx-iq** → **Configuration** → **Environment Variables**
2. Add/update these variables:

\`\`\`
COOLIFY=true
DB_HOST=aws-1-ca-central-1.pooler.supabase.com
DB_PORT=6543
DB_USER=postgres.enamhufwobytrfydarsz
DB_PASSWORD=${testEnvCredentials.DB_PASSWORD || '<YOUR_DB_PASSWORD>'}
DB_NAME=postgres
SUPABASE_URL=https://enamhufwobytrfydarsz.supabase.co
SUPABASE_ANON_KEY=${testEnvCredentials.SUPABASE_ANON_KEY || '<YOUR_ANON_KEY>'}
SUPABASE_SERVICE_ROLE_KEY=${testEnvCredentials.SUPABASE_SERVICE_ROLE_KEY || '<YOUR_SERVICE_ROLE_KEY>'}
NODE_ENV=production
PORT=5001
\`\`\`

### 2️⃣ Fix Database Connection Code

Modify \`backend/database/unified-connection.js\` to prioritize individual connection parameters:

\`\`\`javascript
${dbFixContent.trim()}
\`\`\`

### 3️⃣ Fix KeyDB Connection Code

Add this code to handle KeyDB connection issues:

\`\`\`javascript
${keydbFixContent.trim()}
\`\`\`

### 4️⃣ Add Debug Logging

Add this to the beginning of \`backend/server.js\`:

\`\`\`javascript
${debugScriptContent.trim()}
\`\`\`

### 5️⃣ Redeploy in Coolify

1. Save all changes
2. Push to your repository
3. In Coolify dashboard, click **Redeploy**
4. Monitor logs for successful connection

## 🔍 Expected Success Logs:

After fixing, you should see:
\`\`\`
✅ Database connection established
🔗 New database connection established
✅ KeyDB connected successfully
\`\`\`

## 🚨 If Still Failing:

1. Check if Redis service is running in Coolify
2. Try setting \`REDIS_URL\` to \`redis://127.0.0.1:6379\`
3. Check network connectivity between containers
4. Review Coolify logs for any new errors
`;

fs.writeFileSync('./COOLIFY_FIX_GUIDE.md', fixGuideContent);
console.log('✅ Created COOLIFY_FIX_GUIDE.md with comprehensive instructions');

console.log('\n🚀 NEXT STEPS:');
console.log('1. Review the fix files and guide');
console.log('2. Apply the fixes to your codebase');
console.log('3. Update Coolify environment variables using coolify.env');
console.log('4. Redeploy your application in Coolify');
console.log('5. Monitor logs for successful connection');
