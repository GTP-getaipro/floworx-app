#!/usr/bin/env node

/**
 * Security Configuration Audit Script
 * Identifies and fixes security configuration issues
 */

const fs = require('fs');
const path = require('path');

class SecurityConfigAudit {
  constructor() {
    this.rootDir = process.cwd();
    this.findings = [];
    this.fixes = [];
  }

  /**
   * Run comprehensive security audit
   */
  async audit() {
    console.log('🔒 Starting Security Configuration Audit...');
    console.log('============================================');

    // Check for sensitive files in root
    this.checkSensitiveFilesInRoot();
    
    // Check environment configurations
    this.checkEnvironmentConfigurations();
    
    // Check file permissions
    this.checkFilePermissions();
    
    // Check for hardcoded secrets
    this.checkHardcodedSecrets();
    
    // Generate report
    this.generateSecurityReport();
    
    console.log(`\n🔍 Security audit completed`);
    console.log(`📋 ${this.findings.length} findings identified`);
    console.log(`🔧 ${this.fixes.length} fixes recommended`);
  }

  /**
   * Check for sensitive files in root directory
   */
  checkSensitiveFilesInRoot() {
    console.log('\n🔍 Checking for sensitive files in root...');
    
    const sensitivePatterns = [
      /.*-ACTUAL\.txt$/,
      /.*credentials.*\.txt$/,
      /.*secrets.*\.txt$/,
      /.*keys.*\.txt$/,
      /vercel-environment-variables\.txt$/
    ];

    const rootFiles = fs.readdirSync(this.rootDir)
      .filter(file => fs.statSync(path.join(this.rootDir, file)).isFile());

    rootFiles.forEach(file => {
      sensitivePatterns.forEach(pattern => {
        if (pattern.test(file)) {
          this.addFinding('SENSITIVE_FILE_IN_ROOT', 'HIGH', file, 
            'Sensitive configuration file in root directory');
          this.addFix(`Move ${file} to secure location or add to .gitignore`);
        }
      });
    });
  }

  /**
   * Check environment configurations
   */
  checkEnvironmentConfigurations() {
    console.log('\n🔍 Checking environment configurations...');
    
    const envFiles = [
      'backend/.env.example',
      'vercel-environment-variables.txt',
      '.env.example'
    ];

    envFiles.forEach(envFile => {
      const fullPath = path.join(this.rootDir, envFile);
      if (fs.existsSync(fullPath)) {
        this.checkEnvFile(fullPath);
      }
    });
  }

  /**
   * Check individual environment file
   */
  checkEnvFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        // Check for weak default values
        if (line.includes('password') && line.includes('password')) {
          this.addFinding('WEAK_DEFAULT_PASSWORD', 'MEDIUM', filePath, 
            `Line ${index + 1}: Weak default password`);
        }
        
        // Check for missing security variables
        if (line.includes('JWT_SECRET') && line.includes('your_')) {
          this.addFinding('MISSING_JWT_SECRET', 'HIGH', filePath,
            `Line ${index + 1}: JWT secret not configured`);
        }
        
        // Check for HTTP URLs in production configs
        if (line.includes('http://') && !line.includes('localhost')) {
          this.addFinding('INSECURE_HTTP_URL', 'MEDIUM', filePath,
            `Line ${index + 1}: HTTP URL should be HTTPS`);
        }
      });
    } catch (error) {
      this.addFinding('ENV_FILE_READ_ERROR', 'LOW', filePath, 
        `Cannot read environment file: ${error.message}`);
    }
  }

  /**
   * Check file permissions
   */
  checkFilePermissions() {
    console.log('\n🔍 Checking file permissions...');
    
    const sensitiveFiles = [
      'start.sh',
      'setup.js',
      'backend/.env.example'
    ];

    sensitiveFiles.forEach(file => {
      const fullPath = path.join(this.rootDir, file);
      if (fs.existsSync(fullPath)) {
        try {
          const stats = fs.statSync(fullPath);
          const mode = stats.mode;
          
          // Check if file is world-readable (basic check)
          if (mode & 0o004) {
            this.addFinding('WORLD_READABLE_FILE', 'MEDIUM', file,
              'File is world-readable');
            this.addFix(`Restrict permissions for ${file}`);
          }
        } catch (error) {
          this.addFinding('PERMISSION_CHECK_ERROR', 'LOW', file,
            `Cannot check permissions: ${error.message}`);
        }
      }
    });
  }

  /**
   * Check for hardcoded secrets (basic check)
   */
  checkHardcodedSecrets() {
    console.log('\n🔍 Checking for hardcoded secrets...');
    
    const jsFiles = this.findJSFiles(this.rootDir);
    const secretPatterns = [
      /password\s*[:=]\s*['"]\w{8,}['"]/gi,
      /secret\s*[:=]\s*['"]\w{16,}['"]/gi,
      /api[_-]?key\s*[:=]\s*['"]\w{16,}['"]/gi
    ];

    jsFiles.forEach(file => {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          secretPatterns.forEach(pattern => {
            if (pattern.test(line) && !line.includes('.env') && !line.includes('example')) {
              this.addFinding('POTENTIAL_HARDCODED_SECRET', 'HIGH', file,
                `Line ${index + 1}: Potential hardcoded secret`);
            }
          });
        });
      } catch (error) {
        // Skip files that can't be read
      }
    });
  }

  /**
   * Find all JavaScript files
   */
  findJSFiles(dir, files = []) {
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.includes('node_modules') && !item.includes('.git')) {
        this.findJSFiles(fullPath, files);
      } else if (stat.isFile() && item.endsWith('.js')) {
        files.push(fullPath);
      }
    });
    
    return files;
  }

  /**
   * Add security finding
   */
  addFinding(type, severity, file, description) {
    this.findings.push({
      type,
      severity,
      file,
      description,
      timestamp: new Date().toISOString()
    });
    
    const severityColor = {
      'HIGH': '\x1b[31m',
      'MEDIUM': '\x1b[33m',
      'LOW': '\x1b[36m'
    };
    
    console.log(`   ${severityColor[severity]}${severity}\x1b[0m: ${file} - ${description}`);
  }

  /**
   * Add recommended fix
   */
  addFix(description) {
    this.fixes.push({
      description,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Generate security report
   */
  generateSecurityReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFindings: this.findings.length,
        highSeverity: this.findings.filter(f => f.severity === 'HIGH').length,
        mediumSeverity: this.findings.filter(f => f.severity === 'MEDIUM').length,
        lowSeverity: this.findings.filter(f => f.severity === 'LOW').length
      },
      findings: this.findings,
      recommendedFixes: this.fixes,
      nextSteps: [
        'Review all HIGH severity findings immediately',
        'Move sensitive files out of root directory',
        'Update environment configurations with secure defaults',
        'Implement proper file permissions',
        'Run regular security audits'
      ]
    };

    // Ensure docs/security directory exists
    const securityDir = path.join(this.rootDir, 'docs/security');
    if (!fs.existsSync(securityDir)) {
      fs.mkdirSync(securityDir, { recursive: true });
    }

    const reportPath = path.join(securityDir, 'security-config-audit.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📊 Security report saved: ${reportPath}`);
  }
}

// Run audit if called directly
if (require.main === module) {
  const audit = new SecurityConfigAudit();
  audit.audit().catch(console.error);
}

module.exports = SecurityConfigAudit;
