// Simple script to get verification token
const { query } = require('./database/unified-connection');

async function getToken() {
  try {
    const result = await query(`
      SELECT token FROM email_verification_tokens 
      WHERE email = 'fixed.verification@example.com'
      ORDER BY created_at DESC LIMIT 1;
    `);
    
    if (result.rows.length > 0) {
      console.log(result.rows[0].token);
    } else {
      console.log('NO_TOKEN_FOUND');
    }
    
  } catch (error) {
    console.log('ERROR:', error.message);
  }
  
  process.exit(0);
}

getToken();
