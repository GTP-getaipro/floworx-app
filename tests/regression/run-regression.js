#!/usr/bin/env node

/**
 * FLOWORX REGRESSION TEST RUNNER
 * 
 * Automated test runner that:
 * 1. Checks if backend server is running
 * 2. Starts server if needed
 * 3. Runs comprehensive regression tests
 * 4. Reports results
 * 5. Optionally stops server if it was started by this script
 * 
 * Usage:
 *   npm run test:regression
 *   node tests/regression/run-regression.js
 *   node tests/regression/run-regression.js --keep-server
 */

const { spawn, exec } = require('child_process');
const http = require('http');
const path = require('path');

// Configuration
const CONFIG = {
  serverUrl: 'http://localhost:5001',
  healthEndpoint: '/api/health',
  serverStartTimeout: 30000, // 30 seconds
  serverCheckInterval: 1000,  // 1 second
  backendPath: path.join(__dirname, '../../backend'),
  keepServerRunning: process.argv.includes('--keep-server'),
  verbose: process.argv.includes('--verbose') || process.env.DEBUG === 'true'
};

let serverProcess = null;
let serverStartedByScript = false;

/**
 * Check if server is running
 */
function checkServerHealth() {
  return new Promise((resolve) => {
    const req = http.get(`${CONFIG.serverUrl}${CONFIG.healthEndpoint}`, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response.status === 'ok');
        } catch (e) {
          resolve(false);
        }
      });
    });
    
    req.on('error', () => resolve(false));
    req.setTimeout(5000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Start backend server
 */
function startServer() {
  return new Promise((resolve, reject) => {
    console.log('🚀 Starting backend server...');
    
    serverProcess = spawn('npm', ['start'], {
      cwd: CONFIG.backendPath,
      stdio: CONFIG.verbose ? 'inherit' : 'pipe',
      shell: true
    });

    serverProcess.on('error', (error) => {
      console.error('❌ Failed to start server:', error.message);
      reject(error);
    });

    // Wait for server to be ready
    const startTime = Date.now();
    const checkInterval = setInterval(async () => {
      const isHealthy = await checkServerHealth();
      
      if (isHealthy) {
        clearInterval(checkInterval);
        serverStartedByScript = true;
        console.log('✅ Backend server is ready!');
        resolve();
      } else if (Date.now() - startTime > CONFIG.serverStartTimeout) {
        clearInterval(checkInterval);
        console.error('❌ Server startup timeout');
        reject(new Error('Server startup timeout'));
      }
    }, CONFIG.serverCheckInterval);
  });
}

/**
 * Stop server if it was started by this script
 */
function stopServer() {
  return new Promise((resolve) => {
    if (serverProcess && serverStartedByScript && !CONFIG.keepServerRunning) {
      console.log('🛑 Stopping backend server...');
      serverProcess.kill('SIGTERM');
      
      setTimeout(() => {
        if (serverProcess && !serverProcess.killed) {
          serverProcess.kill('SIGKILL');
        }
        resolve();
      }, 5000);
    } else {
      resolve();
    }
  });
}

/**
 * Run regression tests
 */
function runRegressionTests() {
  return new Promise((resolve, reject) => {
    console.log('🧪 Running regression test suite...\n');
    
    const testProcess = spawn('node', ['tests/regression/api-regression-suite.js'], {
      stdio: 'inherit',
      shell: true
    });

    testProcess.on('close', (code) => {
      if (code === 0) {
        console.log('\n🎉 All regression tests passed!');
        resolve();
      } else {
        console.log('\n⚠️  Some regression tests failed.');
        reject(new Error(`Tests failed with exit code ${code}`));
      }
    });

    testProcess.on('error', (error) => {
      console.error('❌ Error running tests:', error);
      reject(error);
    });
  });
}

/**
 * Main execution flow
 */
async function main() {
  console.log('🚀 FLOWORX REGRESSION TEST RUNNER');
  console.log('=' .repeat(50));
  console.log(`📍 Server URL: ${CONFIG.serverUrl}`);
  console.log(`⏱️  Timeout: ${CONFIG.serverStartTimeout / 1000}s`);
  console.log(`🔧 Keep Server: ${CONFIG.keepServerRunning ? 'Yes' : 'No'}`);
  console.log(`📝 Verbose: ${CONFIG.verbose ? 'Yes' : 'No'}\n`);

  try {
    // Check if server is already running
    console.log('🔍 Checking if backend server is running...');
    const isServerRunning = await checkServerHealth();
    
    if (isServerRunning) {
      console.log('✅ Backend server is already running!');
    } else {
      console.log('⚠️  Backend server is not running');
      await startServer();
    }

    // Run regression tests
    await runRegressionTests();

    // Stop server if we started it
    await stopServer();

    console.log('\n🎯 Regression testing completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('\n💥 Regression testing failed:', error.message);
    
    // Cleanup: stop server if we started it
    await stopServer();
    
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, cleaning up...');
  await stopServer();
  process.exit(1);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, cleaning up...');
  await stopServer();
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  checkServerHealth,
  startServer,
  stopServer,
  runRegressionTests,
  main
};
