#!/usr/bin/env node

/**
 * Security Audit Script for FloWorx SaaS
 * Comprehensive security scanning and vulnerability assessment
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Security audit configuration
const SECURITY_CONFIG = {
  // File patterns to scan for security issues
  scanPatterns: ['**/*.js', '**/*.json', '**/*.sql', '**/*.env*'],

  // Exclude patterns
  excludePatterns: ['node_modules/**', 'coverage/**', 'dist/**', 'build/**', '*.test.js', '*.spec.js'],

  // Security rules
  rules: {
    // SQL injection patterns
    sqlInjection: [
      /query\s*\(\s*[`'"]\s*SELECT.*\+/gi,
      /query\s*\(\s*[`'"].*\$\{.*\}/gi,
      /\$\{.*\}.*WHERE/gi,
      /WHERE.*\+.*\+/gi
    ],

    // Hardcoded secrets
    hardcodedSecrets: [
      /password\s*[:=]\s*[`'"][^`'"]{8,}/gi,
      /secret\s*[:=]\s*[`'"][^`'"]{16,}/gi,
      /api[_-]?key\s*[:=]\s*[`'"][^`'"]{16,}/gi,
      /token\s*[:=]\s*[`'"][^`'"]{20,}/gi,
      /private[_-]?key\s*[:=]\s*[`'"][^`'"]{32,}/gi
    ],

    // Insecure crypto
    insecureCrypto: [
      /crypto\.createHash\s*\(\s*[`'"]md5[`'"]/gi,
      /crypto\.createHash\s*\(\s*[`'"]sha1[`'"]/gi,
      /Math\.random\(\)/gi,
      /new Date\(\)\.getTime\(\)/gi
    ],

    // Dangerous functions
    dangerousFunctions: [
      /eval\s*\(/gi,
      /Function\s*\(/gi,
      /setTimeout\s*\(\s*[`'"][^`'"]*[`'"]/gi,
      /setInterval\s*\(\s*[`'"][^`'"]*[`'"]/gi,
      /innerHTML\s*=/gi,
      /document\.write\s*\(/gi
    ],

    // Missing input validation
    missingValidation: [
      /req\.body\.[a-zA-Z_$][a-zA-Z0-9_$]*(?!\s*\.\s*validate)/gi,
      /req\.query\.[a-zA-Z_$][a-zA-Z0-9_$]*(?!\s*\.\s*validate)/gi,
      /req\.params\.[a-zA-Z_$][a-zA-Z0-9_$]*(?!\s*\.\s*validate)/gi
    ]
  }
};

/**
 * Security audit results
 */
class SecurityAudit {
  constructor() {
    this.results = {
      summary: {
        totalFiles: 0,
        scannedFiles: 0,
        vulnerabilities: 0,
        warnings: 0,
        info: 0
      },
      findings: [],
      recommendations: []
    };
  }

  /**
   * Add a security finding
   */
  addFinding(type, severity, file, line, message, code = null) {
    this.results.findings.push({
      type,
      severity,
      file: path.relative(process.cwd(), file),
      line,
      message,
      code: code ? code.trim() : null,
      timestamp: new Date().toISOString()
    });

    // Update summary
    switch (severity) {
      case 'high':
      case 'critical':
        this.results.summary.vulnerabilities++;
        break;
      case 'medium':
        this.results.summary.warnings++;
        break;
      case 'low':
        this.results.summary.info++;
        break;
    }
  }

