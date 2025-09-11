const { query } = require('./backend/database/unified-connection');

async function verifyTestUser() {
  try {
    // Find the most recent test user
    const userResult = await query(
      'SELECT id, email FROM users WHERE email LIKE $1 ORDER BY created_at DESC LIMIT 1',
      ['test.comprehensive.%@example.com']
    );
    
    if (userResult.rows.length === 0) {
      console.log('❌ No test user found');
      return;
    }
    
    const user = userResult.rows[0];
    console.log('📧 Found test user:', user.email);
    
    // Verify their email
    await query(
      'UPDATE users SET email_verified = true WHERE id = $1',
      [user.id]
    );
    
    console.log('✅ Email verified for test user');
    
    // Also clean up old verification tokens
    await query(
      'DELETE FROM email_verification_tokens WHERE user_id = $1',
      [user.id]
    );
    
    console.log('🧹 Cleaned up verification tokens');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

verifyTestUser();
