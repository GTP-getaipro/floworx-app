// List all tokens
const { query } = require('./database/unified-connection');

async function listTokens() {
  try {
    const result = await query(`
      SELECT 
        email, 
        token, 
        expires_at, 
        created_at,
        (expires_at > CURRENT_TIMESTAMP) as is_valid
      FROM email_verification_tokens 
      ORDER BY created_at DESC;
    `);
    
    console.log('All verification tokens:');
    if (result.rows.length === 0) {
      console.log('  No tokens found');
    } else {
      result.rows.forEach((row, index) => {
        console.log(`  ${index + 1}. ${row.email}`);
        console.log(`     Token: ${row.token.substring(0, 20)}...`);
        console.log(`     Created: ${row.created_at}`);
        console.log(`     Expires: ${row.expires_at}`);
        console.log(`     Valid: ${row.is_valid}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.log('ERROR:', error.message);
  }
  
  process.exit(0);
}

listTokens();
