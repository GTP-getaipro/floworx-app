// Fix missing unique constraint on email_verification_tokens table
const { query } = require('./database/unified-connection');

async function fixConstraint() {
  try {
    console.log('🔧 Fixing email_verification_tokens constraint...');
    
    // First, check if constraint already exists
    const existingConstraints = await query(`
      SELECT conname 
      FROM pg_constraint 
      WHERE conrelid = 'email_verification_tokens'::regclass 
      AND conname = 'unique_active_token_per_user';
    `);
    
    if (existingConstraints.rows.length > 0) {
      console.log('✅ Constraint already exists');
      return;
    }
    
    // Add the missing constraint
    await query(`
      ALTER TABLE email_verification_tokens 
      ADD CONSTRAINT unique_active_token_per_user UNIQUE(user_id, token);
    `);
    
    console.log('✅ Constraint added successfully');
    
    // Verify it was added
    const verification = await query(`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conrelid = 'email_verification_tokens'::regclass 
      AND conname = 'unique_active_token_per_user';
    `);
    
    if (verification.rows.length > 0) {
      console.log('✅ Constraint verified:', verification.rows[0].definition);
    }
    
  } catch (error) {
    console.error('❌ Error fixing constraint:', error.message);
    
    // If constraint already exists, that's fine
    if (error.message.includes('already exists')) {
      console.log('✅ Constraint already exists (that\'s good!)');
    } else {
      throw error;
    }
  }
}

fixConstraint()
  .then(() => {
    console.log('🎉 Constraint fix completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fix failed:', error);
    process.exit(1);
  });
