// Get latest token for specific email
const { query } = require('./database/unified-connection');

async function getLatestToken() {
  try {
    const result = await query(`
      SELECT 
        email, 
        token, 
        expires_at, 
        created_at,
        (expires_at > CURRENT_TIMESTAMP) as is_valid
      FROM email_verification_tokens 
      WHERE email = 'fixed.verification@example.com'
      ORDER BY created_at DESC 
      LIMIT 1;
    `);
    
    if (result.rows.length > 0) {
      const tokenData = result.rows[0];
      console.log('Latest token for fixed.verification@example.com:');
      console.log('  Email:', tokenData.email);
      console.log('  Token:', tokenData.token);
      console.log('  Created:', tokenData.created_at);
      console.log('  Expires:', tokenData.expires_at);
      console.log('  Valid:', tokenData.is_valid);
      
      // Generate verification URL
      console.log('');
      console.log('Verification URL:');
      console.log(`http://localhost:3000/verify-email?token=${tokenData.token}`);
      
    } else {
      console.log('No token found for fixed.verification@example.com');
    }
    
  } catch (error) {
    console.log('ERROR:', error.message);
  }
  
  process.exit(0);
}

getLatestToken();
