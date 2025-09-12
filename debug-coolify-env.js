// Debug script to check environment variables in Coolify
// Add this temporarily to your app to see what env vars are available

console.log('🔍 COOLIFY ENVIRONMENT VARIABLES DEBUG');
console.log('=====================================\n');

console.log('📋 Database Connection Variables:');
console.log('================================');
console.log('DB_HOST:', process.env.DB_HOST || '❌ NOT SET');
console.log('DB_PORT:', process.env.DB_PORT || '❌ NOT SET');
console.log('DB_USER:', process.env.DB_USER || '❌ NOT SET');
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? `✅ SET (${process.env.DB_PASSWORD.length} chars)` : '❌ NOT SET');
console.log('DB_NAME:', process.env.DB_NAME || '❌ NOT SET');

console.log('\n📋 Supabase Variables:');
console.log('======================');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL || '❌ NOT SET');
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? `✅ SET (${process.env.SUPABASE_ANON_KEY.length} chars)` : '❌ NOT SET');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? `✅ SET (${process.env.SUPABASE_SERVICE_ROLE_KEY.length} chars)` : '❌ NOT SET');

console.log('\n📋 Alternative Connection Variables:');
console.log('===================================');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? `✅ SET (${process.env.DATABASE_URL.length} chars)` : '❌ NOT SET');

console.log('\n📋 Environment Info:');
console.log('===================');
console.log('NODE_ENV:', process.env.NODE_ENV || '❌ NOT SET');
console.log('PORT:', process.env.PORT || '❌ NOT SET');

console.log('\n🔍 Connection String Analysis:');
console.log('=============================');

// Check what connection would be attempted
const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
};

console.log('Current connection attempt would be:');
console.log(`Host: ${dbConfig.host || 'localhost (DEFAULT - WRONG!)'}`);
console.log(`Port: ${dbConfig.port}`);
console.log(`Database: ${dbConfig.database || 'undefined'}`);
console.log(`User: ${dbConfig.user || 'undefined'}`);

if (!dbConfig.host || dbConfig.host === 'localhost' || dbConfig.host === '127.0.0.1') {
  console.log('\n❌ PROBLEM IDENTIFIED:');
  console.log('   DB_HOST is not set or pointing to localhost');
  console.log('   This is why you\'re getting ECONNREFUSED 127.0.0.1:5432');
  console.log('\n🔧 SOLUTION:');
  console.log('   Set DB_HOST=aws-1-ca-central-1.pooler.supabase.com in Coolify');
}

console.log('\n📝 All Environment Variables (first 50):');
console.log('=========================================');
const envVars = Object.keys(process.env).slice(0, 50);
envVars.forEach(key => {
  const value = process.env[key];
  if (key.includes('PASSWORD') || key.includes('KEY') || key.includes('SECRET')) {
    console.log(`${key}: ✅ SET (${value.length} chars) [HIDDEN]`);
  } else {
    console.log(`${key}: ${value}`);
  }
});

if (Object.keys(process.env).length > 50) {
  console.log(`... and ${Object.keys(process.env).length - 50} more variables`);
}

console.log('\n🎯 NEXT STEPS:');
console.log('=============');
console.log('1. Check Coolify Dashboard → Configuration → Environment Variables');
console.log('2. Ensure DB_HOST is set to: aws-1-ca-central-1.pooler.supabase.com');
console.log('3. Ensure DB_PORT is set to: 6543');
console.log('4. Redeploy the application');
console.log('5. Check logs for successful connection');

// Exit after logging (don't start the server)
process.exit(0);
