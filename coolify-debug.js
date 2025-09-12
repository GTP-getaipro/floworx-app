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