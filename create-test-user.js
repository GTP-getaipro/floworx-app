
const { query } = require('./backend/database/unified-connection');
const bcrypt = require('bcryptjs');

async function createTestUser() {
  console.log('Creating test user...');
  
  try {
    // Check if user already exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', ['test.user@floworx-iq.com']);
    
    if (existingUser.rows.length > 0) {
      console.log('✅ Test user already exists');
      return existingUser.rows[0].id;
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash('TestPassword123!', 12);
    
    // Create user
    const result = await query(
      `INSERT INTO users (email, password_hash, first_name, last_name, email_verified, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       RETURNING id`,
      ['test.user@floworx-iq.com', passwordHash, 'Test', 'User', true]
    );
    
    console.log('✅ Test user created successfully');
    return result.rows[0].id;
    
  } catch (error) {
    console.error('❌ Failed to create test user:', error.message);
    throw error;
  }
}

if (require.main === module) {
  require('dotenv').config();
  createTestUser().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { createTestUser };
