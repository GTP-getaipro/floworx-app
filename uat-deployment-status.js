/**
 * FloWorx UAT Deployment Status and Validation
 * Comprehensive deployment status check and UAT framework validation
 */

const https = require('https');
const http = require('http');
const fs = require('fs').promises;

class UATDeploymentStatus {
  constructor() {
    this.baseUrl = process.env.UAT_BASE_URL || 'https://app.floworx-iq.com';
    this.results = {
      deployment: {
        status: 'UNKNOWN',
        accessible: false,
        responseTime: null,
        error: null
      },
      infrastructure: {
        dns: 'UNKNOWN',
        ssl: 'UNKNOWN',
        server: 'UNKNOWN'
      },
      uatFramework: {
        status: 'READY',
        components: {
          framework: 'AVAILABLE',
          playwright: 'AVAILABLE',
          runner: 'AVAILABLE',
          dashboard: 'AVAILABLE'
        }
      },
      recommendations: []
    };
  }

  /**
   * Check comprehensive deployment status
   */
  async checkDeploymentStatus() {
    console.log('🔍 Checking FloWorx Deployment Status...');
    console.log(`🎯 Target: ${this.baseUrl}`);
    console.log('=' * 60);

    try {
      // Check DNS resolution
      await this.checkDNSResolution();
      
      // Check SSL certificate
      await this.checkSSLCertificate();
      
      // Check server accessibility
      await this.checkServerAccessibility();
      
      // Check API endpoints
      await this.checkAPIEndpoints();
      
      // Validate UAT framework
      await this.validateUATFramework();
      
      // Generate recommendations
      this.generateRecommendations();
      
      // Display comprehensive report
      this.displayStatusReport();
      
      return this.results;
      
    } catch (error) {
      console.error('❌ Deployment status check failed:', error.message);
      this.results.deployment.status = 'FAILED';
      this.results.deployment.error = error.message;
      return this.results;
    }
  }

  /**
   * Check DNS resolution
   */
  async checkDNSResolution() {
    console.log('\n🌐 Checking DNS Resolution...');
    
    try {
      const dns = require('dns').promises;
      const url = new URL(this.baseUrl);
      const addresses = await dns.lookup(url.hostname);
      
      this.results.infrastructure.dns = 'RESOLVED';
      console.log(`✅ DNS resolved: ${url.hostname} -> ${addresses.address}`);
      
    } catch (error) {
      this.results.infrastructure.dns = 'FAILED';
      console.log(`❌ DNS resolution failed: ${error.message}`);
    }
  }

  /**
   * Check SSL certificate
   */
  async checkSSLCertificate() {
    console.log('\n🔒 Checking SSL Certificate...');
    
    return new Promise((resolve) => {
      const url = new URL(this.baseUrl);
      
      if (url.protocol !== 'https:') {
        this.results.infrastructure.ssl = 'NOT_HTTPS';
        console.log('⚠️ Not using HTTPS');
        resolve();
        return;
      }
      
      const options = {
        hostname: url.hostname,
        port: 443,
        method: 'GET',
        timeout: 10000
      };
      
      const req = https.request(options, (res) => {
        const cert = res.connection.getPeerCertificate();
        
        if (cert && cert.subject) {
          this.results.infrastructure.ssl = 'VALID';
          console.log(`✅ SSL certificate valid: ${cert.subject.CN}`);
          console.log(`   Valid until: ${cert.valid_to}`);
        } else {
          this.results.infrastructure.ssl = 'INVALID';
          console.log('❌ SSL certificate invalid');
        }
        
        resolve();
      });
      
      req.on('error', (error) => {
        this.results.infrastructure.ssl = 'ERROR';
        console.log(`❌ SSL check failed: ${error.message}`);
        resolve();
      });
      
      req.on('timeout', () => {
        this.results.infrastructure.ssl = 'TIMEOUT';
        console.log('❌ SSL check timed out');
        req.destroy();
        resolve();
      });
      
      req.end();
    });
  }

