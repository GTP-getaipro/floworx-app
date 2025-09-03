#!/usr/bin/env node

/**
 * Check if user exists in database
 */

require('dotenv').config();
const { Pool } = require('pg');

async function checkUser() {
  try {
    const pool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false }
    });

    const client = await pool.connect();
    
    // Check for the user we just created
    const result = await client.query(
      'SELECT id, email, first_name, last_name, created_at FROM users WHERE email = $1',
      ['dashboard-debug-1756883541157@floworx-test.com']
    );
    
    console.log('User lookup result:', result.rows.length > 0 ? 'FOUND' : 'NOT FOUND');
    if (result.rows.length > 0) {
      console.log('User details:', result.rows[0]);
    }
    
    // Also check recent users
    console.log('\nRecent users:');
    const recentResult = await client.query(
      'SELECT id, email, first_name, last_name, created_at FROM users WHERE created_at > NOW() - INTERVAL \'10 minutes\' ORDER BY created_at DESC LIMIT 5'
    );
    
    recentResult.rows.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.id}) - ${user.created_at}`);
    });
    
    client.release();
    await pool.end();
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkUser();
