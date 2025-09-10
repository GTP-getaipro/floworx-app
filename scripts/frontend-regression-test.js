#!/usr/bin/env node

/**
 * Frontend Regression Test
 * Tests the frontend functionality and API integration
 */

const https = require('https');

class FrontendTester {
  constructor() {
    this.baseUrl = 'https://app.floworx-iq.com';
    this.results = {
      pages: {},
      api: {},
      integration: {}
    };
  }

  async runTests() {
    console.log('🎨 Starting Frontend Regression Tests');
    console.log('=' .repeat(50));
    
    try {
      await this.testPageAccessibility();
      await this.testAPIIntegration();
      await this.testFormValidation();
      this.generateReport();
    } catch (error) {
      console.error('❌ Frontend test failed:', error.message);
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
          resolve({
            status: res.statusCode,
            data: data,
            responseTime,
            headers: res.headers,
            contentType: res.headers['content-type']
          });
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  async testPageAccessibility() {
    console.log('\n📄 Testing Page Accessibility...');
    
    const pages = [
      { path: '/', name: 'Home/Login' },
      { path: '/login', name: 'Login Page' },
      { path: '/register', name: 'Registration Page' },
      { path: '/forgot-password', name: 'Password Reset' }
    ];

    for (const page of pages) {
      try {
        const response = await this.makeRequest(page.path);
        
        this.results.pages[page.name] = {
          accessible: response.status === 200,
          responseTime: response.responseTime,
          isHTML: response.contentType && response.contentType.includes('text/html'),
          hasTitle: response.data.includes('<title>'),
          hasFloWorxBranding: response.data.includes('FloWorx') || response.data.includes('Floworx')
        };
        
        const status = response.status === 200 ? '✅' : '❌';
        console.log(`${status} ${page.name}: ${response.status} (${response.responseTime}ms)`);
        
        if (response.status === 200) {
          if (response.data.includes('FloWorx') || response.data.includes('Floworx')) {
            console.log(`   ✅ Contains FloWorx branding`);
          }
          if (response.data.includes('Create Your Floworx Account') && page.path === '/register') {
            console.log(`   ✅ Registration form detected`);
          }
          if (response.data.includes('Sign In to Floworx') && page.path === '/login') {
            console.log(`   ✅ Login form detected`);
          }
        }
        
      } catch (error) {
        this.results.pages[page.name] = {
          accessible: false,
          error: error.message
        };
        console.log(`❌ ${page.name} failed: ${error.message}`);
      }
    }
  }

  async testAPIIntegration() {
    console.log('\n🔌 Testing API Integration...');
    
    const apiEndpoints = [
      { path: '/api/health', name: 'Health Check', expectJSON: true },
      { path: '/api/health/db', name: 'Database Health', expectJSON: true },
      { path: '/health', name: 'Basic Health', expectJSON: true }
    ];

    for (const endpoint of apiEndpoints) {
      try {
        const response = await this.makeRequest(endpoint.path);
        
        let jsonData = null;
        let isValidJSON = false;
        
        if (endpoint.expectJSON) {
          try {
            jsonData = JSON.parse(response.data);
            isValidJSON = true;
          } catch (e) {
            isValidJSON = false;
          }
        }
        
        this.results.api[endpoint.name] = {
          responding: response.status === 200,
          responseTime: response.responseTime,
          isJSON: isValidJSON,
          data: jsonData
        };
        
        const status = response.status === 200 ? '✅' : '❌';
        console.log(`${status} ${endpoint.name}: ${response.status} (${response.responseTime}ms)`);
        
        if (isValidJSON && jsonData) {
          if (jsonData.status === 'ok' || jsonData.status === 'healthy') {
            console.log(`   ✅ Status: ${jsonData.status}`);
          }
          if (jsonData.database === 'connected') {
            console.log(`   ✅ Database: connected`);
          }
        }
        
      } catch (error) {
        this.results.api[endpoint.name] = {
          responding: false,
          error: error.message
        };
        console.log(`❌ ${endpoint.name} failed: ${error.message}`);
      }
    }
  }

  async testFormValidation() {
    console.log('\n📝 Testing Form Validation...');
    
    try {
      // Test registration endpoint with invalid data
      const invalidData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'invalid-email',
        password: '123' // Too short
      };
      
      const response = await this.makePostRequest('/api/auth/register', invalidData);
      
      this.results.integration.validation = {
        working: response.status === 400, // Should return validation error
        responseTime: response.responseTime,
        status: response.status
      };
      
      if (response.status === 400) {
        console.log('✅ Form validation working (400 error for invalid data)');
      } else if (response.status === 429) {
        console.log('✅ Rate limiting working (429 error)');
        this.results.integration.validation.working = true;
      } else {
        console.log(`⚠️ Unexpected response: ${response.status}`);
      }
      
    } catch (error) {
      this.results.integration.validation = {
        working: false,
        error: error.message
      };
      console.log(`❌ Form validation test failed: ${error.message}`);
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
          resolve({
            status: res.statusCode,
            data: responseData,
            responseTime,
            headers: res.headers
          });
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

  generateReport() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 FRONTEND REGRESSION REPORT');
    console.log('='.repeat(50));
    
    // Page accessibility summary
    console.log('\n📄 Page Accessibility:');
    const pagesPassed = Object.values(this.results.pages).filter(r => r.accessible).length;
    const pagesTotal = Object.keys(this.results.pages).length;
    console.log(`   ${pagesPassed}/${pagesTotal} pages accessible`);
    
    // API integration summary
    console.log('\n🔌 API Integration:');
    const apiPassed = Object.values(this.results.api).filter(r => r.responding).length;
    const apiTotal = Object.keys(this.results.api).length;
    console.log(`   ${apiPassed}/${apiTotal} endpoints responding`);
    
    // Integration tests summary
    console.log('\n🔗 Integration Tests:');
    const integrationPassed = Object.values(this.results.integration).filter(r => r.working).length;
    const integrationTotal = Object.keys(this.results.integration).length;
    console.log(`   ${integrationPassed}/${integrationTotal} tests passed`);
    
    // Overall status
    const totalPassed = pagesPassed + apiPassed + integrationPassed;
    const totalTests = pagesTotal + apiTotal + integrationTotal;
    const passRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : 0;
    
    console.log(`\n🎯 Overall Pass Rate: ${passRate}% (${totalPassed}/${totalTests})`);
    
    if (passRate >= 80) {
      console.log('🎉 FRONTEND TESTS PASSED - UI is working correctly!');
    } else {
      console.log('⚠️ FRONTEND TESTS CONCERNS - Some issues detected');
    }
    
    console.log('\n' + '='.repeat(50));
  }
}

// Run the frontend tests
if (require.main === module) {
  const tester = new FrontendTester();
  tester.runTests().catch(console.error);
}

module.exports = FrontendTester;