  /**
   * Check server accessibility
   */
  async checkServerAccessibility() {
    console.log('\n🖥️ Checking Server Accessibility...');
    
    return new Promise((resolve) => {
      const startTime = Date.now();
      const url = new URL(this.baseUrl);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;
      
      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: '/api/health',
        method: 'GET',
        timeout: 15000,
        headers: {
          'User-Agent': 'FloWorx-UAT-StatusCheck/1.0'
        }
      };
      
      const req = client.request(options, (res) => {
        const responseTime = Date.now() - startTime;
        this.results.deployment.responseTime = responseTime;
        
        let data = '';
        res.on('data', chunk => data += chunk);
        
        res.on('end', () => {
          console.log(`📊 Response: ${res.statusCode} (${responseTime}ms)`);
          
          if (res.statusCode === 200) {
            try {
              const response = JSON.parse(data);
              if (response.status === 'ok') {
                this.results.deployment.status = 'HEALTHY';
                this.results.deployment.accessible = true;
                this.results.infrastructure.server = 'RUNNING';
                console.log('✅ Server is healthy and accessible');
              } else {
                this.results.deployment.status = 'UNHEALTHY';
                this.results.infrastructure.server = 'UNHEALTHY';
                console.log('⚠️ Server accessible but unhealthy');
              }
            } catch (parseError) {
              this.results.deployment.status = 'INVALID_RESPONSE';
              this.results.infrastructure.server = 'INVALID_RESPONSE';
              console.log('⚠️ Server accessible but invalid response format');
            }
          } else if (res.statusCode === 503) {
            this.results.deployment.status = 'SERVICE_UNAVAILABLE';
            this.results.infrastructure.server = 'SERVICE_UNAVAILABLE';
            console.log('⚠️ Server returning 503 Service Unavailable');
          } else {
            this.results.deployment.status = 'ERROR';
            this.results.infrastructure.server = 'ERROR';
            console.log(`❌ Server returned error: ${res.statusCode}`);
          }
          
          resolve();
        });
      });
      
      req.on('error', (error) => {
        this.results.deployment.status = 'CONNECTION_FAILED';
        this.results.deployment.error = error.message;
        this.results.infrastructure.server = 'CONNECTION_FAILED';
        console.log(`❌ Connection failed: ${error.message}`);
        resolve();
      });
      
      req.on('timeout', () => {
        this.results.deployment.status = 'TIMEOUT';
        this.results.infrastructure.server = 'TIMEOUT';
        console.log('❌ Connection timed out');
        req.destroy();
        resolve();
      });
      
      req.end();
    });
  }

  /**
   * Check API endpoints
   */
  async checkAPIEndpoints() {
    console.log('\n🔌 Checking API Endpoints...');
    
    const endpoints = [
      { path: '/api/health', name: 'Health Check', requiresAuth: false },
      { path: '/api/auth/register', name: 'Registration', requiresAuth: false },
      { path: '/api/onboarding/business-types', name: 'Business Types', requiresAuth: true }
    ];
    
    for (const endpoint of endpoints) {
      await this.checkEndpoint(endpoint);
    }
  }

  /**
   * Check individual endpoint
   */
  async checkEndpoint(endpoint) {
    return new Promise((resolve) => {
      const url = new URL(this.baseUrl + endpoint.path);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;
      
      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: endpoint.path,
        method: 'GET',
        timeout: 10000,
        headers: {
          'User-Agent': 'FloWorx-UAT-EndpointCheck/1.0'
        }
      };
      
      const req = client.request(options, (res) => {
        const expectedStatus = endpoint.requiresAuth ? 401 : [200, 404, 405];
        const actualStatus = res.statusCode;
        
        if (Array.isArray(expectedStatus) ? expectedStatus.includes(actualStatus) : actualStatus === expectedStatus) {
          console.log(`✅ ${endpoint.name}: ${actualStatus} (Expected)`);
        } else if (actualStatus === 503) {
          console.log(`⚠️ ${endpoint.name}: 503 Service Unavailable`);
        } else {
          console.log(`❌ ${endpoint.name}: ${actualStatus} (Unexpected)`);
        }
        
        resolve();
      });
      
      req.on('error', (error) => {
        console.log(`❌ ${endpoint.name}: Connection failed`);
        resolve();
      });
      
      req.on('timeout', () => {
        console.log(`❌ ${endpoint.name}: Timeout`);
        req.destroy();
        resolve();
      });
      
      req.end();
    });
  }

  /**
   * Validate UAT framework components
   */
  async validateUATFramework() {
    console.log('\n🧪 Validating UAT Framework...');
    
    const components = [
      { file: 'uat/uat-framework.js', name: 'Framework Core' },
      { file: 'uat/uat-runner.js', name: 'UAT Runner' },
      { file: 'uat/uat-automation.spec.js', name: 'Playwright Tests' },
      { file: 'uat/uat-dashboard.js', name: 'UAT Dashboard' },
      { file: 'run-uat-simple.ps1', name: 'PowerShell Runner' }
    ];
    
    for (const component of components) {
      try {
        await fs.access(component.file);
        console.log(`✅ ${component.name}: Available`);
        this.results.uatFramework.components[component.name.toLowerCase().replace(' ', '_')] = 'AVAILABLE';
      } catch (error) {
        console.log(`❌ ${component.name}: Missing`);
        this.results.uatFramework.components[component.name.toLowerCase().replace(' ', '_')] = 'MISSING';
      }
    }
    
    // Check Node.js dependencies
    try {
      await fs.access('node_modules');
      console.log('✅ Node.js Dependencies: Installed');
    } catch (error) {
      console.log('⚠️ Node.js Dependencies: Not installed (run npm install)');
    }
    
    this.results.uatFramework.status = 'READY';
  }

  /**
   * Generate recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    
    if (this.results.deployment.status === 'SERVICE_UNAVAILABLE') {
      recommendations.push({
        priority: 'HIGH',
        category: 'Deployment',
        issue: 'Server returning 503 Service Unavailable',
        action: 'Check deployment status, restart services, or wait for deployment completion'
      });
    }
    
    if (this.results.deployment.status === 'CONNECTION_FAILED') {
      recommendations.push({
        priority: 'CRITICAL',
        category: 'Infrastructure',
        issue: 'Cannot connect to production server',
        action: 'Verify DNS, check firewall settings, confirm server is running'
      });
    }
    
    if (this.results.infrastructure.ssl === 'INVALID') {
      recommendations.push({
        priority: 'HIGH',
        category: 'Security',
        issue: 'SSL certificate invalid',
        action: 'Renew SSL certificate or configure HTTPS properly'
      });
    }
    
    if (this.results.deployment.responseTime > 5000) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Performance',
        issue: 'Slow response times detected',
        action: 'Investigate server performance and optimize response times'
      });
    }
    
    recommendations.push({
      priority: 'LOW',
      category: 'UAT',
      issue: 'UAT framework ready for execution',
      action: 'Once deployment issues are resolved, run comprehensive UAT suite'
    });
    
    this.results.recommendations = recommendations;
  }

  /**
   * Display comprehensive status report
   */
  displayStatusReport() {
    console.log('\n' + '=' * 80);
    console.log('🚀 FLOWORX DEPLOYMENT STATUS & UAT READINESS REPORT');
    console.log('=' * 80);
    
    console.log('\n🎯 DEPLOYMENT STATUS:');
    console.log(`Overall Status: ${this.getStatusIcon(this.results.deployment.status)} ${this.results.deployment.status}`);
    console.log(`Server Accessible: ${this.results.deployment.accessible ? '✅' : '❌'}`);
    console.log(`Response Time: ${this.results.deployment.responseTime ? this.results.deployment.responseTime + 'ms' : 'N/A'}`);
    
    console.log('\n🏗️ INFRASTRUCTURE STATUS:');
    console.log(`DNS Resolution: ${this.getStatusIcon(this.results.infrastructure.dns)} ${this.results.infrastructure.dns}`);
    console.log(`SSL Certificate: ${this.getStatusIcon(this.results.infrastructure.ssl)} ${this.results.infrastructure.ssl}`);
    console.log(`Server Status: ${this.getStatusIcon(this.results.infrastructure.server)} ${this.results.infrastructure.server}`);
    
    console.log('\n🧪 UAT FRAMEWORK STATUS:');
    console.log(`Framework Status: ${this.getStatusIcon(this.results.uatFramework.status)} ${this.results.uatFramework.status}`);
    Object.entries(this.results.uatFramework.components).forEach(([component, status]) => {
      console.log(`  ${component}: ${this.getStatusIcon(status)} ${status}`);
    });
    
    console.log('\n📋 RECOMMENDATIONS:');
    this.results.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. [${rec.priority}] ${rec.category}: ${rec.action}`);
    });
    
    console.log('\n🎯 NEXT STEPS:');
    if (this.results.deployment.accessible) {
      console.log('✅ Server is accessible - Ready to run UAT suite');
      console.log('   Run: npm run uat:production');
    } else {
      console.log('⚠️ Server not accessible - Resolve deployment issues first');
      console.log('   1. Check deployment logs');
      console.log('   2. Verify server configuration');
      console.log('   3. Wait for deployment completion (if in progress)');
      console.log('   4. Re-run status check: node uat-deployment-status.js');
    }
    
    console.log('\n' + '=' * 80);
  }

  /**
   * Get status icon
   */
  getStatusIcon(status) {
    const icons = {
      'HEALTHY': '✅',
      'READY': '✅',
      'AVAILABLE': '✅',
      'VALID': '✅',
      'RESOLVED': '✅',
      'RUNNING': '✅',
      'SERVICE_UNAVAILABLE': '⚠️',
      'UNHEALTHY': '⚠️',
      'TIMEOUT': '⚠️',
      'INVALID': '❌',
      'FAILED': '❌',
      'CONNECTION_FAILED': '❌',
      'ERROR': '❌',
      'MISSING': '❌',
      'UNKNOWN': '❓'
    };
    
    return icons[status] || '❓';
  }

  /**
   * Save status report
   */
  async saveStatusReport() {
    const reportPath = `uat-deployment-status-${Date.now()}.json`;
    await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`📄 Status report saved: ${reportPath}`);
    return reportPath;
  }
}

// Run if called directly
if (require.main === module) {
  const statusChecker = new UATDeploymentStatus();
  statusChecker.checkDeploymentStatus()
    .then(async (results) => {
      await statusChecker.saveStatusReport();
      
      if (results.deployment.accessible) {
        console.log('\n🎉 Deployment status check completed - Server accessible!');
        process.exit(0);
      } else {
        console.log('\n⚠️ Deployment status check completed - Server not accessible');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 Status check failed:', error);
      process.exit(1);
    });
}

module.exports = UATDeploymentStatus;
