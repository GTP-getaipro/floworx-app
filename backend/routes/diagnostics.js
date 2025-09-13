const express = require('express');
const { Client } = require('pg');
const router = express.Router();

// Database connection diagnostic endpoint
router.get('/database-test', async (req, res) => {
  const results = {
    timestamp: new Date().toISOString(),
    environment: {
      DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
      NODE_ENV: process.env.NODE_ENV,
      container: process.env.HOSTNAME || 'unknown'
    },
    tests: []
  };

  // Test configurations to try
  const testConfigs = [
    {
      name: 'Current DATABASE_URL (Pooler 5432)',
      connectionString: process.env.DATABASE_URL
    },
    {
      name: 'Direct Connection (db.* host)',
      connectionString: process.env.DATABASE_URL ? 
        process.env.DATABASE_URL.replace('aws-1-ca-central-1.pooler.supabase.com', 'db.enamhufwobytrfydarsz.supabase.co') : null
    },
    {
      name: 'Transaction Pooler (6543)',
      connectionString: process.env.DATABASE_URL ? 
        process.env.DATABASE_URL.replace(':5432/', ':6543/') : null
    }
  ];

  // Test each configuration
  for (const config of testConfigs) {
    const testResult = {
      name: config.name,
      success: false,
      error: null,
      details: null,
      duration: 0
    };

    if (!config.connectionString) {
      testResult.error = 'Connection string not available';
      results.tests.push(testResult);
      continue;
    }

    const startTime = Date.now();
    
    try {
      console.log(`🔍 Testing: ${config.name}`);
      
      const client = new Client({
        connectionString: config.connectionString,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000
      });

      await client.connect();
      console.log(`✅ ${config.name}: Connected successfully`);

      // Test basic query
      const result = await client.query('SELECT NOW() as now, version() as pg_version');
      
      testResult.success = true;
      testResult.details = {
        connected: true,
        query_result: result.rows[0],
        connection_info: {
          host: client.host,
          port: client.port,
          database: client.database,
          user: client.user
        }
      };

      await client.end();
      console.log(`✅ ${config.name}: Connection closed`);

    } catch (error) {
      console.log(`❌ ${config.name}: ${error.message}`);
      
      testResult.error = {
        message: error.message,
        code: error.code,
        errno: error.errno,
        syscall: error.syscall,
        address: error.address,
        port: error.port
      };
    }

    testResult.duration = Date.now() - startTime;
    results.tests.push(testResult);
  }

  // Network connectivity test
  const net = require('net');
  const networkTests = [
    { host: 'db.enamhufwobytrfydarsz.supabase.co', port: 5432 },
    { host: 'aws-1-ca-central-1.pooler.supabase.com', port: 5432 },
    { host: 'aws-1-ca-central-1.pooler.supabase.com', port: 6543 }
  ];

  results.network_tests = [];

  for (const { host, port } of networkTests) {
    const networkResult = {
      host,
      port,
      success: false,
      error: null,
      duration: 0
    };

    const startTime = Date.now();

    try {
      await new Promise((resolve, reject) => {
        const socket = new net.Socket();
        const timeout = setTimeout(() => {
          socket.destroy();
          reject(new Error('Connection timeout'));
        }, 5000);

        socket.connect(port, host, () => {
          clearTimeout(timeout);
          socket.destroy();
          resolve();
        });

        socket.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      networkResult.success = true;
      console.log(`✅ Network test ${host}:${port}: Success`);

    } catch (error) {
      networkResult.error = {
        message: error.message,
        code: error.code
      };
      console.log(`❌ Network test ${host}:${port}: ${error.message}`);
    }

    networkResult.duration = Date.now() - startTime;
    results.network_tests.push(networkResult);
  }

  // Summary
  const successfulTests = results.tests.filter(t => t.success).length;
  const successfulNetworkTests = results.network_tests.filter(t => t.success).length;

  results.summary = {
    database_tests: {
      total: results.tests.length,
      successful: successfulTests,
      failed: results.tests.length - successfulTests
    },
    network_tests: {
      total: results.network_tests.length,
      successful: successfulNetworkTests,
      failed: results.network_tests.length - successfulNetworkTests
    },
    overall_status: successfulTests > 0 ? 'PARTIAL_SUCCESS' : 'ALL_FAILED',
    recommendation: successfulTests > 0 ? 
      'At least one connection method works - update DATABASE_URL to use working configuration' :
      'All connections failed - contact Coolify support about network connectivity to Supabase'
  };

  res.json(results);
});

// Simple ping endpoint
router.get('/ping', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    container: process.env.HOSTNAME || 'unknown'
  });
});

module.exports = router;
