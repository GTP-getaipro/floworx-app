#!/usr/bin/env node

/**
 * DNS Resolution Debugging Script
 * Helps diagnose IPv6 vs IPv4 connection issues
 */

const dns = require('dns');
const { promisify } = require('util');
const net = require('net');

const lookup = promisify(dns.lookup);
const resolve4 = promisify(dns.resolve4);
const resolve6 = promisify(dns.resolve6);

async function debugDNSResolution() {
  console.log('🔍 DNS RESOLUTION DEBUGGING');
  console.log('================================');
  
  const hostnames = [
    'db.enamhufwobytrfydarsz.supabase.co',
    'aws-1-ca-central-1.pooler.supabase.com',
    'enamhufwobytrfydarsz.supabase.co'
  ];

  for (const hostname of hostnames) {
    console.log(`\n🌐 Testing hostname: ${hostname}`);
    console.log('-----------------------------------');

    try {
      // Default lookup (can return IPv4 or IPv6)
      console.log('📍 Default DNS lookup:');
      const defaultResult = await lookup(hostname);
      console.log(`   Address: ${defaultResult.address}`);
      console.log(`   Family: IPv${defaultResult.family}`);

      // Force IPv4 lookup
      console.log('📍 IPv4 lookup:');
      try {
        const ipv4Result = await lookup(hostname, { family: 4 });
        console.log(`   IPv4 Address: ${ipv4Result.address}`);
        
        // Test IPv4 connection
        const ipv4Reachable = await testConnection(ipv4Result.address, 5432);
        console.log(`   IPv4 Port 5432 reachable: ${ipv4Reachable ? '✅' : '❌'}`);
        
        const ipv4Reachable6543 = await testConnection(ipv4Result.address, 6543);
        console.log(`   IPv4 Port 6543 reachable: ${ipv4Reachable6543 ? '✅' : '❌'}`);
      } catch (ipv4Error) {
        console.log(`   IPv4 Error: ${ipv4Error.message}`);
      }

      // Force IPv6 lookup
      console.log('📍 IPv6 lookup:');
      try {
        const ipv6Result = await lookup(hostname, { family: 6 });
        console.log(`   IPv6 Address: ${ipv6Result.address}`);
        
        // Test IPv6 connection
        const ipv6Reachable = await testConnection(ipv6Result.address, 5432);
        console.log(`   IPv6 Port 5432 reachable: ${ipv6Reachable ? '✅' : '❌'}`);
        
        const ipv6Reachable6543 = await testConnection(ipv6Result.address, 6543);
        console.log(`   IPv6 Port 6543 reachable: ${ipv6Reachable6543 ? '✅' : '❌'}`);
      } catch (ipv6Error) {
        console.log(`   IPv6 Error: ${ipv6Error.message}`);
      }

      // Resolve A records (IPv4)
      console.log('📍 A Records (IPv4):');
      try {
        const aRecords = await resolve4(hostname);
        console.log(`   A Records: ${aRecords.join(', ')}`);
      } catch (aError) {
        console.log(`   A Records Error: ${aError.message}`);
      }

      // Resolve AAAA records (IPv6)
      console.log('📍 AAAA Records (IPv6):');
      try {
        const aaaaRecords = await resolve6(hostname);
        console.log(`   AAAA Records: ${aaaaRecords.join(', ')}`);
      } catch (aaaaError) {
        console.log(`   AAAA Records Error: ${aaaaError.message}`);
      }

    } catch (error) {
      console.error(`❌ DNS lookup failed for ${hostname}:`, error.message);
    }
  }

  // Test DATABASE_URL parsing
  console.log('\n🔍 DATABASE_URL PARSING');
  console.log('================================');
  
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    try {
      const url = new URL(databaseUrl);
      console.log(`Protocol: ${url.protocol}`);
      console.log(`Hostname: ${url.hostname}`);
      console.log(`Port: ${url.port}`);
      console.log(`Database: ${url.pathname.substring(1)}`);
      console.log(`Username: ${url.username}`);
      
      // Test the hostname from DATABASE_URL
      console.log(`\n🌐 Testing DATABASE_URL hostname: ${url.hostname}`);
      const dbHostResult = await lookup(url.hostname);
      console.log(`   Resolved to: ${dbHostResult.address} (IPv${dbHostResult.family})`);
      
      // Test connection to the resolved address
      const port = url.port || 5432;
      const reachable = await testConnection(dbHostResult.address, port);
      console.log(`   Port ${port} reachable: ${reachable ? '✅' : '❌'}`);
      
    } catch (parseError) {
      console.error('❌ Failed to parse DATABASE_URL:', parseError.message);
    }
  } else {
    console.log('❌ DATABASE_URL not set');
  }

  // Environment variables summary
  console.log('\n🔍 ENVIRONMENT VARIABLES');
  console.log('================================');
  console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? 'SET' : 'NOT SET'}`);
  console.log(`DB_HOST: ${process.env.DB_HOST || 'NOT SET'}`);
  console.log(`DB_PORT: ${process.env.DB_PORT || 'NOT SET'}`);
  console.log(`NODE_OPTIONS: ${process.env.NODE_OPTIONS || 'NOT SET'}`);
}

function testConnection(address, port, timeout = 5000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    
    const timer = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, timeout);
    
    socket.on('connect', () => {
      clearTimeout(timer);
      socket.destroy();
      resolve(true);
    });
    
    socket.on('error', () => {
      clearTimeout(timer);
      resolve(false);
    });
    
    socket.connect(port, address);
  });
}

// Run the diagnostic
debugDNSResolution().catch(console.error);
