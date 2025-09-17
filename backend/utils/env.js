/**
 * Environment Variable Validator
 * Validates required environment variables on application boot
 * - Development/Test: Throws error if missing (fail-fast)
 * - Production: Logs warning and continues (fail-open)
 */

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

// Track validation status for health checks
let envValidationStatus = {
  valid: true,
  missing: [],
  warnings: []
};

/**
 * Required environment variables by category
 */
const REQUIRED_ENVS = {
  // Always required
  database: [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ],
  
  // Optional in test environment
  cache: [
    ...(isTest ? [] : ['KEYDB_URL'])
  ],
  
  // Required for authentication (if using JWT)
  auth: [
    'JWT_SECRET'
  ],
  
  // Required for encryption
  security: [
    'ENCRYPTION_KEY'
  ]
};

/**
 * Validate a single environment variable
 */
function validateEnv(envName, category) {
  const value = process.env[envName];
  
  if (!value || value.trim() === '') {
    const error = `Missing required environment variable: ${envName} (${category})`;
    
    envValidationStatus.missing.push({ name: envName, category });
    
    if (isProduction) {
      // Production: Log warning and continue
      console.warn(`⚠️ ${error}`);
      envValidationStatus.warnings.push(error);
      return false;
    } else {
      // Development/Test: Throw error
      throw new Error(`❌ ${error}\n   Set ${envName} in your .env file or environment`);
    }
  }
  
  return true;
}

/**
 * Validate all required environment variables
 */
function validateEnvironment() {
  console.log('🔍 Validating environment variables...');
  
  let allValid = true;
  const categories = Object.keys(REQUIRED_ENVS);
  
  for (const category of categories) {
    const envVars = REQUIRED_ENVS[category];
    
    for (const envName of envVars) {
      const isValid = validateEnv(envName, category);
      if (!isValid) {
        allValid = false;
      }
    }
  }
  
  envValidationStatus.valid = allValid;
  
  if (allValid) {
    console.log('✅ All required environment variables are present');
  } else if (isProduction) {
    console.warn(`⚠️ Environment validation completed with ${envValidationStatus.missing.length} missing variables (production mode - continuing)`);
  }
  
  return envValidationStatus;
}

/**
 * Get current environment validation status
 */
function getEnvStatus() {
  return {
    valid: envValidationStatus.valid,
    missing: envValidationStatus.missing.length,
    warnings: envValidationStatus.warnings.length,
    mode: isProduction ? 'production' : (isTest ? 'test' : 'development')
  };
}

/**
 * Get database connection status for health checks
 */
function getDbStatus() {
  const hasSupabaseUrl = !!process.env.SUPABASE_URL;
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const hasDatabaseUrl = !!process.env.DATABASE_URL;
  
  if (hasSupabaseUrl && hasServiceKey) {
    return 'rest';
  } else if (hasDatabaseUrl) {
    return 'postgres';
  } else {
    return 'unconfigured';
  }
}

module.exports = {
  validateEnvironment,
  getEnvStatus,
  getDbStatus,
  REQUIRED_ENVS
};
