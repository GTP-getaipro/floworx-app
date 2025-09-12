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