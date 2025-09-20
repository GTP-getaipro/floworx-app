#!/usr/bin/env node

/**
 * Critical Issue Detector for FloWorx
 * 
 * Systematically identifies and categorizes critical issues that could block users
 * Similar to the email verification bug we just fixed
 */

const fs = require('fs');
const path = require('path');

class CriticalIssueDetector {
  constructor() {
    this.issues = [];
    this.projectRoot = process.cwd();
    this.criticalPatterns = this.getCriticalPatterns();
  }

  getCriticalPatterns() {
    return [
      // Incomplete/Placeholder Implementations
      {
        id: 'incomplete-implementation',
        severity: 'critical',
        pattern: /(TODO|FIXME|PLACEHOLDER|NOT IMPLEMENTED|PENDING|TEMPORARY)/gi,
        description: 'Incomplete implementations that may block functionality',
        checkFunction: this.checkIncompleteImplementations.bind(this)
      },

      // Missing Error Handling
      {
        id: 'missing-error-handling',
        severity: 'high',
        pattern: /await\s+[^;]+;(?!\s*catch)/g,
        description: 'Async operations without proper error handling',
        checkFunction: this.checkMissingErrorHandling.bind(this)
      },

      // Hardcoded Values That Should Be Dynamic
      {
        id: 'hardcoded-critical-values',
        severity: 'high',
        pattern: /(localhost|127\.0\.0\.1|hardcoded|test@|example\.com)/gi,
        description: 'Hardcoded values that should be configurable',
        checkFunction: this.checkHardcodedValues.bind(this)
      },

      // Missing Authentication/Authorization
      {
        id: 'missing-auth-checks',
        severity: 'critical',
        pattern: /router\.(get|post|put|delete|patch)\s*\([^,]+,\s*(?!.*auth|.*authenticate|.*authorize)/g,
        description: 'API endpoints without authentication checks',
        checkFunction: this.checkMissingAuth.bind(this)
      },

      // Database Operations Without Validation
      {
        id: 'unsafe-db-operations',
        severity: 'high',
        pattern: /(INSERT|UPDATE|DELETE).*VALUES.*\$\{/gi,
        description: 'Potentially unsafe database operations',
        checkFunction: this.checkUnsafeDbOperations.bind(this)
      },

      // Missing Input Validation
      {
        id: 'missing-input-validation',
        severity: 'high',
        pattern: /req\.(body|query|params)\.[a-zA-Z_]+(?!\s*&&|\s*\?|\s*\|\|)/g,
        description: 'Direct use of request data without validation',
        checkFunction: this.checkMissingValidation.bind(this)
      },

      // Inconsistent Error Responses
      {
        id: 'inconsistent-error-responses',
        severity: 'medium',
        pattern: /res\.status\(\d+\)\.json\(/g,
        description: 'Inconsistent error response formats',
        checkFunction: this.checkInconsistentErrors.bind(this)
      },

      // Missing Environment Variables
      {
        id: 'missing-env-vars',
        severity: 'high',
        pattern: /process\.env\.([A-Z_]+)(?!\s*\|\|)/g,
        description: 'Environment variables without fallbacks',
        checkFunction: this.checkMissingEnvVars.bind(this)
      },

      // Potential Memory Leaks
      {
        id: 'potential-memory-leaks',
        severity: 'medium',
        pattern: /(setInterval|setTimeout)(?!.*clear)/g,
        description: 'Timers without cleanup',
        checkFunction: this.checkMemoryLeaks.bind(this)
      },

      // Missing CORS Configuration
      {
        id: 'missing-cors',
        severity: 'high',
        pattern: /app\.use.*cors/gi,
        description: 'CORS configuration issues',
        checkFunction: this.checkCorsConfig.bind(this)
      }
    ];
  }

  async detectAllIssues() {
    console.log('🔍 Starting Critical Issue Detection...\n');

    // Scan all relevant files
    const filesToScan = this.getFilesToScan();
    
    for (const filePath of filesToScan) {
      await this.scanFile(filePath);
    }

    // Generate report
    this.generateReport();
    
    return this.issues;
  }

  getFilesToScan() {
    const extensions = ['.js', '.jsx', '.ts', '.tsx'];
    const excludeDirs = ['node_modules', '.git', 'dist', 'build', 'coverage'];
    
    const files = [];
    
    const scanDirectory = (dir) => {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !excludeDirs.includes(item)) {
          scanDirectory(fullPath);
        } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    };

    scanDirectory(this.projectRoot);
    return files;
  }

  async scanFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(this.projectRoot, filePath);

      for (const pattern of this.criticalPatterns) {
        if (pattern.checkFunction) {
          await pattern.checkFunction(content, relativePath, pattern);
        }
      }
    } catch (error) {
      console.error(`Error scanning ${filePath}:`, error.message);
    }
  }

