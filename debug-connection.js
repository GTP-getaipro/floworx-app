const { Pool } = require('pg');
require('dotenv').config({ path: './.env' });

console.log('=== DEBUGGING DATABASE CONNECTION ===');
console.log('Environment variables:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD length:', process.env.DB_PASSWORD ? process.env.DB_PASSWORD.length : 'NOT SET');

// Test different connection methods
async function testConnections() {
  console.log('\n=== TESTING CONNECTION METHODS ===');
  
  // Method 1: Individual parameters
  console.log('\n1. Testing with individual parameters...');
  const pool1 = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    const client1 = await pool1.connect();
    console.log('✅ Method 1 (individual params) - SUCCESS');
    client1.release();
    await pool1.end();
  } catch (error) {
    console.log('❌ Method 1 (individual params) - FAILED:', error.message);
    await pool1.end();
  }

  // Method 2: Connection string
  console.log('\n2. Testing with connection string...');
  const connectionString = `postgresql://${process.env.DB_USER}:${encodeURIComponent(process.env.DB_PASSWORD)}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;
  console.log('Connection string (password masked):', connectionString.replace(/:([^@]+)@/, ':***@'));
  
  const pool2 = new Pool({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    const client2 = await pool2.connect();
    console.log('✅ Method 2 (connection string) - SUCCESS');
    client2.release();
    await pool2.end();
  } catch (error) {
    console.log('❌ Method 2 (connection string) - FAILED:', error.message);
    await pool2.end();
  }

  // Method 3: Test hostname resolution
  console.log('\n3. Testing hostname resolution...');
  const dns = require('dns').promises;
  try {
    const addresses = await dns.lookup(process.env.DB_HOST);
    console.log('✅ Hostname resolves to:', addresses);
  } catch (error) {
    console.log('❌ Hostname resolution failed:', error.message);
    console.log('   This suggests the hostname is incorrect.');
    console.log('   Please verify your Supabase project URL in the dashboard.');
  }
}

testConnections().catch(console.error);
