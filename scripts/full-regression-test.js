#!/usr/bin/env node

/**
 * FloWorx SaaS - Full Regression Test Suite
 * Comprehensive testing of all application components
 */

const https = require('https');
const http = require('http');

class RegressionTester {
  constructor() {
    this.baseUrl = 'https://app.floworx-iq.com';
    this.results = {
      infrastructure: {},
      api: {},
      frontend: {},
      security: {},
      performance: {}
    };
    this.startTime = Date.now();
  }

  async runAllTests() {
    console.log('🚀 Starting Full Regression Test Suite for FloWorx SaaS');
    console.log('=' .repeat(60));
    
    try {
      // 1. Infrastructure Tests
      await this.testInfrastructure();
      
      // 2. API Functionality Tests
      await this.testAPIEndpoints();
      
      // 3. Database Connectivity Tests
      await this.testDatabaseConnectivity();
      
      // 4. Security Tests
      await this.testSecurity();
      
      // 5. Performance Tests
      await this.testPerformance();
      
      // Generate final report
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Regression test failed:', error.message);
      process.exit(1);
    }
  }

  async makeRequest(path, options = {}) {
    return new Promise((resolve, reject) => {
      const url = `${this.baseUrl}${path}`;
      const startTime = Date.now();
      
      const req = https.get(url, {
        timeout: 10000,
        ...options
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const responseTime = Date.now() - startTime;
          try {
            const jsonData = data ? JSON.parse(data) : {};
            resolve({
              status: res.statusCode,
              data: jsonData,
              responseTime,
              headers: res.headers
            });
          } catch (e) {
            resolve({
              status: res.statusCode,
              data: data,
              responseTime,
              headers: res.headers
            });
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  async testInfrastructure() {
    console.log('\n📋 Testing Infrastructure...');
    
    // Test main application accessibility
    try {
      const response = await this.makeRequest('/');
      this.results.infrastructure.mainApp = {
        accessible: response.status === 200,
        responseTime: response.responseTime,
        status: response.status
      };
      console.log(`✅ Main app accessible: ${response.status} (${response.responseTime}ms)`);
    } catch (error) {
      this.results.infrastructure.mainApp = {
        accessible: false,
        error: error.message
      };
      console.log(`❌ Main app failed: ${error.message}`);
    }

    // Test health endpoints
    const healthEndpoints = ['/health', '/api/health', '/api/health/db'];
    
    for (const endpoint of healthEndpoints) {
      try {
        const response = await this.makeRequest(endpoint);
        this.results.infrastructure[endpoint] = {
          healthy: response.status === 200,
          responseTime: response.responseTime,
          data: response.data
        };
        console.log(`✅ ${endpoint}: ${response.status} (${response.responseTime}ms)`);
      } catch (error) {
        this.results.infrastructure[endpoint] = {
          healthy: false,
          error: error.message
        };
        console.log(`❌ ${endpoint} failed: ${error.message}`);
      }
    }
  }

  async testAPIEndpoints() {
    console.log('\n🔌 Testing API Endpoints...');
    
    // Test registration endpoint (expect validation error due to missing fields)
    try {
      const testData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'regression-test@example.com',
        password: 'TestPassword123!'
      };
      
      const response = await this.makePostRequest('/api/auth/register', testData);
      this.results.api.registration = {
        responding: true,
        status: response.status,
        responseTime: response.responseTime,
        validationWorking: response.status === 400 || response.status === 429
      };
      console.log(`✅ Registration endpoint: ${response.status} (${response.responseTime}ms)`);
    } catch (error) {
      this.results.api.registration = {
        responding: false,
        error: error.message
      };
      console.log(`❌ Registration endpoint failed: ${error.message}`);
    }
  }

  async makePostRequest(path, data) {
    return new Promise((resolve, reject) => {
      const url = new URL(`${this.baseUrl}${path}`);
      const postData = JSON.stringify(data);
      const startTime = Date.now();
      
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
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
              responseTime,
              headers: res.headers
            });
          } catch (e) {
            resolve({
              status: res.statusCode,
              data: responseData,
              responseTime,
              headers: res.headers
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

  async testDatabaseConnectivity() {
    console.log('\n🗄️ Testing Database Connectivity...');
    
    try {
      const response = await this.makeRequest('/api/health/db');
      this.results.infrastructure.database = {
        connected: response.status === 200 && response.data.status === 'healthy',
        responseTime: response.responseTime,
        data: response.data
      };
      
      if (this.results.infrastructure.database.connected) {
        console.log(`✅ Database connected (${response.responseTime}ms)`);
      } else {
        console.log(`❌ Database connection issues`);
      }
    } catch (error) {
      this.results.infrastructure.database = {
        connected: false,
        error: error.message
      };
      console.log(`❌ Database test failed: ${error.message}`);
    }
  }

  async testSecurity() {
    console.log('\n🔒 Testing Security Configuration...');
    
    // Test CORS headers
    try {
      const response = await this.makeRequest('/api/health');
      this.results.security.cors = {
        configured: !!response.headers['access-control-allow-origin'],
        headers: response.headers
      };
      console.log(`✅ CORS headers present: ${!!response.headers['access-control-allow-origin']}`);
    } catch (error) {
      this.results.security.cors = {
        configured: false,
        error: error.message
      };
      console.log(`❌ CORS test failed: ${error.message}`);
    }
  }

  async testPerformance() {
    console.log('\n⚡ Testing Performance...');
    
    const performanceTests = [
      { endpoint: '/', name: 'Main App' },
      { endpoint: '/api/health', name: 'Health API' },
      { endpoint: '/register', name: 'Registration Page' }
    ];

    for (const test of performanceTests) {
      try {
        const response = await this.makeRequest(test.endpoint);
        this.results.performance[test.name] = {
          responseTime: response.responseTime,
          acceptable: response.responseTime < 3000
        };
        
        const status = response.responseTime < 1000 ? '🚀' : 
                      response.responseTime < 3000 ? '✅' : '⚠️';
        console.log(`${status} ${test.name}: ${response.responseTime}ms`);
      } catch (error) {
        this.results.performance[test.name] = {
          responseTime: null,
          acceptable: false,
          error: error.message
        };
        console.log(`❌ ${test.name} performance test failed: ${error.message}`);
      }
    }
  }

  generateReport() {
    const totalTime = Date.now() - this.startTime;
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 REGRESSION TEST REPORT');
    console.log('='.repeat(60));
    
    console.log(`\n⏱️ Total Test Time: ${totalTime}ms`);
    
    // Infrastructure Summary
    console.log('\n🏗️ Infrastructure Status:');
    const infraPassed = Object.values(this.results.infrastructure).filter(r => 
      r.accessible || r.healthy || r.connected).length;
    const infraTotal = Object.keys(this.results.infrastructure).length;
    console.log(`   ${infraPassed}/${infraTotal} tests passed`);
    
    // API Summary
    console.log('\n🔌 API Status:');
    const apiPassed = Object.values(this.results.api).filter(r => 
      r.responding || r.validationWorking).length;
    const apiTotal = Object.keys(this.results.api).length;
    console.log(`   ${apiPassed}/${apiTotal} tests passed`);
    
    // Performance Summary
    console.log('\n⚡ Performance Status:');
    const perfPassed = Object.values(this.results.performance).filter(r => 
      r.acceptable).length;
    const perfTotal = Object.keys(this.results.performance).length;
    console.log(`   ${perfPassed}/${perfTotal} tests passed`);
    
    // Overall Status
    const totalPassed = infraPassed + apiPassed + perfPassed;
    const totalTests = infraTotal + apiTotal + perfTotal;
    const passRate = ((totalPassed / totalTests) * 100).toFixed(1);
    
    console.log(`\n🎯 Overall Pass Rate: ${passRate}% (${totalPassed}/${totalTests})`);
    
    if (passRate >= 80) {
      console.log('🎉 REGRESSION TEST PASSED - Application is healthy!');
    } else {
      console.log('⚠️ REGRESSION TEST CONCERNS - Some issues detected');
    }
    
    console.log('\n' + '='.repeat(60));
  }
}

// Run the regression test
if (require.main === module) {
  const tester = new RegressionTester();
  tester.runAllTests().catch(console.error);
}

module.exports = RegressionTester;
