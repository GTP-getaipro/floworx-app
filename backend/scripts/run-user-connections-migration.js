const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runUserConnectionsMigration() {
  let client;
  try {
    console.log('Connecting directly to PostgreSQL for migration...');

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    client = await pool.connect();

    console.log('Reading user_connections migration...');
    const migrationPath = path.join(__dirname, '../db/migrations/004_user_connections.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running user_connections migration...');
    await client.query(sql);

    console.log('✅ User connections migration completed successfully');

    client.release();
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    if (client) client.release();
    process.exit(1);
  }
}

runUserConnectionsMigration();
