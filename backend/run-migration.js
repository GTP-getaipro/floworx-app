const fs = require('fs');
const path = require('path');
const { initDb, query, closeDb } = require('./database/unified-connection');

async function runMigration() {
  try {
    console.log('🔄 Running mailbox mappings migration...');
    await initDb();

    // Read the migration file
    const migrationPath = path.join(__dirname, 'database/migrations/004_add_mailbox_mappings_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the entire migration as one statement to handle functions properly
    console.log('📝 Executing migration...');

    try {
      await query(migrationSQL);
      console.log('✅ Migration executed successfully');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('⚠️ Some objects already exist, continuing...');
      } else {
        throw error;
      }
    }

    // Verify the table was created
    const tableCheck = await query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'mailbox_mappings')");
    console.log('✅ Mailbox mappings table exists:', tableCheck.rows[0].exists);

    await closeDb();
    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
  }
}

runMigration();
