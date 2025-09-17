const { createDbManager } = require('../database/unified-connection');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('Initializing PostgreSQL connection for migration...');

    // Force PostgreSQL connection for migrations
    const dbManager = createDbManager();
    dbManager.useRestApi = false; // Force PostgreSQL
    await dbManager.initialize();

    console.log('Reading migration file...');
    const migrationPath = path.join(__dirname, '../db/migrations/003_onboarding_states.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running migration...');
    await dbManager.query(sql);

    console.log('✅ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
