const { query } = require('./backend/database/unified-connection');
const bcryptjs = require('bcryptjs');

async function createVerifiedUser() {
  try {
    const email = 'verified.test@example.com';
    const passwordHash = await bcryptjs.hash('TestPass123!', 12);
    
    // Delete existing user if exists
    await query('DELETE FROM users WHERE email = $1', [email]);
    
    // Create verified user
    const result = await query(`
      INSERT INTO users (email, password_hash, first_name, last_name, company_name, email_verified, created_at, updated_at) 
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
      RETURNING id, email
    `, [email, passwordHash, 'Verified', 'Test', 'Test Company', true]);
    
    console.log('✅ Created verified user:', result.rows[0]);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createVerifiedUser();
