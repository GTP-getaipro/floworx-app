#!/usr/bin/env node

/**
 * Simple Database Connection Test
 * Tests direct connection to Supabase database
 */

const { Client } = require('pg');

console.log('🔍 SUPABASE DATABASE CONNECTION TEST');
console.log('====================================\n');

// Test connection with different configurations
async function testConnection() {
  const connectionConfigs = [
    {
      name: 'Direct Connection (Port 5432)',
      config: {
        host: 'db.enamhufwobytrfydarsz.supabase.co',
        port: 5432,
        database: 'postgres',
        user: 'postgres.enamhufwobytrfydarsz',
        password: process.env.DB_PASSWORD || 'Te5CnY3...', // Use actual password
        ssl: { rejectUnauthorized: false }
      }
    },
    {
      name: 'Pooler Connection (Port 6543)',
      config: {
        host: 'aws-1-ca-central-1.pooler.supabase.com',
        port: 6543,
        database: 'postgres',
        user: 'postgres.enamhufwobytrfydarsz',
        password: process.env.DB_PASSWORD || 'Te5CnY3...', // Use actual password
        ssl: { rejectUnauthorized: false }
      }
    },
    {
      name: 'Session Pooler (Port 5432)',
      config: {
        host: 'aws-1-ca-central-1.pooler.supabase.com',
        port: 5432,
        database: 'postgres',
        user: 'postgres.enamhufwobytrfydarsz',
        password: process.env.DB_PASSWORD || 'Te5CnY3...', // Use actual password
        ssl: { rejectUnauthorized: false }
      }
    }
  ];

  for (const { name, config } of connectionConfigs) {
    console.log(`🔍 Testing: ${name}`);
    console.log(`   Host: ${config.host}:${config.port}`);
    
    const client = new Client(config);
    
    try {
      console.log('   🔄 Connecting...');
      await client.connect();
      
      console.log('   ✅ Connection successful!');
      
      // Test a simple query
      const result = await client.query('SELECT version()');
      console.log(`   📊 PostgreSQL Version: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}`);
      
      // Test table access
      try {
        const tableResult = await client.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          LIMIT 5
        `);
        console.log(`   📋 Found ${tableResult.rows.length} public tables`);
        tableResult.rows.forEach(row => {
          console.log(`      • ${row.table_name}`);
        });
      } catch (tableError) {
        console.log(`   ⚠️ Table query failed: ${tableError.message}`);
      }
      
      await client.end();
      console.log('   ✅ Connection closed successfully\n');
      
      return { success: true, config: name };
      
    } catch (error) {
      console.log(`   ❌ Connection failed: ${error.message}`);
      console.log(`   🔍 Error Code: ${error.code}`);
      console.log(`   🔍 Error Details: ${error.detail || 'No additional details'}\n`);
      
      try {
        await client.end();
      } catch (endError) {
        // Ignore cleanup errors
      }
    }
  }
  
  return { success: false };
}

async function testNetworkConnectivity() {
  console.log('🌐 NETWORK CONNECTIVITY TEST');
  console.log('============================\n');
  
  const net = require('net');
  const dns = require('dns');
  const util = require('util');
  
  const lookup = util.promisify(dns.lookup);
  
  const hosts = [
    { host: 'db.enamhufwobytrfydarsz.supabase.co', port: 5432 },
    { host: 'aws-1-ca-central-1.pooler.supabase.com', port: 5432 },
    { host: 'aws-1-ca-central-1.pooler.supabase.com', port: 6543 }
  ];
  
  for (const { host, port } of hosts) {
    console.log(`🔍 Testing ${host}:${port}`);
    
    try {
      // DNS resolution
      const dnsResult = await lookup(host);
      console.log(`   ✅ DNS resolved: ${dnsResult.address}`);
      
      // TCP connection test
      const tcpResult = await new Promise((resolve) => {
        const socket = new net.Socket();
        const timeout = setTimeout(() => {
          socket.destroy();
          resolve({ success: false, error: 'Connection timeout' });
        }, 5000);
        
        socket.connect(port, host, () => {
          clearTimeout(timeout);
          socket.destroy();
          resolve({ success: true });
        });
        
        socket.on('error', (error) => {
          clearTimeout(timeout);
          resolve({ success: false, error: error.message });
        });
      });
      
      if (tcpResult.success) {
        console.log(`   ✅ TCP connection successful`);
      } else {
        console.log(`   ❌ TCP connection failed: ${tcpResult.error}`);
      }
      
    } catch (error) {
      console.log(`   ❌ DNS resolution failed: ${error.message}`);
    }
    
    console.log('');
  }
}

async function main() {
  try {
    await testNetworkConnectivity();
    const result = await testConnection();
    
    if (result.success) {
      console.log('🎉 SUCCESS!');
      console.log(`✅ Working configuration: ${result.config}`);
      console.log('✅ Database is accessible from this environment');
    } else {
      console.log('❌ ALL CONNECTION ATTEMPTS FAILED');
      console.log('');
      console.log('🔍 POSSIBLE CAUSES:');
      console.log('• Supabase project is paused or inactive');
      console.log('• Network firewall blocking database connections');
      console.log('• Incorrect credentials');
      console.log('• Supabase service outage');
      console.log('');
      console.log('🎯 NEXT STEPS:');
      console.log('1. Check Supabase Dashboard for project status');
      console.log('2. Verify credentials are correct');
      console.log('3. Contact Coolify support about database connectivity');
      console.log('4. Check Supabase status page');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

main();
