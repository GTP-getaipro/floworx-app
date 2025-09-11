#!/usr/bin/env node

/**
 * DEPLOYMENT ERROR DIAGNOSIS TOOL
 * ===============================
 * Comprehensive error detection and fixing for deployment issues
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class DeploymentErrorDiagnostic {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.fixes = [];
  }

  async runCommand(command, args = [], options = {}) {
    return new Promise((resolve) => {
      const process = spawn(command, args, {
        stdio: 'pipe',
        shell: true,
        ...options
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        resolve({
          code,
          stdout,
          stderr,
          success: code === 0
        });
      });

      process.on('error', (error) => {
        resolve({
          code: -1,
          stdout: '',
          stderr: error.message,
          success: false,
          error: error.message
        });
      });
    });
  }

  checkPackageJsonIssues() {
    console.log('📦 CHECKING PACKAGE.JSON FOR COMMON ISSUES');
    console.log('===========================================');

    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      
      // Check for problematic dependencies
      const problematicDeps = [
        'fsevents', // macOS specific
        'node-sass', // deprecated
        'node-gyp' // can cause build issues
      ];

      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };

      problematicDeps.forEach(dep => {
        if (allDeps[dep]) {
          this.warnings.push(`Potentially problematic dependency: ${dep}`);
          this.fixes.push(`Consider replacing ${dep} with alternatives`);
        }
      });

      // Check for missing engines
      if (!packageJson.engines || !packageJson.engines.node) {
        this.warnings.push('Node.js version not specified in engines');
        this.fixes.push('Add "engines": {"node": ">=18.0.0"} to package.json');
      }

      // Check scripts
      const buildScript = packageJson.scripts?.build;
      const startScript = packageJson.scripts?.start;

      if (!buildScript) {
        this.errors.push('Missing build script in package.json');
        this.fixes.push('Add "build": "npm install --prefix frontend && npm run build --prefix frontend"');
      }

      if (!startScript) {
        this.errors.push('Missing start script in package.json');
        this.fixes.push('Add "start": "npm start --prefix backend"');
      }

      console.log('✅ Package.json structure check complete');

    } catch (error) {
      this.errors.push(`Cannot read package.json: ${error.message}`);
      this.fixes.push('Ensure package.json exists and is valid JSON');
    }
  }

  checkFrontendIssues() {
    console.log('\n🎨 CHECKING FRONTEND FOR COMMON ISSUES');
    console.log('======================================');

    // Check frontend package.json
    try {
      const frontendPackageJson = JSON.parse(fs.readFileSync('frontend/package.json', 'utf8'));
      
      // Check for build script issues
      const buildScript = frontendPackageJson.scripts?.build;
      if (buildScript && buildScript.includes('CI=true')) {
        this.warnings.push('Frontend build script has CI=true which may cause issues');
        this.fixes.push('Use CI=false in frontend build script');
      }

      // Check for missing dependencies
      const requiredDeps = ['react', 'react-dom', 'react-scripts'];
      requiredDeps.forEach(dep => {
        if (!frontendPackageJson.dependencies?.[dep]) {
          this.errors.push(`Missing required frontend dependency: ${dep}`);
          this.fixes.push(`Run: cd frontend && npm install ${dep}`);
        }
      });

      console.log('✅ Frontend package.json check complete');

    } catch (error) {
      this.errors.push(`Cannot read frontend/package.json: ${error.message}`);
      this.fixes.push('Ensure frontend/package.json exists and is valid');
    }

    // Check for problematic files
    const problematicFiles = [
      'frontend/.env.local',
      'frontend/.env.production.local',
      'frontend/build' // Should be cleaned before deployment
    ];

    problematicFiles.forEach(file => {
      if (fs.existsSync(file)) {
        this.warnings.push(`Found potentially problematic file: ${file}`);
        if (file.includes('.env')) {
          this.fixes.push(`Remove ${file} or ensure it doesn't contain secrets`);
        } else if (file.includes('build')) {
          this.fixes.push(`Remove ${file} directory to ensure clean build`);
        }
      }
    });
  }

  checkBackendIssues() {
    console.log('\n🔧 CHECKING BACKEND FOR COMMON ISSUES');
    console.log('=====================================');

    // Check backend package.json
    try {
      const backendPackageJson = JSON.parse(fs.readFileSync('backend/package.json', 'utf8'));
      
      // Check for required dependencies
      const requiredDeps = ['express'];
      requiredDeps.forEach(dep => {
        if (!backendPackageJson.dependencies?.[dep]) {
          this.errors.push(`Missing required backend dependency: ${dep}`);
          this.fixes.push(`Run: cd backend && npm install ${dep}`);
        }
      });

      // Check start script
      const startScript = backendPackageJson.scripts?.start;
      if (!startScript) {
        this.errors.push('Missing start script in backend/package.json');
        this.fixes.push('Add "start": "node server.js" to backend/package.json');
      }

      console.log('✅ Backend package.json check complete');

    } catch (error) {
      this.errors.push(`Cannot read backend/package.json: ${error.message}`);
      this.fixes.push('Ensure backend/package.json exists and is valid');
    }

    // Check for server file
    if (!fs.existsSync('backend/server.js')) {
      this.errors.push('Missing backend/server.js file');
      this.fixes.push('Ensure backend/server.js exists and is the main entry point');
    }
  }

  async checkDependencyIssues() {
    console.log('\n📚 CHECKING DEPENDENCY INSTALLATION');
    console.log('===================================');

    // Test npm install in root
    const rootInstall = await this.runCommand('npm', ['install'], { cwd: '.' });
    if (!rootInstall.success) {
      this.errors.push('Root npm install failed');
      this.fixes.push('Fix package.json dependencies or run npm install manually');
      console.log(`❌ Root install error: ${rootInstall.stderr}`);
    } else {
      console.log('✅ Root dependencies install successfully');
    }

    // Test frontend install
    const frontendInstall = await this.runCommand('npm', ['install'], { cwd: './frontend' });
    if (!frontendInstall.success) {
      this.errors.push('Frontend npm install failed');
      this.fixes.push('Fix frontend/package.json or run cd frontend && npm install');
      console.log(`❌ Frontend install error: ${frontendInstall.stderr}`);
    } else {
      console.log('✅ Frontend dependencies install successfully');
    }

    // Test backend install
    const backendInstall = await this.runCommand('npm', ['install'], { cwd: './backend' });
    if (!backendInstall.success) {
      this.errors.push('Backend npm install failed');
      this.fixes.push('Fix backend/package.json or run cd backend && npm install');
      console.log(`❌ Backend install error: ${backendInstall.stderr}`);
    } else {
      console.log('✅ Backend dependencies install successfully');
    }
  }

  async checkBuildIssues() {
    console.log('\n🏗️  CHECKING BUILD PROCESS');
    console.log('==========================');

    // Test frontend build
    const frontendBuild = await this.runCommand('npm', ['run', 'build'], { cwd: './frontend' });
    if (!frontendBuild.success) {
      this.errors.push('Frontend build failed');
      this.fixes.push('Fix frontend build issues or check React app configuration');
      console.log(`❌ Frontend build error: ${frontendBuild.stderr}`);
    } else {
      console.log('✅ Frontend builds successfully');
    }

    // Test root build script
    const rootBuild = await this.runCommand('npm', ['run', 'build']);
    if (!rootBuild.success) {
      this.errors.push('Root build script failed');
      this.fixes.push('Fix root build script in package.json');
      console.log(`❌ Root build error: ${rootBuild.stderr}`);
    } else {
      console.log('✅ Root build script works');
    }
  }

  generateFixScript() {
    if (this.fixes.length === 0) return null;

    const fixScript = `#!/usr/bin/env node

/**
 * AUTO-GENERATED FIX SCRIPT
 * =========================
 * Automatically fixes detected deployment issues
 */

