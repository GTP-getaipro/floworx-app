#!/usr/bin/env node

/**
 * Comprehensive Application Test After Dead Code Cleanup
 * Tests all critical functionality to ensure nothing was broken
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class PostCleanupTester {
  constructor() {
    this.results = {
      passed: [],
      failed: [],
      warnings: []
    };
    
    this.apiUrl = process.env.API_URL || 'https://app.floworx-iq.com/api';
    this.localApiUrl = 'http://localhost:5001/api';
  }

  async runTests() {
    console.log('🧪 Running Post-Cleanup Application Tests...');
    console.log('=' .repeat(60));

    try {
      await this.testFileStructure();
      await this.testDependencies();
      await this.testBackendStart();
      await this.testFrontendBuild();
      await this.testCriticalEndpoints();
      await this.testDatabaseConnections();
      await this.testAuthenticationFlow();
      
      this.generateReport();
    } catch (error) {
      console.error('❌ Testing failed:', error.message);
      process.exit(1);
    }
  }

  async testFileStructure() {
    console.log('\n📁 Testing File Structure Integrity...');
    
    const criticalFiles = [
      'package.json',
      'backend/server.js',
      'backend/database/database-operations.js',
      'backend/database/unified-connection.js',
      'backend/routes/auth.js',
      'backend/routes/passwordReset.js',
      'backend/middleware/rateLimiter.js',
      'backend/services/emailService.js',
      'frontend/package.json',
      'frontend/src/App.js',
      'frontend/src/components/Login.js',
      'frontend/src/components/Register.js',
      'frontend/src/components/PasswordReset.js',
      'frontend/src/utils/apiClient.js',
      '.env'
    ];

    let missingFiles = [];
    
    criticalFiles.forEach(file => {
      if (fs.existsSync(file)) {
        console.log(`   ✅ ${file} exists`);
        this.results.passed.push(`File structure: ${file} exists`);
      } else {
        console.log(`   ❌ ${file} missing`);
        missingFiles.push(file);
        this.results.failed.push(`File structure: ${file} missing`);
      }
    });

    if (missingFiles.length === 0) {
      console.log('   🎉 All critical files present');
    } else {
      console.log(`   ⚠️  ${missingFiles.length} critical files missing`);
    }
  }

  async testDependencies() {
    console.log('\n📦 Testing Dependencies...');
    
    try {
      // Test backend dependencies
      const backendPackage = JSON.parse(fs.readFileSync('backend/package.json', 'utf8'));
      const criticalBackendDeps = [
        'express',
        'cors',
        'helmet',
        'bcrypt',
        'jsonwebtoken',
        'nodemailer',
        '@supabase/supabase-js',
        'joi',
        'express-rate-limit'
      ];

      criticalBackendDeps.forEach(dep => {
        if (backendPackage.dependencies[dep] || backendPackage.devDependencies[dep]) {
          console.log(`   ✅ Backend: ${dep} dependency present`);
          this.results.passed.push(`Dependencies: Backend ${dep} present`);
        } else {
          console.log(`   ❌ Backend: ${dep} dependency missing`);
          this.results.failed.push(`Dependencies: Backend ${dep} missing`);
        }
      });

      // Test frontend dependencies
      const frontendPackage = JSON.parse(fs.readFileSync('frontend/package.json', 'utf8'));
      const criticalFrontendDeps = [
        'react',
        'react-dom',
        'react-router-dom',
        'axios'
      ];

      criticalFrontendDeps.forEach(dep => {
        if (frontendPackage.dependencies[dep] || frontendPackage.devDependencies[dep]) {
          console.log(`   ✅ Frontend: ${dep} dependency present`);
          this.results.passed.push(`Dependencies: Frontend ${dep} present`);
        } else {
          console.log(`   ❌ Frontend: ${dep} dependency missing`);
          this.results.failed.push(`Dependencies: Frontend ${dep} missing`);
        }
      });

    } catch (error) {
      console.log(`   ❌ Error reading package.json files: ${error.message}`);
      this.results.failed.push(`Dependencies: Error reading package files`);
    }
  }

  async testBackendStart() {
    console.log('\n🔧 Testing Backend Startup...');
    
    return new Promise((resolve) => {
      const backendProcess = spawn('node', ['server.js'], {
        cwd: path.join(process.cwd(), 'backend'),
        stdio: 'pipe'
      });

      let output = '';
      let hasStarted = false;

      const timeout = setTimeout(() => {
        if (!hasStarted) {
          backendProcess.kill();
          console.log('   ❌ Backend failed to start within 30 seconds');
          this.results.failed.push('Backend: Failed to start within timeout');
          resolve();
        }
      }, 30000);

      backendProcess.stdout.on('data', (data) => {
        output += data.toString();
        if (output.includes('Server running on port') || output.includes('listening on port')) {
          hasStarted = true;
          clearTimeout(timeout);
          backendProcess.kill();
          console.log('   ✅ Backend started successfully');
          this.results.passed.push('Backend: Started successfully');
          resolve();
        }
      });

      backendProcess.stderr.on('data', (data) => {
        const error = data.toString();
        if (error.includes('Error') || error.includes('error')) {
          clearTimeout(timeout);
          backendProcess.kill();
          console.log(`   ❌ Backend startup error: ${error.trim()}`);
          this.results.failed.push(`Backend: Startup error - ${error.trim()}`);
          resolve();
        }
      });

      backendProcess.on('error', (error) => {
        clearTimeout(timeout);
        console.log(`   ❌ Backend process error: ${error.message}`);
        this.results.failed.push(`Backend: Process error - ${error.message}`);
        resolve();
      });
    });
  }

  async testFrontendBuild() {
    console.log('\n⚛️  Testing Frontend Build...');
    
    return new Promise((resolve) => {
      const buildProcess = spawn('npm', ['run', 'build'], {
        cwd: path.join(process.cwd(), 'frontend'),
        stdio: 'pipe'
      });

      let output = '';
      let errorOutput = '';

      const timeout = setTimeout(() => {
        buildProcess.kill();
        console.log('   ❌ Frontend build timed out after 2 minutes');
        this.results.failed.push('Frontend: Build timed out');
        resolve();
      }, 120000);

      buildProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      buildProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      buildProcess.on('close', (code) => {
        clearTimeout(timeout);
        
        if (code === 0) {
          console.log('   ✅ Frontend build successful');
          this.results.passed.push('Frontend: Build successful');
        } else {
          console.log(`   ❌ Frontend build failed with code ${code}`);
          if (errorOutput) {
            console.log(`   Error details: ${errorOutput.slice(0, 200)}...`);
          }
          this.results.failed.push(`Frontend: Build failed with code ${code}`);
        }
        resolve();
      });

      buildProcess.on('error', (error) => {
        clearTimeout(timeout);
        console.log(`   ❌ Frontend build process error: ${error.message}`);
        this.results.failed.push(`Frontend: Build process error - ${error.message}`);
        resolve();
      });
    });
  }

  async testCriticalEndpoints() {
    console.log('\n🌐 Testing Critical API Endpoints...');
    
    const endpoints = [
      { path: '/health', method: 'GET', description: 'Health check' },
      { path: '/auth/register', method: 'POST', description: 'User registration' },
      { path: '/auth/login', method: 'POST', description: 'User login' },
      { path: '/password-reset/request', method: 'POST', description: 'Password reset request' }
    ];

    // Note: These are structural tests, not functional tests
    // We're checking if the route handlers exist, not if they work correctly
    
    try {
      const authRoutes = fs.readFileSync('backend/routes/auth.js', 'utf8');
      const passwordResetRoutes = fs.readFileSync('backend/routes/passwordReset.js', 'utf8');
      
      endpoints.forEach(endpoint => {
        let routeExists = false;
        
        if (endpoint.path.includes('/auth/')) {
          routeExists = authRoutes.includes(`router.${endpoint.method.toLowerCase()}('${endpoint.path.replace('/auth', '')}'`) ||
                       authRoutes.includes(`app.${endpoint.method.toLowerCase()}('${endpoint.path}'`);
        } else if (endpoint.path.includes('/password-reset/')) {
          routeExists = passwordResetRoutes.includes(`router.${endpoint.method.toLowerCase()}('${endpoint.path.replace('/password-reset', '')}'`) ||
                       passwordResetRoutes.includes(`app.${endpoint.method.toLowerCase()}('${endpoint.path}'`);
        } else if (endpoint.path === '/health') {
          // Health endpoint might be in server.js or a separate health route
          const serverJs = fs.readFileSync('backend/server.js', 'utf8');
          routeExists = serverJs.includes('/health') || serverJs.includes('health');
        }

        if (routeExists) {
          console.log(`   ✅ ${endpoint.description} endpoint exists`);
          this.results.passed.push(`Endpoints: ${endpoint.description} exists`);
        } else {
          console.log(`   ⚠️  ${endpoint.description} endpoint not found in routes`);
          this.results.warnings.push(`Endpoints: ${endpoint.description} not found`);
        }
      });

    } catch (error) {
      console.log(`   ❌ Error reading route files: ${error.message}`);
      this.results.failed.push(`Endpoints: Error reading route files`);
    }
  }

  async testDatabaseConnections() {
    console.log('\n🗄️  Testing Database Connection Files...');
    
    try {
      const dbOperations = fs.readFileSync('backend/database/database-operations.js', 'utf8');
      const unifiedConnection = fs.readFileSync('backend/database/unified-connection.js', 'utf8');

      // Check for critical database methods
      const criticalMethods = [
        'createUser',
        'getUserByEmail',
        'createPasswordResetToken',
        'validatePasswordResetToken'
      ];

      criticalMethods.forEach(method => {
        if (dbOperations.includes(method)) {
          console.log(`   ✅ Database method ${method} exists`);
          this.results.passed.push(`Database: ${method} method exists`);
        } else {
          console.log(`   ❌ Database method ${method} missing`);
          this.results.failed.push(`Database: ${method} method missing`);
        }
      });

      // Check for Supabase connection
      if (unifiedConnection.includes('supabase') || unifiedConnection.includes('createClient')) {
        console.log('   ✅ Supabase connection configuration exists');
        this.results.passed.push('Database: Supabase connection exists');
      } else {
        console.log('   ❌ Supabase connection configuration missing');
        this.results.failed.push('Database: Supabase connection missing');
      }

    } catch (error) {
      console.log(`   ❌ Error reading database files: ${error.message}`);
      this.results.failed.push(`Database: Error reading database files`);
    }
  }

  async testAuthenticationFlow() {
    console.log('\n🔐 Testing Authentication Components...');
    
    try {
      const loginComponent = fs.readFileSync('frontend/src/components/Login.js', 'utf8');
      const registerComponent = fs.readFileSync('frontend/src/components/Register.js', 'utf8');
      const passwordResetComponent = fs.readFileSync('frontend/src/components/PasswordReset.js', 'utf8');

      // Check for critical authentication elements
      const authChecks = [
        { file: 'Login', content: loginComponent, checks: ['email', 'password', 'login', 'submit'] },
        { file: 'Register', content: registerComponent, checks: ['email', 'password', 'register', 'submit'] },
        { file: 'PasswordReset', content: passwordResetComponent, checks: ['email', 'reset', 'submit'] }
      ];

      authChecks.forEach(({ file, content, checks }) => {
        checks.forEach(check => {
          if (content.toLowerCase().includes(check)) {
            console.log(`   ✅ ${file} component contains ${check} functionality`);
            this.results.passed.push(`Auth: ${file} has ${check} functionality`);
          } else {
            console.log(`   ⚠️  ${file} component missing ${check} functionality`);
            this.results.warnings.push(`Auth: ${file} missing ${check} functionality`);
          }
        });
      });

    } catch (error) {
      console.log(`   ❌ Error reading authentication components: ${error.message}`);
      this.results.failed.push(`Auth: Error reading components`);
    }
  }

  generateReport() {
    console.log('\n📊 POST-CLEANUP TEST REPORT');
    console.log('=' .repeat(60));

    const totalPassed = this.results.passed.length;
    const totalFailed = this.results.failed.length;
    const totalWarnings = this.results.warnings.length;
    const totalTests = totalPassed + totalFailed + totalWarnings;

    console.log(`\n📈 Test Summary:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   ✅ Passed: ${totalPassed}`);
    console.log(`   ❌ Failed: ${totalFailed}`);
    console.log(`   ⚠️  Warnings: ${totalWarnings}`);

    if (totalFailed > 0) {
      console.log(`\n❌ Failed Tests (${totalFailed}):`);
      this.results.failed.forEach(failure => {
        console.log(`   ❌ ${failure}`);
      });
    }

    if (totalWarnings > 0) {
      console.log(`\n⚠️  Warnings (${totalWarnings}):`);
      this.results.warnings.forEach(warning => {
        console.log(`   ⚠️  ${warning}`);
      });
    }

    console.log('\n🎯 Application Status:');
    if (totalFailed === 0) {
      console.log('   🎉 Application appears to be functioning correctly after cleanup!');
      console.log('   ✅ All critical components and files are present');
      console.log('   🚀 Ready for deployment and further testing');
    } else {
      console.log('   ⚠️  Some issues detected that may need attention');
      console.log('   🔧 Review failed tests and fix any critical issues');
    }

    console.log('\n📋 Next Steps:');
    console.log('   1. Run comprehensive integration tests');
    console.log('   2. Test user registration and login flows');
    console.log('   3. Test password reset functionality');
    console.log('   4. Deploy to staging environment');
    console.log('   5. Run production smoke tests');

    const successRate = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;
    console.log(`\n📊 Success Rate: ${successRate}%`);

    if (totalFailed > 0) {
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const tester = new PostCleanupTester();
  await tester.runTests();
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { PostCleanupTester };