  /**
   * Add a security recommendation
   */
  addRecommendation(category, priority, description, action) {
    this.results.recommendations.push({
      category,
      priority,
      description,
      action,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Scan a file for security issues
   */
  scanFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      this.results.summary.scannedFiles++;

      // Check each rule category
      this.checkSqlInjection(filePath, lines);
      this.checkHardcodedSecrets(filePath, lines);
      this.checkInsecureCrypto(filePath, lines);
      this.checkDangerousFunctions(filePath, lines);
      this.checkMissingValidation(filePath, lines);
      this.checkFilePermissions(filePath);
    } catch (error) {
      this.addFinding('scan_error', 'medium', filePath, 0, `Failed to scan file: ${error.message}`);
    }
  }

  /**
   * Check for SQL injection vulnerabilities
   */
  checkSqlInjection(filePath, lines) {
    lines.forEach((line, index) => {
      SECURITY_CONFIG.rules.sqlInjection.forEach(pattern => {
        if (pattern.test(line)) {
          this.addFinding(
            'sql_injection',
            'high',
            filePath,
            index + 1,
            'Potential SQL injection vulnerability detected',
            line
          );
        }
      });
    });
  }

  /**
   * Check for hardcoded secrets
   */
  checkHardcodedSecrets(filePath, lines) {
    // Skip .env files as they're expected to have secrets
    if (path.basename(filePath).startsWith('.env')) {
      return;
    }

    lines.forEach((line, index) => {
      SECURITY_CONFIG.rules.hardcodedSecrets.forEach(pattern => {
        if (pattern.test(line)) {
          this.addFinding(
            'hardcoded_secret',
            'critical',
            filePath,
            index + 1,
            'Hardcoded secret or credential detected',
            line.replace(/[`'"][^`'"]{8,}[`'"]/g, '[REDACTED]')
          );
        }
      });
    });
  }

  /**
   * Check for insecure cryptographic practices
   */
  checkInsecureCrypto(filePath, lines) {
    lines.forEach((line, index) => {
      SECURITY_CONFIG.rules.insecureCrypto.forEach(pattern => {
        if (pattern.test(line)) {
          this.addFinding(
            'insecure_crypto',
            'medium',
            filePath,
            index + 1,
            'Insecure cryptographic practice detected',
            line
          );
        }
      });
    });
  }

  /**
   * Check for dangerous functions
   */
  checkDangerousFunctions(filePath, lines) {
    lines.forEach((line, index) => {
      SECURITY_CONFIG.rules.dangerousFunctions.forEach(pattern => {
        if (pattern.test(line)) {
          this.addFinding('dangerous_function', 'high', filePath, index + 1, 'Dangerous function usage detected', line);
        }
      });
    });
  }

  /**
   * Check for missing input validation
   */
  checkMissingValidation(filePath, lines) {
    // Only check route files
    if (!filePath.includes('/routes/')) {
      return;
    }

    lines.forEach((line, index) => {
      SECURITY_CONFIG.rules.missingValidation.forEach(pattern => {
        if (pattern.test(line)) {
          this.addFinding(
            'missing_validation',
            'medium',
            filePath,
            index + 1,
            'Potential missing input validation',
            line
          );
        }
      });
    });
  }

  /**
   * Check file permissions
   */
  checkFilePermissions(filePath) {
    try {
      const stats = fs.statSync(filePath);
      const mode = stats.mode & parseInt('777', 8);

      // Check for overly permissive files
      if (mode & parseInt('002', 8)) {
        // World writable
        this.addFinding('file_permissions', 'medium', filePath, 0, 'File is world-writable');
      }

      // Check for sensitive files with wrong permissions
      if (filePath.includes('.env') && mode & parseInt('044', 8)) {
        this.addFinding('file_permissions', 'high', filePath, 0, 'Environment file is readable by others');
      }
    } catch (error) {
      // Ignore permission check errors
    }
  }

  /**
   * Generate security recommendations
   */
  generateRecommendations() {
    const findings = this.results.findings;

    // SQL injection recommendations
    if (findings.some(f => f.type === 'sql_injection')) {
      this.addRecommendation(
        'database',
        'high',
        'SQL injection vulnerabilities detected',
        'Replace string concatenation with parameterized queries or use an ORM'
      );
    }

    // Hardcoded secrets recommendations
    if (findings.some(f => f.type === 'hardcoded_secret')) {
      this.addRecommendation(
        'secrets',
        'critical',
        'Hardcoded secrets found in source code',
        'Move all secrets to environment variables and add .env files to .gitignore'
      );
    }

    // Crypto recommendations
    if (findings.some(f => f.type === 'insecure_crypto')) {
      this.addRecommendation(
        'cryptography',
        'medium',
        'Insecure cryptographic practices detected',
        'Use secure hash algorithms (SHA-256+) and cryptographically secure random generators'
      );
    }

    // Validation recommendations
    if (findings.some(f => f.type === 'missing_validation')) {
      this.addRecommendation(
        'validation',
        'medium',
        'Missing input validation detected',
        'Implement comprehensive input validation using Joi schemas or similar'
      );
    }
  }

  /**
   * Run dependency audit
   */
  runDependencyAudit() {
    try {
      console.log('🔍 Running npm audit...');
      const auditResult = execSync('npm audit --json', { encoding: 'utf8' });
      const audit = JSON.parse(auditResult);

      if (audit.vulnerabilities) {
        Object.entries(audit.vulnerabilities).forEach(([pkg, vuln]) => {
          this.addFinding(
            'dependency_vulnerability',
            vuln.severity,
            'package.json',
            0,
            `Vulnerable dependency: ${pkg} - ${vuln.title}`,
            `${pkg}@${vuln.range}`
          );
        });
      }
    } catch (error) {
      console.warn('⚠️ npm audit failed:', error.message);
    }
  }

  /**
   * Generate security report
   */
  generateReport() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFile = path.join(process.cwd(), 'reports', `security-audit-${timestamp}.json`);

    // Ensure reports directory exists
    const reportsDir = path.dirname(reportFile);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Generate recommendations
    this.generateRecommendations();

    // Write report
    fs.writeFileSync(reportFile, JSON.stringify(this.results, null, 2));

    return reportFile;
  }
}

/**
 * Main audit function
 */
async function runSecurityAudit() {
  console.log('🔒 Starting FloWorx Security Audit...');
  console.log('=====================================');

  const audit = new SecurityAudit();

  // Get all files to scan
  const glob = require('glob');
  const files = glob.sync('**/*.{js,json,sql}', {
    ignore: SECURITY_CONFIG.excludePatterns
  });

  audit.results.summary.totalFiles = files.length;

  console.log(`📁 Scanning ${files.length} files...`);

  // Scan each file
  files.forEach(file => {
    audit.scanFile(file);
  });

  // Run dependency audit
  audit.runDependencyAudit();

  // Generate report
  const reportFile = audit.generateReport();

  // Display summary
  console.log('\n📊 Security Audit Summary:');
  console.log('==========================');
  console.log(`Files scanned: ${audit.results.summary.scannedFiles}`);
  console.log(`🚨 Critical/High: ${audit.results.summary.vulnerabilities}`);
  console.log(`⚠️  Medium: ${audit.results.summary.warnings}`);
  console.log(`ℹ️  Low/Info: ${audit.results.summary.info}`);
  console.log(`📋 Recommendations: ${audit.results.recommendations.length}`);
  console.log(`📄 Report saved: ${reportFile}`);

  // Exit with error code if vulnerabilities found
  if (audit.results.summary.vulnerabilities > 0) {
    console.log('\n❌ Security vulnerabilities detected!');
    process.exit(1);
  } else {
    console.log('\n✅ No critical security issues found.');
  }
}

// Run audit if called directly
if (require.main === module) {
  runSecurityAudit().catch(error => {
    console.error('❌ Security audit failed:', error);
    process.exit(1);
  });
}

module.exports = { runSecurityAudit, SecurityAudit };
