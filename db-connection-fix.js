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