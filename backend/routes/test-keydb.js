const { execSync } = require('child_process');
const path = require('path');

const express = require('express');

const router = express.Router();

/**
 * Temporary endpoint to test KeyDB connection from deployed environment
 * DELETE THIS FILE after testing is complete
 */

router.get('/test-keydb', (req, res) => {
  try {
    console.log('🧪 Running KeyDB connection test...');

    // Run the KeyDB test script
    const testScript = path.join(__dirname, '..', '..', 'test-keydb-connection.js');
    const result = execSync(`node "${testScript}"`, {
      encoding: 'utf8',
      stdio: 'pipe',
      timeout: 30000
    });

    res.json({
      success: true,
      message: 'KeyDB test completed',
      output: result,
      environment: {
        REDIS_HOST: process.env.REDIS_HOST,
        REDIS_PORT: process.env.REDIS_PORT,
        REDIS_URL: process.env.REDIS_URL,
        NODE_ENV: process.env.NODE_ENV
      }
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: 'KeyDB test failed',
      error: error.message,
      stdout: error.stdout,
      stderr: error.stderr,
      environment: {
        REDIS_HOST: process.env.REDIS_HOST,
        REDIS_PORT: process.env.REDIS_PORT,
        REDIS_URL: process.env.REDIS_URL,
        NODE_ENV: process.env.NODE_ENV
      }
    });
  }
});

module.exports = router;
