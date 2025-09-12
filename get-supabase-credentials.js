// Script to help get the correct Supabase credentials
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 SUPABASE CREDENTIALS HELPER');
console.log('=============================\n');

// Check for existing credentials in various files
const envFiles = [
  '.env',
  'backend/.env',
  'frontend/.env',
  '.env.production',
  'backend/.env.production',
  '.env.test'
];

console.log('📋 Checking for existing credentials in env files...');

let foundCredentials = {
  SUPABASE_URL: null,
  SUPABASE_ANON_KEY: null,
  SUPABASE_SERVICE_ROLE_KEY: null,
  DB_HOST: null,
  DB_PORT: null,
  DB_USER: null,
  DB_PASSWORD: null,
  DB_NAME: null,
  DATABASE_URL: null
};

// Function to extract credentials from env file content
function extractCredentials(content) {
  const credentials = {};
  
  // Extract each variable
  Object.keys(foundCredentials).forEach(key => {
    const match = content.match(new RegExp(`${key}=["']?([^"'\n]+)["']?`));
    if (match && match[1]) {
      credentials[key] = match[1];
    }
  });
  
  return credentials;
}

// Check each env file
envFiles.forEach(envFile => {
  const filePath = path.join(process.cwd(), envFile);
  
  if (fs.existsSync(filePath)) {
    console.log(`✅ Found ${envFile}`);
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const credentials = extractCredentials(content);
      
      // Update found credentials
      Object.keys(credentials).forEach(key => {
        if (credentials[key] && !foundCredentials[key]) {
          foundCredentials[key] = credentials[key];
          console.log(`   Found ${key} in ${envFile}`);
        }
      });
    } catch (error) {
      console.log(`   ❌ Error reading ${envFile}: ${error.message}`);
    }
  } else {
    console.log(`❌ ${envFile} not found`);
  }
});

console.log('\n📊 CREDENTIALS SUMMARY:');
console.log('=====================');

// Display found credentials
Object.keys(foundCredentials).forEach(key => {
  if (foundCredentials[key]) {
    if (key.includes('PASSWORD') || key.includes('KEY')) {
      console.log(`✅ ${key}: Found (${foundCredentials[key].length} characters)`);
    } else {
      console.log(`✅ ${key}: ${foundCredentials[key]}`);
    }
  } else {
    console.log(`❌ ${key}: Not found`);
  }
});

// Create updated test.env file with found credentials
console.log('\n📝 Creating updated test.env file with found credentials...');

const testEnvContent = `
# Database Connection (Supabase)
DB_HOST=${foundCredentials.DB_HOST || 'aws-1-ca-central-1.pooler.supabase.com'}
DB_PORT=${foundCredentials.DB_PORT || '6543'}
DB_USER=${foundCredentials.DB_USER || 'postgres.enamhufwobytrfydarsz'}
DB_PASSWORD=${foundCredentials.DB_PASSWORD || '<NEEDS_UPDATE_FROM_SUPABASE_DASHBOARD>'}
DB_NAME=${foundCredentials.DB_NAME || 'postgres'}

# Alternative connection string format
DATABASE_URL=${foundCredentials.DATABASE_URL || `postgresql://${foundCredentials.DB_USER || 'postgres.enamhufwobytrfydarsz'}:${foundCredentials.DB_PASSWORD || '<NEEDS_UPDATE_FROM_SUPABASE_DASHBOARD>'}@${foundCredentials.DB_HOST || 'aws-1-ca-central-1.pooler.supabase.com'}:${foundCredentials.DB_PORT || '6543'}/${foundCredentials.DB_NAME || 'postgres'}`}

# Supabase API
SUPABASE_URL=${foundCredentials.SUPABASE_URL || 'https://enamhufwobytrfydarsz.supabase.co'}
SUPABASE_ANON_KEY=${foundCredentials.SUPABASE_ANON_KEY || '<NEEDS_UPDATE_FROM_SUPABASE_DASHBOARD>'}
SUPABASE_SERVICE_ROLE_KEY=${foundCredentials.SUPABASE_SERVICE_ROLE_KEY || '<NEEDS_UPDATE_FROM_SUPABASE_DASHBOARD>'}

# Environment
NODE_ENV=production
`;

fs.writeFileSync('test.env', testEnvContent.trim());
console.log('✅ Created test.env with best available credentials');

// Provide next steps
console.log('\n🚀 NEXT STEPS:');
console.log('1. Review test.env file for any missing credentials');
console.log('2. Get missing credentials from Supabase Dashboard');
console.log('3. Run: node run-test-env.js to test the credentials');
console.log('4. Update Coolify environment variables with working credentials');

// Try to open Supabase dashboard if available
console.log('\n🔍 Attempting to open Supabase Dashboard...');
try {
  if (fs.existsSync(path.join(process.cwd(), 'scripts/open-supabase-dashboard.js'))) {
    console.log('✅ Found open-supabase-dashboard.js script');
    console.log('   Running script to open Supabase Dashboard...');
    
    execSync('node scripts/open-supabase-dashboard.js', { stdio: 'inherit' });
  } else {
    console.log('❌ open-supabase-dashboard.js script not found');
    console.log('   Please manually go to: https://supabase.com/dashboard');
  }
} catch (error) {
  console.log(`❌ Error opening Supabase Dashboard: ${error.message}`);
  console.log('   Please manually go to: https://supabase.com/dashboard');
}
