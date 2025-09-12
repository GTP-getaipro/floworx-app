// Script to test Supabase credentials from test.env file
require('dotenv').config({ path: './test.env' });
const { execSync } = require('child_process');

console.log('🔍 TESTING SUPABASE CREDENTIALS FROM test.env');
console.log('============================================\n');

// Display environment variables (without sensitive values)
console.log('📋 Environment Variables Loaded:');
console.log('DB_HOST:', process.env.DB_HOST || '❌ NOT SET');
console.log('DB_PORT:', process.env.DB_PORT || '❌ NOT SET');
console.log('DB_USER:', process.env.DB_USER || '❌ NOT SET');
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '✅ SET (hidden)' : '❌ NOT SET');
console.log('DB_NAME:', process.env.DB_NAME || '❌ NOT SET');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ SET (hidden)' : '❌ NOT SET');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL || '❌ NOT SET');
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅ SET (hidden)' : '❌ NOT SET');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ SET (hidden)' : '❌ NOT SET');
console.log('NODE_ENV:', process.env.NODE_ENV || '❌ NOT SET');

console.log('\n🧪 Running test-env-supabase.js with test.env variables...\n');

try {
  // Run the test script with our environment variables
  execSync('node test-env-supabase.js', { 
    env: process.env,
    stdio: 'inherit' 
  });
  console.log('\n✅ Test completed successfully');
} catch (error) {
  console.error('\n❌ Test failed:', error.message);
  process.exit(1);
}
