// Check token details
const { query } = require('./database/unified-connection');

async function checkToken() {
  try {
    const token = 'e9125129c5e11e38aacc231b95010ece867109a0dd0ee346a228f370ed8655dd';
    
    const result = await query(`
      SELECT 
        token, 
        email, 
        expires_at, 
        created_at,
        CURRENT_TIMESTAMP as now,
        (expires_at > CURRENT_TIMESTAMP) as is_valid
      FROM email_verification_tokens 
      WHERE token = $1;
    `, [token]);
    
    if (result.rows.length > 0) {
      const tokenData = result.rows[0];
      console.log('Token found:');
      console.log('  Email:', tokenData.email);
      console.log('  Created:', tokenData.created_at);
      console.log('  Expires:', tokenData.expires_at);
      console.log('  Current time:', tokenData.now);
      console.log('  Is valid:', tokenData.is_valid);
    } else {
      console.log('Token not found in database');
    }
    
  } catch (error) {
    console.log('ERROR:', error.message);
  }
  
  process.exit(0);
}

checkToken();
