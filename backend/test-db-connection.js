const { initDb, query } = require('./database/unified-connection');

async function testConnection() {
  try {
    console.log('Testing database connection...');
    await initDb();

    const result = await query('SELECT version()');
    console.log('✅ Database connection successful:', result.rows[0].version);

    // Check if users table exists
    const tableCheck = await query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')");
    console.log('✅ Users table exists:', tableCheck.rows[0].exists);

    // Check if client_config table exists
    const configCheck = await query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'client_config')");
    console.log('✅ Client config table exists:', configCheck.rows[0].exists);

    // Check if mailbox_mappings table exists
    const mailboxCheck = await query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'mailbox_mappings')");
    console.log('✅ Mailbox mappings table exists:', mailboxCheck.rows[0].exists);

    // Check if there are any users
    if (tableCheck.rows[0].exists) {
      const userCount = await query("SELECT COUNT(*) FROM users");
      console.log('✅ Total users in database:', userCount.rows[0].count);

      // Check for test user
      const testUser = await query("SELECT email, email_verified FROM users WHERE email = 'test@floworx-test.com' LIMIT 1");
      if (testUser.rows.length > 0) {
        console.log('✅ Test user found:', testUser.rows[0]);
      } else {
        console.log('⚠️ Test user not found');
      }
    }

    const { closeDb } = require('./database/unified-connection');
    await closeDb();
    console.log('✅ Database connection test completed');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Full error:', error);
  }
}

testConnection();
