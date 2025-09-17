#!/usr/bin/env node

/**
 * DNS Resolution Debugging Script
 * Helps diagnose IPv6 vs IPv4 connection issues
 */

const dns = require('dns');
const { promisify } = require('util');
const net = require('net');
const { URL } = require('url');

const lookup = promisify(dns.lookup);
const resolve4 = promisify(dns.resolve4);
const resolve6 = promisify(dns.resolve6);

async function debugDNSResolution() {
  );
  );

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
      );
      const dbHostResult = await lookup(url.hostname);
      console.log(`   Resolved to: ${dbHostResult.address} (IPv${dbHostResult.family})`);

      // Test connection to the resolved address
      const port = url.port || 5432;
      const reachable = await testConnection(dbHostResult.address, port);
      console.log(`   Port ${port} reachable: ${reachable ? '✅' : '❌'}`);
    } catch (parseError) {
      , parseError.message);
    }
  } else {
    );
  }

  // Environment variables summary
  );
  console.log('================================');
  );
  );
  );
  );
}

function testConnection(address, port, timeout = 5000) {
  return new Promise(resolve => {
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
