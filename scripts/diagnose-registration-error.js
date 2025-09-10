#!/usr/bin/env node

/**
 * Registration Error Diagnostic Script
 * Diagnoses the specific registration error and provides solutions
 */

const https = require('https');

async function diagnoseRegistrationError() {
  console.log('🔍 Diagnosing Registration Error...');
  console.log('=' .repeat(50));

  try {
    // Test 1: Check if API health is working
    console.log('\n1️⃣ Testing API Health...');
    const healthResponse = await makeRequest('https://app.floworx-iq.com/api/health');
    
    if (healthResponse.status === 200) {
      console.log('✅ API is responding');
      console.log(`   Environment: ${healthResponse.data.environment}`);
      console.log(`   Node Version: ${healthResponse.data.deployment?.nodeVersion}`);
    } else {
      console.log('❌ API health check failed');
      return;
    }

    // Test 2: Check database connectivity
    console.log('\n2️⃣ Testing Database Connectivity...');
    const dbResponse = await makeRequest('https://app.floworx-iq.com/api/health/db');
    
    if (dbResponse.status === 200) {
      console.log('✅ Database is connected');
      console.log(`   Status: ${dbResponse.data.status}`);
    } else {
      console.log('❌ Database connection failed');
      console.log(`   Status: ${dbResponse.status}`);
      return;
    }

    // Test 3: Test registration with minimal valid data
    console.log('\n3️⃣ Testing Registration Endpoint...');
    const registrationData = {
      firstName: 'Diagnostic',
      lastName: 'Test',
      businessName: 'Test Company',
      email: 'diagnostic-test@example.com',
      password: 'TestPassword123!',
      phone: '+1234567890',
      agreeToTerms: true,
      marketingConsent: false
    };

    const regResponse = await makePostRequest('https://app.floworx-iq.com/api/auth/register', registrationData);
    
    console.log(`   Status: ${regResponse.status}`);
    console.log(`   Response:`, regResponse.data);

    // Analyze the response
    if (regResponse.status === 201) {
      console.log('✅ Registration is working correctly!');
    } else if (regResponse.status === 400) {
      console.log('⚠️ Validation error - check required fields');
      if (regResponse.data.error && regResponse.data.error.details) {
        console.log('   Validation details:', regResponse.data.error.details);
      }
    } else if (regResponse.status === 409) {
      console.log('⚠️ User already exists (expected for test email)');
    } else if (regResponse.status === 429) {
      console.log('⚠️ Rate limited (too many attempts)');
    } else if (regResponse.status === 500) {
      console.log('❌ Server error - likely database schema issue');
      
      // Test 4: Check if it's a schema issue
      console.log('\n4️⃣ Checking Database Schema...');
      console.log('   The error is likely due to missing database table or columns');
      console.log('   Required table: users');
      console.log('   Required columns:');
      console.log('     - id (UUID, primary key)');
      console.log('     - email (VARCHAR, unique)');
      console.log('     - password_hash (VARCHAR)');
      console.log('     - first_name (VARCHAR)');
      console.log('     - last_name (VARCHAR)');
      console.log('     - company_name (VARCHAR, nullable)');
      console.log('     - trial_started_at (TIMESTAMP)');
      console.log('     - trial_ends_at (TIMESTAMP)');
      console.log('     - subscription_status (VARCHAR)');
      console.log('     - email_verified (BOOLEAN)');
      console.log('     - created_at (TIMESTAMP, default NOW())');
    }

    // Test 5: Check environment variables
    console.log('\n5️⃣ Environment Variables Check...');
    console.log('   Required environment variables in Coolify:');
    console.log('   ✓ NODE_ENV=production');
    console.log('   ✓ PORT=5001');
    console.log('   ✓ DATABASE_URL=postgresql://...');
    console.log('   ✓ JWT_SECRET=your_secret_key');
    console.log('   ✓ REDIS_URL=redis://...');
    console.log('   ✓ FRONTEND_URL=https://app.floworx-iq.com');

    // Provide solutions
    console.log('\n🔧 SOLUTIONS:');
    
    if (regResponse.status === 500) {
      console.log('\n📋 For 500 Server Error:');
      console.log('1. Check Coolify logs for specific error details');
      console.log('2. Verify database schema exists (users table)');
      console.log('3. Ensure all environment variables are set');
      console.log('4. Check JWT_SECRET is configured');
      console.log('5. Verify database permissions');
    }
    
    if (regResponse.status === 400) {
      console.log('\n📋 For 400 Validation Error:');
      console.log('1. Ensure frontend sends all required fields');
      console.log('2. Check field name matching (businessName vs companyName)');
      console.log('3. Verify phone field is included');
      console.log('4. Confirm agreeToTerms is true');
    }

    if (regResponse.status === 429) {
      console.log('\n📋 For 429 Rate Limit:');
      console.log('1. Wait 15 minutes for rate limit to reset');
      console.log('2. Use different email addresses for testing');
      console.log('3. Consider adjusting rate limits in production');
    }

  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
  }
}

async function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    https.get(url, { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            data: jsonData,
            responseTime
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data,
            responseTime
          });
        }
      });
    }).on('error', reject);
  });
}

async function makePostRequest(url, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = JSON.stringify(data);
    const startTime = Date.now();
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 10000
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        try {
          const jsonData = responseData ? JSON.parse(responseData) : {};
          resolve({
            status: res.statusCode,
            data: jsonData,
            responseTime
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: responseData,
            responseTime
          });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(postData);
    req.end();
  });
}

// Run the diagnostic
if (require.main === module) {
  diagnoseRegistrationError().catch(console.error);
}

module.exports = diagnoseRegistrationError;
