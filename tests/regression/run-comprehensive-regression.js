#!/usr/bin/env node

/**
 * FLOWORX COMPREHENSIVE REGRESSION TEST RUNNER
 * 
 * Runs the complete test suite including:
 * - API Regression Tests
 * - Frontend Component Tests
 * - Database Integrity Tests
 * - Security Vulnerability Tests
 * - Performance & Load Tests
 * - Code Quality Tests
 * - Deployment Readiness Tests
 */

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

// Configuration
const CONFIG = {
  serverUrl: 'http://localhost:5001',
  frontendUrl: 'http://localhost:3000',
  healthEndpoint: '/api/health',
  serverStartTimeout: 30000,
  serverCheckInterval: 1000,
  keepServerRunning: process.argv.includes('--keep-server'),
  verbose: process.argv.includes('--verbose'),
  skipFrontend: process.argv.includes('--skip-frontend'),
  skipSecurity: process.argv.includes('--skip-security'),
  skipPerformance: process.argv.includes('--skip-performance'),
  skipQuality: process.argv.includes('--skip-quality'),
  skipDeployment: process.argv.includes('--skip-deployment')
};

let backendProcess = null;
let frontendProcess = null;

/**
 * Utility Functions
 */
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '📋',
    success: '✅',
    warning: '⚠️',
    error: '❌',
    debug: '🔍'
  }[level] || 'ℹ️';
  
  console.log(`${prefix} ${message}`);
  
  if (CONFIG.verbose && level === 'debug') {
    console.log(`   [${timestamp}] ${message}`);
  }
}

/**
 * Check if service is running
 */
async function checkService(url, timeout = 5000) {
  return new Promise((resolve) => {
    const request = http.get(url, (res) => {
      resolve(res.statusCode === 200);
    });
    
    request.on('error', () => resolve(false));
    request.setTimeout(timeout, () => {
      request.destroy();
      resolve(false);
    });
  });
}

/**
 * Wait for service to be ready
 */
async function waitForService(url, name, timeout = 30000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await checkService(url)) {
      log(`${name} is ready!`, 'success');
      return true;
    }
    
    await new Promise(resolve => setTimeout(resolve, CONFIG.serverCheckInterval));
  }
  
  return false;
}

/**
 * Start backend server
 */
async function startBackendServer() {
  log('Starting backend server...');
  
  return new Promise((resolve, reject) => {
    backendProcess = spawn('npm', ['run', 'dev'], {
      cwd: path.join(process.cwd(), 'backend'),
      stdio: CONFIG.verbose ? 'inherit' : 'pipe',
      shell: true
    });
    
    backendProcess.on('error', (error) => {
      log(`Failed to start backend server: ${error.message}`, 'error');
      reject(error);
    });
    
    // Give the server time to start
    setTimeout(async () => {
      const isReady = await waitForService(CONFIG.serverUrl + CONFIG.healthEndpoint, 'Backend server');
      if (isReady) {
        resolve();
      } else {
        reject(new Error('Backend server failed to start within timeout'));
      }
    }, 2000);
  });
}

/**
 * Start frontend server (optional)
 */
async function startFrontendServer() {
  if (CONFIG.skipFrontend) {
    log('Skipping frontend server startup', 'debug');
    return;
  }
  
  log('Starting frontend server...');
  
  return new Promise((resolve, reject) => {
    frontendProcess = spawn('npm', ['start'], {
      cwd: path.join(process.cwd(), 'frontend'),
      stdio: CONFIG.verbose ? 'inherit' : 'pipe',
      shell: true,
      env: { ...process.env, BROWSER: 'none' }
    });
    
    frontendProcess.on('error', (error) => {
      log(`Failed to start frontend server: ${error.message}`, 'warning');
      resolve(); // Don't fail if frontend doesn't start
    });
    
    // Give the frontend time to start
    setTimeout(async () => {
      const isReady = await waitForService(CONFIG.frontendUrl, 'Frontend server');
      if (isReady) {
        log('Frontend server is ready!', 'success');
      } else {
        log('Frontend server not ready, some tests may be skipped', 'warning');
      }
      resolve();
    }, 5000);
  });
}

/**
 * Stop servers
 */
function stopServers() {
  if (CONFIG.keepServerRunning) {
    log('Keeping servers running as requested', 'debug');
    return;
  }
  
  log('Stopping servers...');
  
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
  
  if (frontendProcess) {
    frontendProcess.kill();
    frontendProcess = null;
  }
}

