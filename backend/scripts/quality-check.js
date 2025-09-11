#!/usr/bin/env node

/**
 * Comprehensive Code Quality & Security Check Script
 * Automates ESLint, Prettier, security audits, and generates reports
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
// const colors = require('colors'); // Unused - removed

// Configuration
const CONFIG = {
  reportsDir: 'reports',
  eslintConfig: '.eslintrc.js',
  prettierConfig: '.prettierrc.js',
  maxIssues: {
    eslint: 50,
    security: 5,
    coverage: 80
  }
};

// Utility functions
const log = (message, type = 'info') => {
  const timestamp = new Date().toISOString();
  switch (type) {
    case 'success':
      console.log(`[${timestamp}] ✅ ${message}`.green);
      break;
    case 'error':
      console.log(`[${timestamp}] ❌ ${message}`.red);
      break;
    case 'warning':
      console.log(`[${timestamp}] ⚠️  ${message}`.yellow);
      break;
    case 'info':
    default:
      console.log(`[${timestamp}] ℹ️  ${message}`.blue);
      break;
  }
};

const runCommand = (command, options = {}) => {
  try {
    const result = execSync(command, {
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options
    });
    return { success: true, output: result };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      output: error.stdout || error.stderr || ''
    };
  }
};

const ensureReportsDir = () => {
  if (!fs.existsSync(CONFIG.reportsDir)) {
    fs.mkdirSync(CONFIG.reportsDir, { recursive: true });
    log(`Created reports directory: ${CONFIG.reportsDir}`, 'info');
  }
};

const generateTimestamp = () => {
  return new Date().toISOString().replace(/[:.]/g, '-');
};

// Quality check functions
const runESLintCheck = () => {
  log('Running ESLint analysis...', 'info');

  const timestamp = generateTimestamp();
  const reportFile = path.join(CONFIG.reportsDir, `eslint-report-${timestamp}.html`);
  const jsonReportFile = path.join(CONFIG.reportsDir, `eslint-report-${timestamp}.json`);

  // Run ESLint with multiple output formats
  const eslintResult = runCommand(`npx eslint . --ext .js --format json --output-file ${jsonReportFile}`, {
    silent: true
  });
  const _htmlResult = runCommand(`npx eslint . --ext .js --format html --output-file ${reportFile}`, { silent: true });

  let issueCount = 0;
  let errorCount = 0;
  let warningCount = 0;

  if (fs.existsSync(jsonReportFile)) {
    try {
      const eslintData = JSON.parse(fs.readFileSync(jsonReportFile, 'utf8'));
      issueCount = eslintData.reduce((total, file) => total + file.messages.length, 0);
      errorCount = eslintData.reduce(
        (total, file) => total + file.messages.filter(msg => msg.severity === 2).length,
        0
      );
      warningCount = eslintData.reduce(
        (total, file) => total + file.messages.filter(msg => msg.severity === 1).length,
        0
      );
    } catch (error) {
      log(`Failed to parse ESLint JSON report: ${error.message}`, 'warning');
    }
  }

  const result = {
    success: eslintResult.success && errorCount === 0,
    issueCount,
    errorCount,
    warningCount,
    reportFile,
    jsonReportFile
  };

  if (result.success) {
    log(`ESLint check passed! ${warningCount} warnings found.`, 'success');
  } else {
    log(`ESLint check failed! ${errorCount} errors, ${warningCount} warnings found.`, 'error');
  }

  if (issueCount > CONFIG.maxIssues.eslint) {
    log(`Too many ESLint issues (${issueCount} > ${CONFIG.maxIssues.eslint})`, 'warning');
  }

  return result;
};

const runPrettierCheck = () => {
  log('Running Prettier format check...', 'info');

  const result = runCommand('npx prettier --check .', { silent: true });

  if (result.success) {
    log('Prettier check passed! All files are properly formatted.', 'success');
  } else {
    log('Prettier check failed! Some files need formatting.', 'error');
    log('Run "npm run format" to fix formatting issues.', 'info');
  }

  return result;
};

const runSecurityAudit = () => {
  log('Running security audit...', 'info');

  const timestamp = generateTimestamp();
  const reportFile = path.join(CONFIG.reportsDir, `security-audit-${timestamp}.json`);

  // Run npm audit
  const _auditResult = runCommand(`npm audit --json > ${reportFile}`, { silent: true });

  let vulnerabilityCount = 0;
  let criticalCount = 0;
  let highCount = 0;
  let moderateCount = 0;
  let lowCount = 0;

  if (fs.existsSync(reportFile)) {
    try {
      const auditData = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
      if (auditData.metadata && auditData.metadata.vulnerabilities) {
        const vulns = auditData.metadata.vulnerabilities;
        criticalCount = vulns.critical || 0;
        highCount = vulns.high || 0;
        moderateCount = vulns.moderate || 0;
        lowCount = vulns.low || 0;
        vulnerabilityCount = criticalCount + highCount + moderateCount + lowCount;
      }
    } catch (error) {
      log(`Failed to parse security audit report: ${error.message}`, 'warning');
    }
  }

  const result = {
    success: criticalCount === 0 && highCount === 0,
    vulnerabilityCount,
    criticalCount,
    highCount,
    moderateCount,
    lowCount,
    reportFile
  };

  if (result.success) {
    log(
      `Security audit passed! ${vulnerabilityCount} total vulnerabilities (${moderateCount} moderate, ${lowCount} low).`,
      'success'
    );
  } else {
    log(`Security audit failed! ${criticalCount} critical, ${highCount} high vulnerabilities found.`, 'error');
  }

  if (vulnerabilityCount > CONFIG.maxIssues.security) {
    log(`High number of vulnerabilities found (${vulnerabilityCount})`, 'warning');
  }

  return result;
};

const runTestCoverage = () => {
  log('Running test coverage analysis...', 'info');

  const result = runCommand('npm run test:coverage', { silent: true });

  // Parse coverage from output (simplified)
  let coveragePercentage = 0;
  if (result.output) {
    const coverageMatch = result.output.match(/All files[^|]*\|[^|]*\|[^|]*\|[^|]*\|[^|]*(\d+\.?\d*)/);
    if (coverageMatch) {
      coveragePercentage = parseFloat(coverageMatch[1]);
    }
  }

  const coverageResult = {
    success: result.success && coveragePercentage >= CONFIG.maxIssues.coverage,
    coveragePercentage
  };

  if (coverageResult.success) {
    log(`Test coverage passed! ${coveragePercentage}% coverage achieved.`, 'success');
  } else {
    log(`Test coverage insufficient! ${coveragePercentage}% < ${CONFIG.maxIssues.coverage}%`, 'error');
  }

  return coverageResult;
};

const generateSummaryReport = results => {
  const timestamp = generateTimestamp();
  const summaryFile = path.join(CONFIG.reportsDir, `quality-summary-${timestamp}.json`);

  const summary = {
    timestamp: new Date().toISOString(),
    overall: {
      success: Object.values(results).every(r => r.success),
      totalIssues: (results.eslint?.issueCount || 0) + (results.security?.vulnerabilityCount || 0)
    },
    eslint: results.eslint,
    prettier: results.prettier,
    security: results.security,
    coverage: results.coverage,
    recommendations: []
  };

  // Generate recommendations
  if (!results.eslint?.success) {
    summary.recommendations.push('Fix ESLint errors before deployment');
  }
  if (!results.prettier?.success) {
    summary.recommendations.push('Run "npm run format" to fix formatting issues');
  }
  if (!results.security?.success) {
    summary.recommendations.push('Address critical and high security vulnerabilities');
  }
  if (!results.coverage?.success) {
    summary.recommendations.push(`Increase test coverage to at least ${CONFIG.maxIssues.coverage}%`);
  }

  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));

  return { summary, summaryFile };
};

const printSummary = summary => {
  console.log('\n' + '='.repeat(60).cyan);
  console.log('📊 QUALITY CHECK SUMMARY'.cyan.bold);
  console.log('='.repeat(60).cyan);

  const status = summary.overall.success ? '✅ PASSED'.green : '❌ FAILED'.red;
  console.log(`Overall Status: ${status}`);
  console.log(`Total Issues: ${summary.overall.totalIssues}`);

  console.log('\n📋 DETAILED RESULTS:'.cyan);
  console.log(
    `ESLint: ${summary.eslint?.success ? '✅' : '❌'} (${summary.eslint?.errorCount || 0} errors, ${summary.eslint?.warningCount || 0} warnings)`
  );
  console.log(`Prettier: ${summary.prettier?.success ? '✅' : '❌'} (formatting check)`);
  console.log(
    `Security: ${summary.security?.success ? '✅' : '❌'} (${summary.security?.criticalCount || 0} critical, ${summary.security?.highCount || 0} high)`
  );
  console.log(`Coverage: ${summary.coverage?.success ? '✅' : '❌'} (${summary.coverage?.coveragePercentage || 0}%)`);

  if (summary.recommendations.length > 0) {
    console.log('\n💡 RECOMMENDATIONS:'.yellow);
    summary.recommendations.forEach(rec => console.log(`  • ${rec}`.yellow));
  }

  console.log('\n📁 REPORTS GENERATED:'.blue);
  if (summary.eslint?.reportFile) {
    console.log(`  • ESLint: ${summary.eslint.reportFile}`.blue);
  }
  if (summary.security?.reportFile) {
    console.log(`  • Security: ${summary.security.reportFile}`.blue);
  }
};

// Main execution
const main = () => {
  console.log('🔍 FloWorx Backend Quality Check'.cyan.bold);
  console.log('================================'.cyan);

  ensureReportsDir();

  const results = {};

  // Run all quality checks
  results.eslint = runESLintCheck();
  results.prettier = runPrettierCheck();
  results.security = runSecurityAudit();
  results.coverage = runTestCoverage();

  // Generate summary report
  const { summary, summaryFile } = generateSummaryReport(results);

  // Print summary
  printSummary(summary);

  console.log(`\n📄 Summary report: ${summaryFile}`.blue);

  // Exit with appropriate code
  process.exit(summary.overall.success ? 0 : 1);
};

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    log(`Fatal error: ${error.message}`, 'error');
    process.exit(1);
  });
}

module.exports = { main, runESLintCheck, runPrettierCheck, runSecurityAudit, runTestCoverage };
