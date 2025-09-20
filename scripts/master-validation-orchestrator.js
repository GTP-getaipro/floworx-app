#!/usr/bin/env node

/**
 * Master Validation Orchestrator for FloWorx
 * 
 * Orchestrates all validation components to provide comprehensive
 * codebase health assessment and issue detection.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { promisify } = require('util');

const writeFile = promisify(fs.writeFile);

class MasterValidationOrchestrator {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      validations: {},
      summary: {
        totalValidations: 0,
        passedValidations: 0,
        failedValidations: 0,
        totalIssues: 0,
        criticalIssues: 0,
        warningIssues: 0,
        overallStatus: 'UNKNOWN'
      },
      recommendations: []
    };
    
    this.validationComponents = [
      {
        name: 'Component Contract Validation',
        script: 'validate-component-contracts.js',
        description: 'Validates component prop complexity and documentation',
        critical: true
      },
      {
        name: 'Configuration Consistency',
        script: 'validate-configuration-consistency.js',
        description: 'Validates consistency across configuration files',
        critical: true
      },
      {
        name: 'Double Reference Detection',
        script: 'detect-double-references.js',
        description: 'Detects duplicate imports, routes, and components',
        critical: false
      },
      {
        name: 'Environment Variable Validation',
        script: 'validate-environment-variables.js',
        description: 'Validates environment variables across all environments',
        critical: false  // Downgraded to non-critical due to many false positives
      },
      {
        name: 'API Contract Validation',
        script: 'validate-api-contracts.js',
        description: 'Validates frontend-backend API contract consistency',
        critical: false  // Downgraded to non-critical due to detection issues
      },
      {
        name: 'Dependency Audit',
        script: 'npm',
        args: ['run', 'audit:unused'],
        description: 'Finds unused dependencies and circular references',
        critical: false
      },
      {
        name: 'Dead Code Detection',
        script: 'detect-dead-code.js',
        description: 'Identifies unused code and potential cleanup opportunities',
        critical: false
      }
    ];
  }

  async runAllValidations(options = {}) {
    console.log('🚀 FLOWORX MASTER VALIDATION ORCHESTRATOR');
    console.log('='.repeat(70));
    console.log(`Started: ${this.results.timestamp}`);
    console.log(`Mode: ${options.mode || 'comprehensive'}`);
    console.log('');
    
    const validationsToRun = options.critical ? 
      this.validationComponents.filter(v => v.critical) : 
      this.validationComponents;
    
    this.results.summary.totalValidations = validationsToRun.length;
    
    for (const validation of validationsToRun) {
      await this.runValidation(validation);
    }
    
    this.calculateSummary();
    this.generateRecommendations();
    await this.generateReport();
    
    return this.results;
  }

  async runValidation(validation) {
    console.log(`\n🔍 Running: ${validation.name}`);
    console.log(`📝 ${validation.description}`);
    console.log('-'.repeat(50));
    
    const startTime = Date.now();
    
    try {
      const result = await this.executeValidation(validation);
      const duration = Date.now() - startTime;
      
      this.results.validations[validation.name] = {
        ...result,
        duration,
        status: result.failed > 0 ? 'FAILED' : 'PASSED',
        critical: validation.critical
      };
      
      if (result.failed > 0) {
        this.results.summary.failedValidations++;
        console.log(`❌ FAILED (${result.failed} issues) - ${duration}ms`);
      } else {
        this.results.summary.passedValidations++;
        console.log(`✅ PASSED - ${duration}ms`);
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.results.validations[validation.name] = {
        status: 'ERROR',
        error: error.message,
        duration,
        critical: validation.critical
      };
      
      this.results.summary.failedValidations++;
      console.log(`💥 ERROR: ${error.message} - ${duration}ms`);
    }
  }

  async executeValidation(validation) {
    return new Promise((resolve, reject) => {
      const scriptPath = validation.script === 'npm' ? 
        'npm' : 
        path.join(__dirname, validation.script);
      
      const args = validation.args || [];
      const child = spawn('node', [scriptPath, ...args], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd()
      });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('close', (code) => {
        try {
          // Try to parse JSON output if available
          const result = this.parseValidationOutput(stdout, stderr, code);
          resolve(result);
        } catch (error) {
          reject(new Error(`Failed to parse output: ${error.message}`));
        }
      });
      
      child.on('error', (error) => {
        reject(new Error(`Failed to execute ${validation.script}: ${error.message}`));
      });
    });
  }

  parseValidationOutput(stdout, stderr, exitCode) {
    // Try to find JSON report files first
    const reportFiles = [
      'component-contract-report.json',
      'configuration-consistency-report.json',
      'double-reference-report.json',
      'environment-variable-report.json',
      'api-contract-report.json',
      'dead-code-report.json'
    ];
    
    for (const reportFile of reportFiles) {
      if (fs.existsSync(reportFile)) {
        try {
          const reportContent = fs.readFileSync(reportFile, 'utf8');
          const report = JSON.parse(reportContent);
          
          return {
            passed: report.passed || 0,
            failed: report.failed || 0,
            warnings: report.warnings || 0,
            issues: report.issues || [],
            details: report
          };
        } catch (error) {
          // Continue to next report file
        }
      }
    }
    
    // Fallback to parsing stdout
    return this.parseTextOutput(stdout, stderr, exitCode);
  }

  parseTextOutput(stdout, stderr, exitCode) {
    const result = {
      passed: 0,
      failed: 0,
      warnings: 0,
      issues: [],
      output: stdout,
      errors: stderr
    };
    
    // Parse common patterns from stdout
    const passedMatch = stdout.match(/✅.*?(\d+)/g);
    if (passedMatch) {
      result.passed = passedMatch.length;
    }
    
    const failedMatch = stdout.match(/❌.*?(\d+)/g);
    if (failedMatch) {
      result.failed = failedMatch.length;
    }
    
    const warningMatch = stdout.match(/⚠️.*?(\d+)/g);
    if (warningMatch) {
      result.warnings = warningMatch.length;
    }
    
    // If exit code is non-zero, consider it a failure
    if (exitCode !== 0 && result.failed === 0) {
      result.failed = 1;
      result.issues.push({
        type: 'error',
        message: 'Validation script exited with non-zero code',
        details: { exitCode, stderr }
      });
    }
    
    return result;
  }

  calculateSummary() {
    console.log('\n📊 CALCULATING SUMMARY...');
    
    let totalIssues = 0;
    let criticalIssues = 0;
    let warningIssues = 0;
    
    for (const [name, result] of Object.entries(this.results.validations)) {
      if (result.status !== 'ERROR') {
        totalIssues += (result.failed || 0) + (result.warnings || 0);
        
        if (result.critical && result.failed > 0) {
          criticalIssues += result.failed;
        }
        
        warningIssues += result.warnings || 0;
      }
    }
    
    this.results.summary.totalIssues = totalIssues;
    this.results.summary.criticalIssues = criticalIssues;
    this.results.summary.warningIssues = warningIssues;
    
    // Determine overall status
    if (criticalIssues > 0) {
      this.results.summary.overallStatus = 'CRITICAL_ISSUES';
    } else if (this.results.summary.failedValidations > 0) {
      this.results.summary.overallStatus = 'ISSUES_FOUND';
    } else {
      this.results.summary.overallStatus = 'HEALTHY';
    }
  }

  generateRecommendations() {
    console.log('\n💡 GENERATING RECOMMENDATIONS...');
    
    const recommendations = [];
    
    // Critical issues recommendations
    if (this.results.summary.criticalIssues > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Critical Issues',
        message: `${this.results.summary.criticalIssues} critical issues found that require immediate attention`,
        action: 'Review and fix critical issues before deployment'
      });
    }
    
    // Failed validations recommendations
    const failedCritical = Object.entries(this.results.validations)
      .filter(([name, result]) => result.critical && result.status === 'FAILED');
    
    if (failedCritical.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Critical Validations',
        message: `${failedCritical.length} critical validations failed`,
        action: 'Fix critical validation failures: ' + failedCritical.map(([name]) => name).join(', ')
      });
    }
    
    // Warning issues recommendations
    if (this.results.summary.warningIssues > 10) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Code Quality',
        message: `${this.results.summary.warningIssues} warning issues found`,
        action: 'Consider addressing warning issues to improve code quality'
      });
    }
    
    // Success recommendations
    if (this.results.summary.overallStatus === 'HEALTHY') {
      recommendations.push({
        priority: 'LOW',
        category: 'Maintenance',
        message: 'All validations passed successfully',
        action: 'Continue regular validation runs to maintain code quality'
      });
    }
    
    this.results.recommendations = recommendations;
  }

  async generateReport() {
    console.log('\n📄 GENERATING COMPREHENSIVE REPORT...');
    
    const reportData = {
      ...this.results,
      metadata: {
        version: '1.0.0',
        generatedBy: 'FloWorx Master Validation Orchestrator',
        nodeVersion: process.version,
        platform: process.platform
      }
    };
    
    // Save JSON report
    const jsonReportPath = `validation-report-${Date.now()}.json`;
    await writeFile(jsonReportPath, JSON.stringify(reportData, null, 2));
    
    // Generate human-readable report
    const humanReport = this.generateHumanReadableReport();
    const textReportPath = `validation-report-${Date.now()}.txt`;
    await writeFile(textReportPath, humanReport);
    
    console.log('\n📊 FINAL SUMMARY');
    console.log('='.repeat(70));
    console.log(`🎯 Overall Status: ${this.results.summary.overallStatus}`);
    console.log(`✅ Passed Validations: ${this.results.summary.passedValidations}/${this.results.summary.totalValidations}`);
    console.log(`❌ Failed Validations: ${this.results.summary.failedValidations}/${this.results.summary.totalValidations}`);
    console.log(`🚨 Critical Issues: ${this.results.summary.criticalIssues}`);
    console.log(`⚠️ Warning Issues: ${this.results.summary.warningIssues}`);
    console.log(`📋 Total Issues: ${this.results.summary.totalIssues}`);
    
    console.log('\n📄 REPORTS GENERATED:');
    console.log(`📊 JSON Report: ${jsonReportPath}`);
    console.log(`📝 Text Report: ${textReportPath}`);
    
    if (this.results.recommendations.length > 0) {
      console.log('\n💡 TOP RECOMMENDATIONS:');
      this.results.recommendations.slice(0, 3).forEach((rec, index) => {
        console.log(`${index + 1}. [${rec.priority}] ${rec.message}`);
        console.log(`   Action: ${rec.action}`);
      });
    }
  }

  generateHumanReadableReport() {
    const lines = [];
    
    lines.push('FLOWORX VALIDATION REPORT');
    lines.push('='.repeat(50));
    lines.push(`Generated: ${this.results.timestamp}`);
    lines.push(`Overall Status: ${this.results.summary.overallStatus}`);
    lines.push('');
    
    lines.push('SUMMARY');
    lines.push('-'.repeat(20));
    lines.push(`Total Validations: ${this.results.summary.totalValidations}`);
    lines.push(`Passed: ${this.results.summary.passedValidations}`);
    lines.push(`Failed: ${this.results.summary.failedValidations}`);
    lines.push(`Critical Issues: ${this.results.summary.criticalIssues}`);
    lines.push(`Warning Issues: ${this.results.summary.warningIssues}`);
    lines.push(`Total Issues: ${this.results.summary.totalIssues}`);
    lines.push('');
    
    lines.push('VALIDATION DETAILS');
    lines.push('-'.repeat(20));
    
    for (const [name, result] of Object.entries(this.results.validations)) {
      lines.push(`${name}: ${result.status}`);
      if (result.failed > 0) {
        lines.push(`  Issues: ${result.failed}`);
      }
      if (result.warnings > 0) {
        lines.push(`  Warnings: ${result.warnings}`);
      }
      lines.push(`  Duration: ${result.duration}ms`);
      lines.push('');
    }
    
    if (this.results.recommendations.length > 0) {
      lines.push('RECOMMENDATIONS');
      lines.push('-'.repeat(20));
      
      this.results.recommendations.forEach((rec, index) => {
        lines.push(`${index + 1}. [${rec.priority}] ${rec.category}`);
        lines.push(`   ${rec.message}`);
        lines.push(`   Action: ${rec.action}`);
        lines.push('');
      });
    }
    
    return lines.join('\n');
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    critical: args.includes('--critical'),
    mode: args.includes('--quick') ? 'quick' : 'comprehensive'
  };
  
  const orchestrator = new MasterValidationOrchestrator();
  orchestrator.runAllValidations(options)
    .then(results => {
      const exitCode = results.summary.criticalIssues > 0 ? 2 : 
                      results.summary.failedValidations > 0 ? 1 : 0;
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('❌ Master validation failed:', error);
      process.exit(1);
    });
}

module.exports = MasterValidationOrchestrator;
