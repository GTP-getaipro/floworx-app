# 🔧 COOLIFY DEPLOYMENT FIX GUIDE

## 🚨 Issues Identified:

1. **Database Connection Error**: `ECONNREFUSED` to Supabase
2. **KeyDB Connection Error**: `getaddrinfo EAI_AGAIN bgkgcogwgcksc0sccw48c8s0`
3. **Missing Environment Variables**: `DATABASE_URL` not set

## 🚀 Fix Steps:

### 1️⃣ Update Coolify Environment Variables

In Coolify dashboard:
1. Go to **app.floworx-iq** → **Configuration** → **Environment Variables**
2. Add/update these variables:

```
COOLIFY=true
DB_HOST=aws-1-ca-central-1.pooler.supabase.com
DB_PORT=6543
DB_USER=postgres.enamhufwobytrfydarsz
DB_PASSWORD=-U9xNc*qP&zyRc4
DB_NAME=postgres
SUPABASE_URL=https://enamhufwobytrfydarsz.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVuYW1odWZ3b2J5dHJmeWRhcnN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NDkyMDUsImV4cCI6MjA3MjUyNTIwNX0.9TQ163xUnnE2F0Q2zfO4kovfkBIk63p1FldrvjcHwSo
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVuYW1odWZ3b2J5dHJmeWRhcnN6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njk0OTIwNSwiZXhwIjoyMDcyNTI1MjA1fQ.NVI17sMDYvb4ZqNG6ucQ_VdO6QqiElllFeC16GLTyE4
NODE_ENV=production
PORT=5001
```

### 2️⃣ Fix Database Connection Code

Modify `backend/database/unified-connection.js` to prioritize individual connection parameters:

```javascript
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
```

### 3️⃣ Fix KeyDB Connection Code

Add this code to handle KeyDB connection issues:

```javascript
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
    const urlMatch = redisUrl.match(/redis://.*@([^:]+):/);
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
```

### 4️⃣ Add Debug Logging

Add this to the beginning of `backend/server.js`:

```javascript
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
```

### 5️⃣ Redeploy in Coolify

1. Save all changes
2. Push to your repository
3. In Coolify dashboard, click **Redeploy**
4. Monitor logs for successful connection

## 🔍 Expected Success Logs:

After fixing, you should see:
```
✅ Database connection established
🔗 New database connection established
✅ KeyDB connected successfully
```

## 🚨 If Still Failing:

1. Check if Redis service is running in Coolify
2. Try setting `REDIS_URL` to `redis://127.0.0.1:6379`
3. Check network connectivity between containers
4. Review Coolify logs for any new errors
