#!/usr/bin/env node

/**
 * Debug User JWT Token Issues
 * Investigates JWT token and user ID mismatches
 */

require('dotenv').config();
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

console.log('🔍 JWT TOKEN DEBUG');
console.log('==================\n');

// Test JWT token from our auth flow test
const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI5ZjQzNzE4Ni1hNzE4LTQ5YzMtOTJhNi1hNzE4NDljMzkyYTYiLCJlbWFpbCI6InRlc3QtMTc1Njg4MzI3MDMyN0BmbG93b3J4LXRlc3QuY29tIiwiaWF0IjoxNzU2ODgzMjcwLCJleHAiOjE3NTY5Njk2NzB9.example'; // This would be from the actual test

async function debugJWTAndUser() {
  try {
    console.log('🔑 JWT Token Analysis:');
    
    // For this debug, let's create a test scenario
    console.log('Creating test scenario...\n');
    
    // Connect to database
    const pool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false }
    });

    const client = await pool.connect();
    
    // Check recent users
    console.log('📋 Recent Users in Database:');
    const recentUsers = await client.query(`
      SELECT id, email, first_name, last_name, created_at 
      FROM users 
      WHERE created_at > NOW() - INTERVAL '1 hour'
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    if (recentUsers.rows.length > 0) {
      recentUsers.rows.forEach((user, index) => {
        console.log(`   ${index + 1}. ID: ${user.id}`);
        console.log(`      Email: ${user.email}`);
        console.log(`      Name: ${user.first_name} ${user.last_name}`);
        console.log(`      Created: ${user.created_at}`);
        console.log('');
      });
    } else {
      console.log('   No recent users found');
    }
    
    // Test JWT creation and verification
    console.log('🔧 JWT Creation Test:');
    
    if (recentUsers.rows.length > 0) {
      const testUser = recentUsers.rows[0];
      
      // Create a JWT token like the API does
      const testJWT = jwt.sign(
        { userId: testUser.id, email: testUser.email },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      console.log(`   Created JWT for user: ${testUser.email}`);
      console.log(`   JWT length: ${testJWT.length} characters`);
      
      // Verify the JWT
      try {
        const decoded = jwt.verify(testJWT, process.env.JWT_SECRET);
        console.log(`   ✅ JWT verification successful`);
        console.log(`   Decoded userId: ${decoded.userId}`);
        console.log(`   Decoded email: ${decoded.email}`);
        console.log(`   Original userId: ${testUser.id}`);
        console.log(`   IDs match: ${decoded.userId === testUser.id ? '✅ YES' : '❌ NO'}`);
        
        // Test database lookup with decoded userId
        console.log('\n🔍 Database Lookup Test:');
        const lookupResult = await client.query(
          'SELECT id, email, first_name, last_name FROM users WHERE id = $1',
          [decoded.userId]
        );
        
        if (lookupResult.rows.length > 0) {
          console.log('   ✅ User found in database');
          console.log(`   Found user: ${lookupResult.rows[0].email}`);
        } else {
          console.log('   ❌ User NOT found in database');
        }
        
      } catch (jwtError) {
        console.log(`   ❌ JWT verification failed: ${jwtError.message}`);
      }
    }
    
    // Check for any UUID format issues
    console.log('\n🔍 UUID Format Check:');
    const uuidCheck = await client.query(`
      SELECT id, email, 
             length(id::text) as id_length,
             id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' as valid_uuid
      FROM users 
      WHERE created_at > NOW() - INTERVAL '1 hour'
      ORDER BY created_at DESC 
      LIMIT 3
    `);
    
    if (uuidCheck.rows.length > 0) {
      uuidCheck.rows.forEach((user, index) => {
        console.log(`   User ${index + 1}:`);
        console.log(`     Email: ${user.email}`);
        console.log(`     ID Length: ${user.id_length}`);
        console.log(`     Valid UUID: ${user.valid_uuid ? '✅ YES' : '❌ NO'}`);
        console.log(`     ID: ${user.id}`);
        console.log('');
      });
    }
    
    client.release();
    await pool.end();
    
    console.log('✅ JWT Debug completed successfully');
    
  } catch (error) {
    console.error('❌ JWT Debug failed:', error.message);
  }
}

// Run the debug
debugJWTAndUser().catch(console.error);
