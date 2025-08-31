const fs = require('fs');
const path = require('path');
require('dotenv').config();

/**
 * Validate Floworx Environment Configuration
 * Checks all required environment variables and their formats
 */

function validateEnvironment() {
  console.log('🔍 Validating Floworx Environment Configuration...\n');

  const results = {
    required: [],
    optional: [],
    warnings: [],
    errors: []
  };

  // Required environment variables
  const requiredVars = {
    // Database
    'DB_HOST': { 
      value: process.env.DB_HOST,
      validator: (val) => val && val.includes('supabase.com'),
      description: 'Supabase database host'
    },
    'DB_PORT': { 
      value: process.env.DB_PORT,
      validator: (val) => val === '6543',
      description: 'Supabase transaction pooler port'
    },
    'DB_NAME': { 
      value: process.env.DB_NAME,
      validator: (val) => val === 'postgres',
      description: 'Database name'
    },
    'DB_USER': { 
      value: process.env.DB_USER,
      validator: (val) => val && val.startsWith('postgres.'),
      description: 'Supabase database user'
    },
    'DB_PASSWORD': { 
      value: process.env.DB_PASSWORD,
      validator: (val) => val && val.length > 8,
      description: 'Database password'
    },

    // Security
    'JWT_SECRET': { 
      value: process.env.JWT_SECRET,
      validator: (val) => val && val.length >= 64,
      description: 'JWT signing secret (min 64 chars)'
    },
    'ENCRYPTION_KEY': { 
      value: process.env.ENCRYPTION_KEY,
      validator: (val) => val && val.length >= 32,
      description: 'Encryption key for OAuth tokens (32+ chars)'
    },

    // Google OAuth
    'GOOGLE_CLIENT_ID': { 
      value: process.env.GOOGLE_CLIENT_ID,
      validator: (val) => val && val.includes('googleusercontent.com'),
      description: 'Google OAuth client ID'
    },
    'GOOGLE_CLIENT_SECRET': { 
      value: process.env.GOOGLE_CLIENT_SECRET,
      validator: (val) => val && val.startsWith('GOCSPX-'),
      description: 'Google OAuth client secret'
    },
    'GOOGLE_REDIRECT_URI': { 
      value: process.env.GOOGLE_REDIRECT_URI,
      validator: (val) => val && val.includes('/api/oauth/google/callback'),
      description: 'Google OAuth redirect URI'
    },

    // Server
    'NODE_ENV': { 
      value: process.env.NODE_ENV,
      validator: (val) => ['development', 'production', 'test'].includes(val),
      description: 'Node environment'
    },
    'FRONTEND_URL': { 
      value: process.env.FRONTEND_URL,
      validator: (val) => val && (val.startsWith('http://') || val.startsWith('https://')),
      description: 'Frontend URL for CORS'
    }
  };

  // Optional but recommended variables
  const optionalVars = {
    'SUPABASE_URL': { 
      value: process.env.SUPABASE_URL,
      validator: (val) => !val || val.includes('supabase.co'),
      description: 'Supabase project URL'
    },
    'SUPABASE_ANON_KEY': { 
      value: process.env.SUPABASE_ANON_KEY,
      validator: (val) => !val || val.startsWith('eyJ'),
      description: 'Supabase anonymous key'
    },
    'N8N_WEBHOOK_URL': { 
      value: process.env.N8N_WEBHOOK_URL,
      validator: (val) => !val || val.startsWith('http'),
      description: 'n8n webhook URL'
    },
    'SMTP_HOST': { 
      value: process.env.SMTP_HOST,
      validator: (val) => !val || val.includes('.'),
      description: 'SMTP server host'
    },
    'FROM_EMAIL': { 
      value: process.env.FROM_EMAIL,
      validator: (val) => !val || val.includes('@'),
      description: 'From email address'
    }
  };

  // Validate required variables
  console.log('1. Checking required environment variables...');
  for (const [key, config] of Object.entries(requiredVars)) {
    const isValid = config.validator(config.value);
    const status = config.value ? (isValid ? '✅' : '⚠️') : '❌';
    
    console.log(`   ${status} ${key}: ${config.description}`);
    
    if (!config.value) {
      results.errors.push(`Missing required variable: ${key}`);
    } else if (!isValid) {
      results.warnings.push(`Invalid format for ${key}: ${config.description}`);
    } else {
      results.required.push(key);
    }
  }

  console.log('');

  // Validate optional variables
  console.log('2. Checking optional environment variables...');
  for (const [key, config] of Object.entries(optionalVars)) {
    const isValid = config.validator(config.value);
    const status = config.value ? (isValid ? '✅' : '⚠️') : '⚪';
    
    console.log(`   ${status} ${key}: ${config.description}`);
    
    if (config.value && !isValid) {
      results.warnings.push(`Invalid format for ${key}: ${config.description}`);
    } else if (config.value) {
      results.optional.push(key);
    }
  }

  console.log('');

  // Environment-specific checks
  console.log('3. Environment-specific validation...');
  
  if (process.env.NODE_ENV === 'production') {
    // Production checks
    if (process.env.GOOGLE_REDIRECT_URI && process.env.GOOGLE_REDIRECT_URI.includes('localhost')) {
      results.errors.push('Production environment using localhost OAuth redirect URI');
      console.log('   ❌ OAuth redirect URI should not use localhost in production');
    } else {
      console.log('   ✅ OAuth redirect URI appropriate for production');
    }

    if (process.env.FRONTEND_URL && process.env.FRONTEND_URL.includes('localhost')) {
      results.errors.push('Production environment using localhost frontend URL');
      console.log('   ❌ Frontend URL should not use localhost in production');
    } else {
      console.log('   ✅ Frontend URL appropriate for production');
    }

    if (!process.env.SUPABASE_ANON_KEY) {
      results.warnings.push('Missing Supabase anon key in production');
      console.log('   ⚠️  Supabase anon key recommended for production');
    }
  } else {
    console.log('   ✅ Development environment configuration');
  }

  console.log('');

  // Security checks
  console.log('4. Security validation...');
  
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 128) {
    results.warnings.push('JWT secret should be at least 128 characters for maximum security');
    console.log('   ⚠️  JWT secret could be longer (recommended: 128+ chars)');
  } else {
    console.log('   ✅ JWT secret length is secure');
  }

  if (process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length !== 32) {
    results.warnings.push('Encryption key should be exactly 32 characters for AES-256');
    console.log('   ⚠️  Encryption key should be exactly 32 characters');
  } else {
    console.log('   ✅ Encryption key length is correct');
  }

  console.log('');

  // File checks
  console.log('5. Configuration file validation...');
  
  const envFile = path.join(process.cwd(), 'backend', '.env');
  const envProdFile = path.join(process.cwd(), 'backend', '.env.production');
  
  if (fs.existsSync(envFile)) {
    console.log('   ✅ Development .env file exists');
  } else {
    console.log('   ❌ Development .env file missing');
    results.errors.push('Missing backend/.env file');
  }

  if (fs.existsSync(envProdFile)) {
    console.log('   ✅ Production .env.production file exists');
  } else {
    console.log('   ⚠️  Production .env.production file missing');
    results.warnings.push('Missing backend/.env.production file');
  }

  console.log('');

  // Summary
  console.log('📊 Validation Summary:');
  console.log(`   Required variables: ${results.required.length}/${Object.keys(requiredVars).length} configured`);
  console.log(`   Optional variables: ${results.optional.length}/${Object.keys(optionalVars).length} configured`);
  console.log(`   Warnings: ${results.warnings.length}`);
  console.log(`   Errors: ${results.errors.length}`);
  console.log('');

  if (results.errors.length > 0) {
    console.log('❌ Critical Issues:');
    results.errors.forEach(error => console.log(`   - ${error}`));
    console.log('');
  }

  if (results.warnings.length > 0) {
    console.log('⚠️  Warnings:');
    results.warnings.forEach(warning => console.log(`   - ${warning}`));
    console.log('');
  }

  if (results.errors.length === 0 && results.warnings.length === 0) {
    console.log('🎉 Environment configuration is complete and valid!');
  } else if (results.errors.length === 0) {
    console.log('✅ Environment configuration is functional with minor warnings');
  } else {
    console.log('❌ Environment configuration has critical issues that must be resolved');
  }

  console.log('');
  console.log('📖 For detailed setup instructions, see: ENVIRONMENT_SETUP_GUIDE.md');

  return {
    isValid: results.errors.length === 0,
    hasWarnings: results.warnings.length > 0,
    results
  };
}

// Run validation if called directly
if (require.main === module) {
  const validation = validateEnvironment();
  process.exit(validation.isValid ? 0 : 1);
}

module.exports = { validateEnvironment };