/**
 * Run comprehensive regression tests
 */
async function runComprehensiveTests() {
  try {
    // Import and run the comprehensive test suite
    const { runComprehensiveTests } = require('./comprehensive-regression-suite');
    
    const results = await runComprehensiveTests();
    
    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('🎯 COMPREHENSIVE REGRESSION TEST SUMMARY');
    console.log('='.repeat(80));
    
    const successRate = ((results.passedTests / results.totalTests) * 100).toFixed(1);
    
    if (results && results.failedTests === 0) {
      log('🎉 ALL COMPREHENSIVE TESTS PASSED!', 'success');
      log('✨ No regressions detected - Application is stable and ready!', 'success');
    } else {
      log('⚠️  SOME COMPREHENSIVE TESTS FAILED!', 'warning');
      log('🔧 Please fix the failing tests before deployment.', 'warning');
    }

    console.log(`📊 Success Rate: ${successRate}%`);
    console.log(`📈 Total Tests: ${results ? results.totalTests : 0}`);
    console.log(`✅ Passed: ${results ? results.passedTests : 0}`);
    console.log(`❌ Failed: ${results ? results.failedTests : 0}`);
    console.log(`⏭️  Skipped: ${results ? results.skippedTests : 0}`);

    if (results && results.errors && results.errors.length > 0) {
      console.log('\n❌ Failed Tests:');
      results.errors.forEach(error => {
        console.log(`   - [${error.category}] ${error.test}: ${error.error}`);
      });
    }

    return results && results.failedTests === 0;
    
  } catch (error) {
    log(`💥 Comprehensive testing failed: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 FLOWORX COMPREHENSIVE REGRESSION TEST RUNNER');
  console.log('='.repeat(60));
  console.log(`📍 Server URL: ${CONFIG.serverUrl}`);
  console.log(`📍 Frontend URL: ${CONFIG.frontendUrl}`);
  console.log(`⏱️  Timeout: ${CONFIG.serverStartTimeout / 1000}s`);
  console.log(`🔧 Keep Server: ${CONFIG.keepServerRunning ? 'Yes' : 'No'}`);
  console.log(`📝 Verbose: ${CONFIG.verbose ? 'Yes' : 'No'}`);
  console.log(`🎨 Skip Frontend: ${CONFIG.skipFrontend ? 'Yes' : 'No'}`);
  console.log(`🔒 Skip Security: ${CONFIG.skipSecurity ? 'Yes' : 'No'}`);
  console.log(`⚡ Skip Performance: ${CONFIG.skipPerformance ? 'Yes' : 'No'}`);
  console.log(`📝 Skip Quality: ${CONFIG.skipQuality ? 'Yes' : 'No'}`);
  console.log(`🚀 Skip Deployment: ${CONFIG.skipDeployment ? 'Yes' : 'No'}`);
  console.log('');
  
  let success = false;
  
  try {
    // Check if backend server is already running
    log('Checking if backend server is running...');
    const backendRunning = await checkService(CONFIG.serverUrl + CONFIG.healthEndpoint);
    
    if (!backendRunning) {
      await startBackendServer();
    } else {
      log('Backend server is already running!', 'success');
    }
    
    // Start frontend server if needed
    if (!CONFIG.skipFrontend) {
      const frontendRunning = await checkService(CONFIG.frontendUrl);
      if (!frontendRunning) {
        await startFrontendServer();
      } else {
        log('Frontend server is already running!', 'success');
      }
    }
    
    // Run comprehensive regression tests
    log('Running comprehensive regression test suite...');
    success = await runComprehensiveTests();
    
  } catch (error) {
    log(`💥 Test runner failed: ${error.message}`, 'error');
    success = false;
  } finally {
    stopServers();
  }
  
  // Exit with appropriate code
  if (success) {
    log('🎯 Comprehensive regression testing completed successfully!', 'success');
    process.exit(0);
  } else {
    log('⚠️  Some comprehensive regression tests failed.', 'warning');
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  log('Received SIGINT, stopping servers...', 'debug');
  stopServers();
  process.exit(1);
});

process.on('SIGTERM', () => {
  log('Received SIGTERM, stopping servers...', 'debug');
  stopServers();
  process.exit(1);
});

// Run the main function
if (require.main === module) {
  main().catch(error => {
    log(`💥 Unhandled error: ${error.message}`, 'error');
    stopServers();
    process.exit(1);
  });
}

module.exports = {
  main,
  CONFIG
};
