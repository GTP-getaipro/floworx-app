const { query } = require('./backend/database/unified-connection');

async function fixDatabaseSchema() {
  try {
    console.log('🔧 Fixing database schema...');
    
    // Add last_login column if it doesn't exist
    await query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE
    `);
    
    console.log('✅ Added last_login column to users table');
    
    // Update existing users to have a default last_login value
    await query(`
      UPDATE users 
      SET last_login = created_at 
      WHERE last_login IS NULL
    `);
    
    console.log('✅ Updated existing users with default last_login values');
    
    console.log('🎉 Database schema fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing database schema:', error.message);
    process.exit(1);
  }
}

fixDatabaseSchema();
