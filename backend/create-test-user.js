const bcrypt = require('bcrypt');
const { initDb, query, closeDb } = require('./database/unified-connection');

async function createTestUser() {
  try {
    console.log('👤 Creating test user...');
    await initDb();
    
    const email = 'test@floworx-test.com';
    const password = 'TestPass123!';
    const firstName = 'Test';
    const lastName = 'User';
    const businessName = 'Test Business';
    
    // Check if user already exists
    const existingUser = await query('SELECT id, email FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      console.log('⚠️ Test user already exists:', existingUser.rows[0]);
      await closeDb();
      return;
    }
    
    // Hash the password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Create the user
    const result = await query(`
      INSERT INTO users (
        email, 
        password_hash, 
        first_name, 
        last_name, 
        business_name, 
        email_verified, 
        created_at, 
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING id, email, first_name, last_name, business_name, email_verified
    `, [email, passwordHash, firstName, lastName, businessName, true]);
    
    console.log('✅ Test user created successfully:');
    console.log('   ID:', result.rows[0].id);
    console.log('   Email:', result.rows[0].email);
    console.log('   Name:', `${result.rows[0].first_name} ${result.rows[0].last_name}`);
    console.log('   Business:', result.rows[0].business_name);
    console.log('   Email Verified:', result.rows[0].email_verified);
    console.log('   Password:', password);
    
    await closeDb();
    console.log('✅ Test user creation completed');
  } catch (error) {
    console.error('❌ Test user creation failed:', error.message);
    console.error('Full error:', error);
  }
}

createTestUser();
