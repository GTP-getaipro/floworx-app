#!/usr/bin/env node

/**
 * Supabase Connectivity Diagnostic Tool
 * Diagnoses network connectivity issues between Coolify and Supabase
 */

const net = require('net');
const dns = require('dns');
const util = require('util');
const https = require('https');

console.log('🔍 SUPABASE CONNECTIVITY DIAGNOSTIC');
console.log('===================================\n');

// Load environment variables
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;
const SUPABASE_URL = process.env.SUPABASE_URL;

console.log('📋 CONFIGURATION CHECK:');
console.log('=======================');
console.log('DATABASE_URL:', DATABASE_URL ? 'SET' : 'NOT SET');
console.log('SUPABASE_URL:', SUPABASE_URL ? 'SET' : 'NOT SET');

if (DATABASE_URL) {
  try {
    const url = new URL(DATABASE_URL);
    console.log('✅ DATABASE_URL parsed successfully');
    console.log(`   Host: ${url.hostname}`);
    console.log(`   Port: ${url.port}`);
    console.log(`   Database: ${url.pathname.substring(1)}`);
    console.log(`   Username: ${url.username}`);
  } catch (error) {
    console.log('❌ DATABASE_URL parsing failed:', error.message);
  }
}

console.log('\n🌐 DNS RESOLUTION TEST:');
console.log('=======================');

const lookup = util.promisify(dns.lookup);
const resolve4 = util.promisify(dns.resolve4);

async function testDNS() {
  const hosts = [
    'aws-1-ca-central-1.pooler.supabase.com',
    'enamhufwobytrfydarsz.supabase.co',
    'db.enamhufwobytrfydarsz.supabase.co'
  ];

  for (const host of hosts) {
    try {
      console.log(`\n🔍 Testing ${host}:`);
      
      // Test basic lookup
      const result = await lookup(host);
      console.log(`   ✅ DNS lookup: ${result.address} (${result.family === 4 ? 'IPv4' : 'IPv6'})`);
      
      // Test IPv4 resolution
      try {
        const ipv4Addresses = await resolve4(host);
        console.log(`   ✅ IPv4 addresses: ${ipv4Addresses.join(', ')}`);
      } catch (ipv4Error) {
        console.log(`   ⚠️ IPv4 resolution failed: ${ipv4Error.message}`);
      }
      
    } catch (error) {
      console.log(`   ❌ DNS resolution failed: ${error.message}`);
    }
  }
}

console.log('\n🔌 TCP CONNECTION TEST:');
console.log('=======================');

function testTCPConnection(host, port, timeout = 10000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timer = setTimeout(() => {
      socket.destroy();
      resolve({ success: false, error: 'Connection timeout' });
    }, timeout);

    socket.connect(port, host, () => {
      clearTimeout(timer);
      socket.destroy();
      resolve({ success: true });
    });

    socket.on('error', (error) => {
      clearTimeout(timer);
      resolve({ success: false, error: error.message });
    });
  });
}

async function testConnections() {
  const connections = [
    { host: 'aws-1-ca-central-1.pooler.supabase.com', port: 6543, name: 'Supabase Pooler' },
    { host: 'db.enamhufwobytrfydarsz.supabase.co', port: 5432, name: 'Supabase Direct' },
    { host: 'enamhufwobytrfydarsz.supabase.co', port: 443, name: 'Supabase API (HTTPS)' }
  ];

  for (const conn of connections) {
    console.log(`\n🔍 Testing ${conn.name} (${conn.host}:${conn.port}):`);
    const result = await testTCPConnection(conn.host, conn.port);
    
    if (result.success) {
      console.log(`   ✅ Connection successful`);
    } else {
      console.log(`   ❌ Connection failed: ${result.error}`);
    }
  }
}

console.log('\n🔐 HTTPS API TEST:');
console.log('==================');

function testHTTPS(url) {
  return new Promise((resolve) => {
    const req = https.get(url, (res) => {
      resolve({ 
        success: true, 
        statusCode: res.statusCode, 
        headers: res.headers 
      });
    });

    req.on('error', (error) => {
      resolve({ success: false, error: error.message });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      resolve({ success: false, error: 'Request timeout' });
    });
  });
}

async function testAPIs() {
  const apis = [
    'https://enamhufwobytrfydarsz.supabase.co/rest/v1/',
    'https://enamhufwobytrfydarsz.supabase.co/auth/v1/health'
  ];

  for (const api of apis) {
    console.log(`\n🔍 Testing ${api}:`);
    const result = await testHTTPS(api);
    
    if (result.success) {
      console.log(`   ✅ HTTPS request successful (${result.statusCode})`);
    } else {
      console.log(`   ❌ HTTPS request failed: ${result.error}`);
    }
  }
}

console.log('\n🐳 CONTAINER ENVIRONMENT:');
console.log('=========================');

// Check if running in container
const fs = require('fs');
const isContainer = fs.existsSync('/.dockerenv') || 
                   (fs.existsSync('/proc/1/cgroup') && 
                    fs.readFileSync('/proc/1/cgroup', 'utf8').includes('docker'));

console.log('Container detected:', isContainer ? 'Yes' : 'No');

if (isContainer) {
  console.log('Container networking may have restrictions');
}

// Check network interfaces
const os = require('os');
const interfaces = os.networkInterfaces();
console.log('\nNetwork interfaces:');
Object.keys(interfaces).forEach(name => {
  const iface = interfaces[name];
  iface.forEach(details => {
    if (details.family === 'IPv4') {
      console.log(`   ${name}: ${details.address}`);
    }
  });
});

async function runDiagnostics() {
  try {
    await testDNS();
    await testConnections();
    await testAPIs();
    
    console.log('\n🎯 RECOMMENDATIONS:');
    console.log('===================');
    console.log('1. Check if Coolify server can reach external databases');
    console.log('2. Verify firewall rules allow outbound connections on port 6543');
    console.log('3. Consider using direct connection (port 5432) instead of pooler');
    console.log('4. Check if Supabase has IP restrictions enabled');
    console.log('5. Try connecting from Coolify server directly using psql');
    
    console.log('\n💡 ALTERNATIVE CONNECTION STRING:');
    console.log('=================================');
    console.log('Try using direct connection instead of pooler:');
    console.log('DATABASE_URL=postgresql://postgres.enamhufwobytrfydarsz:-U9xNc*qP&zyRc4@db.enamhufwobytrfydarsz.supabase.co:5432/postgres');
    
    console.log('\n✅ Diagnostic complete!');
  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
  }
}

runDiagnostics();