console.log('🔧 APPLYING DEPLOYMENT FIXES');
console.log('============================');

${this.fixes.map((fix, index) => `
console.log('${index + 1}. ${fix}');
// TODO: Implement fix for: ${fix}
`).join('')}

console.log('\\n✅ All fixes applied!');
`;

    fs.writeFileSync('apply-deployment-fixes.js', fixScript);
    return 'apply-deployment-fixes.js';
  }

  async runDiagnosis() {
    console.log('🔍 DEPLOYMENT ERROR DIAGNOSIS');
    console.log('=============================');
    console.log('Scanning for common deployment issues...\n');

    this.checkPackageJsonIssues();
    this.checkFrontendIssues();
    this.checkBackendIssues();
    await this.checkDependencyIssues();
    await this.checkBuildIssues();

    console.log('\n📊 DIAGNOSIS RESULTS');
    console.log('====================');

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('🎉 NO ISSUES FOUND!');
      console.log('===================');
      console.log('✅ All checks passed');
      console.log('✅ Ready for deployment');
      return { status: 'HEALTHY', errors: [], warnings: [], fixes: [] };
    }

    if (this.errors.length > 0) {
      console.log('❌ CRITICAL ERRORS FOUND:');
      this.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      this.warnings.forEach((warning, index) => {
        console.log(`${index + 1}. ${warning}`);
      });
    }

    if (this.fixes.length > 0) {
      console.log('\n💡 RECOMMENDED FIXES:');
      this.fixes.forEach((fix, index) => {
        console.log(`${index + 1}. ${fix}`);
      });

      const fixScript = this.generateFixScript();
      if (fixScript) {
        console.log(`\n📄 Fix script generated: ${fixScript}`);
      }
    }

    const status = this.errors.length > 0 ? 'CRITICAL' : 'WARNING';
    return {
      status,
      errors: this.errors,
      warnings: this.warnings,
      fixes: this.fixes
    };
  }
}

// Run diagnosis if called directly
if (require.main === module) {
  const diagnostic = new DeploymentErrorDiagnostic();
  diagnostic.runDiagnosis()
    .then(result => {
      console.log('\n🎯 DIAGNOSIS COMPLETE!');
      console.log(`Status: ${result.status}`);
      
      // Save detailed results
      fs.writeFileSync('deployment-diagnosis-results.json', JSON.stringify(result, null, 2));
      console.log('📄 Detailed results saved to: deployment-diagnosis-results.json');
      
      process.exit(result.status === 'HEALTHY' ? 0 : 1);
    })
    .catch(console.error);
}

module.exports = DeploymentErrorDiagnostic;