  // Specific check functions
  checkIncompleteImplementations(content, filePath, pattern) {
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      const matches = line.match(pattern.pattern);
      if (matches) {
        // Check if this is in a comment or actual code
        const trimmedLine = line.trim();
        if (trimmedLine.includes('TODO') || trimmedLine.includes('FIXME') || 
            trimmedLine.includes('NOT IMPLEMENTED') || trimmedLine.includes('PENDING')) {
          this.addIssue({
            type: pattern.id,
            severity: pattern.severity,
            file: filePath,
            line: index + 1,
            message: `Incomplete implementation: ${trimmedLine}`,
            suggestion: 'Complete the implementation or remove placeholder code'
          });
        }
      }
    });
  }

  checkMissingErrorHandling(content, filePath, pattern) {
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if (line.includes('await') && !line.includes('try') && !line.includes('catch')) {
        // Check if the next few lines have catch block
        const nextLines = lines.slice(index + 1, index + 5).join(' ');
        if (!nextLines.includes('catch') && !nextLines.includes('.catch')) {
          this.addIssue({
            type: pattern.id,
            severity: pattern.severity,
            file: filePath,
            line: index + 1,
            message: `Async operation without error handling: ${line.trim()}`,
            suggestion: 'Add try-catch block or .catch() handler'
          });
        }
      }
    });
  }

  checkHardcodedValues(content, filePath, pattern) {
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      const matches = line.match(pattern.pattern);
      if (matches && !line.includes('//') && !line.includes('/*')) {
        matches.forEach(match => {
          if (match.includes('localhost') || match.includes('127.0.0.1') || 
              match.includes('test@') || match.includes('example.com')) {
            this.addIssue({
              type: pattern.id,
              severity: pattern.severity,
              file: filePath,
              line: index + 1,
              message: `Hardcoded value found: ${match}`,
              suggestion: 'Replace with environment variable or configuration'
            });
          }
        });
      }
    });
  }

  checkMissingAuth(content, filePath, pattern) {
    if (!filePath.includes('routes/')) return;

    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if (line.includes('router.') && (line.includes('post') || line.includes('put') || 
          line.includes('delete') || line.includes('patch'))) {
        if (!line.includes('auth') && !line.includes('authenticate') && 
            !line.includes('authorize') && !line.includes('public')) {
          this.addIssue({
            type: pattern.id,
            severity: pattern.severity,
            file: filePath,
            line: index + 1,
            message: `API endpoint without authentication: ${line.trim()}`,
            suggestion: 'Add authentication middleware or mark as public'
          });
        }
      }
    });
  }

  checkUnsafeDbOperations(content, filePath, pattern) {
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if (line.includes('${') && (line.includes('INSERT') || line.includes('UPDATE') || 
          line.includes('DELETE'))) {
        this.addIssue({
          type: pattern.id,
          severity: pattern.severity,
          file: filePath,
          line: index + 1,
          message: `Potentially unsafe database operation: ${line.trim()}`,
          suggestion: 'Use parameterized queries or prepared statements'
        });
      }
    });
  }

  checkMissingValidation(content, filePath, pattern) {
    if (!filePath.includes('routes/')) return;

    const lines = content.split('\n');
    lines.forEach((line, index) => {
      const matches = line.match(/req\.(body|query|params)\.([a-zA-Z_]+)/g);
      if (matches) {
        matches.forEach(match => {
          // Check if there's validation in the same line or nearby lines
          const context = lines.slice(Math.max(0, index - 2), index + 3).join(' ');
          if (!context.includes('validate') && !context.includes('check') && 
              !context.includes('sanitize') && !context.includes('joi') &&
              !context.includes('express-validator')) {
            this.addIssue({
              type: pattern.id,
              severity: pattern.severity,
              file: filePath,
              line: index + 1,
              message: `Direct use of request data without validation: ${match}`,
              suggestion: 'Add input validation using Joi or express-validator'
            });
          }
        });
      }
    });
  }

  checkInconsistentErrors(content, filePath, pattern) {
    const errorResponses = [];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      if (line.includes('res.status') && line.includes('.json')) {
        errorResponses.push({ line: index + 1, content: line.trim() });
      }
    });

    // Check for inconsistent error formats
    if (errorResponses.length > 1) {
      const formats = errorResponses.map(resp => {
        if (resp.content.includes('"error"')) return 'error_object';
        if (resp.content.includes('"message"')) return 'message_only';
        if (resp.content.includes('"success"')) return 'success_flag';
        return 'other';
      });

      const uniqueFormats = [...new Set(formats)];
      if (uniqueFormats.length > 1) {
        this.addIssue({
          type: pattern.id,
          severity: pattern.severity,
          file: filePath,
          line: errorResponses[0].line,
          message: `Inconsistent error response formats found`,
          suggestion: 'Standardize error response format across all endpoints'
        });
      }
    }
  }

  checkMissingEnvVars(content, filePath, pattern) {
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      const matches = line.match(/process\.env\.([A-Z_]+)/g);
      if (matches) {
        matches.forEach(match => {
          if (!line.includes('||') && !line.includes('??')) {
            this.addIssue({
              type: pattern.id,
              severity: pattern.severity,
              file: filePath,
              line: index + 1,
              message: `Environment variable without fallback: ${match}`,
              suggestion: 'Add fallback value or validation for required env vars'
            });
          }
        });
      }
    });
  }

  checkMemoryLeaks(content, filePath, pattern) {
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if ((line.includes('setInterval') || line.includes('setTimeout')) && 
          !content.includes('clearInterval') && !content.includes('clearTimeout')) {
        this.addIssue({
          type: pattern.id,
          severity: pattern.severity,
          file: filePath,
          line: index + 1,
          message: `Timer without cleanup: ${line.trim()}`,
          suggestion: 'Add cleanup logic to clear timers'
        });
      }
    });
  }

  checkCorsConfig(content, filePath, pattern) {
    if (filePath.includes('server.js') || filePath.includes('app.js')) {
      if (!content.includes('cors')) {
        this.addIssue({
          type: pattern.id,
          severity: pattern.severity,
          file: filePath,
          line: 1,
          message: 'Missing CORS configuration',
          suggestion: 'Add CORS middleware for cross-origin requests'
        });
      }
    }
  }

  addIssue(issue) {
    this.issues.push({
      ...issue,
      timestamp: new Date().toISOString()
    });
  }

  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('🚨 CRITICAL ISSUE DETECTION REPORT');
    console.log('='.repeat(80));

    const issuesBySeverity = this.groupBySeverity();
    
    ['critical', 'high', 'medium', 'low'].forEach(severity => {
      const issues = issuesBySeverity[severity] || [];
      if (issues.length === 0) return;

      const icon = this.getSeverityIcon(severity);
      console.log(`\n${icon} ${severity.toUpperCase()} ISSUES (${issues.length})`);
      console.log('-'.repeat(50));

      issues.slice(0, 10).forEach(issue => {
        console.log(`📁 ${issue.file}:${issue.line}`);
        console.log(`   ${issue.message}`);
        console.log(`   💡 ${issue.suggestion}`);
        console.log('');
      });

      if (issues.length > 10) {
        console.log(`   ... and ${issues.length - 10} more issues`);
      }
    });

    console.log('\n' + '='.repeat(80));
    console.log(`📊 TOTAL ISSUES FOUND: ${this.issues.length}`);
    console.log('='.repeat(80));

    // Save detailed report
    this.saveDetailedReport();
  }

  groupBySeverity() {
    return this.issues.reduce((groups, issue) => {
      const severity = issue.severity || 'medium';
      groups[severity] = groups[severity] || [];
      groups[severity].push(issue);
      return groups;
    }, {});
  }

  getSeverityIcon(severity) {
    const icons = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢'
    };
    return icons[severity] || '⚪';
  }

  saveDetailedReport() {
    const reportPath = path.join(this.projectRoot, 'critical-issues-report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      totalIssues: this.issues.length,
      issuesBySeverity: this.groupBySeverity(),
      issues: this.issues
    }, null, 2));

    console.log(`📄 Detailed report saved: ${reportPath}`);
  }
}

// Run if called directly
if (require.main === module) {
  const detector = new CriticalIssueDetector();
  detector.detectAllIssues().then(() => {
    console.log('\n✅ Critical issue detection completed!');
  }).catch(error => {
    console.error('❌ Error during detection:', error);
    process.exit(1);
  });
}

module.exports = CriticalIssueDetector;
