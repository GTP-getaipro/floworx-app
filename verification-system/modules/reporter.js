const fs = require('fs');
const path = require('path');

/**
 * Reporter
 * 
 * Generates comprehensive reports:
 * - Console output with colors and formatting
 * - JSON reports for automation
 * - HTML reports for detailed analysis
 * - Issue tracking and recommendations
 */
class Reporter {
  constructor(config) {
    this.config = config;
    this.reportsDir = path.join(this.config.projectRoot, 'verification-system', 'reports');
    this.ensureReportsDirectory();
  }

  generateConsole(results) {
    console.log('\n' + '='.repeat(80));
    console.log('🎯 FLOWORX VERIFICATION SYSTEM REPORT');
    console.log('='.repeat(80));
    
    this.printSummary(results);
    this.printModuleResults(results);
    this.printIssues(results);
    this.printFixes(results);
    this.printRecommendations(results);
    this.printFooter(results);
  }

  printSummary(results) {
    const { summary } = results;
    const successRate = summary.total > 0 ? ((summary.passed / summary.total) * 100).toFixed(1) : 0;
    
    console.log('\n📊 SUMMARY');
    console.log('-'.repeat(40));
    console.log(`⏱️  Duration: ${results.duration}ms`);
    console.log(`📋 Mode: ${results.mode.toUpperCase()}`);
    console.log(`🎯 Success Rate: ${successRate}%`);
    console.log(`✅ Passed: ${summary.passed}`);
    console.log(`❌ Failed: ${summary.failed}`);
    console.log(`⚠️  Warnings: ${summary.warnings}`);
    console.log(`🔧 Fixed: ${summary.fixed}`);
    console.log(`📝 Total Checks: ${summary.total}`);
  }

  printModuleResults(results) {
    if (Object.keys(results.modules).length === 0) return;

    console.log('\n🔍 MODULE RESULTS');
    console.log('-'.repeat(40));

    Object.entries(results.modules).forEach(([moduleName, moduleResults]) => {
      const status = moduleResults.summary.failed > 0 ? '❌' : '✅';
      const successRate = moduleResults.summary.total > 0 
        ? ((moduleResults.summary.passed / moduleResults.summary.total) * 100).toFixed(1)
        : 0;

      console.log(`${status} ${this.formatModuleName(moduleName)}: ${successRate}% (${moduleResults.summary.passed}/${moduleResults.summary.total})`);
      
      // Show specific test results for integration tests
      if (moduleName === 'integrationTester' && moduleResults.tests) {
        moduleResults.tests.forEach(test => {
          const testStatus = test.status === 'passed' ? '  ✅' : '  ❌';
          console.log(`${testStatus} ${test.name} (${test.duration}ms)`);
        });
      }

      // Show health check results
      if (moduleName === 'healthMonitor' && moduleResults.healthChecks) {
        moduleResults.healthChecks.forEach(check => {
          const checkStatus = check.status === 'healthy' ? '  💚' : '  💔';
          console.log(`${checkStatus} ${check.name} (${check.duration}ms)`);
        });
      }
    });
  }

  printIssues(results) {
    if (results.issues.length === 0) {
      console.log('\n✨ NO ISSUES FOUND');
      return;
    }

    console.log(`\n🚨 ISSUES FOUND (${results.issues.length})`);
    console.log('-'.repeat(40));

    const issuesBySeverity = this.groupBySeverity(results.issues);
    
    ['critical', 'high', 'medium', 'low'].forEach(severity => {
      const issues = issuesBySeverity[severity] || [];
      if (issues.length === 0) return;

      const icon = this.getSeverityIcon(severity);
      console.log(`\n${icon} ${severity.toUpperCase()} (${issues.length})`);
      
      issues.slice(0, 5).forEach(issue => { // Show max 5 per severity
        console.log(`  • ${issue.message}`);
        if (issue.filePath) {
          console.log(`    📁 ${issue.filePath}`);
        }
      });

      if (issues.length > 5) {
        console.log(`  ... and ${issues.length - 5} more`);
      }
    });
  }

  printFixes(results) {
    if (!results.fixes || results.fixes.length === 0) return;

    console.log(`\n🔧 AUTOMATIC FIXES APPLIED (${results.fixes.length})`);
    console.log('-'.repeat(40));

    const fixesByType = {};
    results.fixes.forEach(fix => {
      if (fix.status === 'fixed') {
        fixesByType[fix.fixType] = (fixesByType[fix.fixType] || 0) + 1;
      }
    });

    Object.entries(fixesByType).forEach(([fixType, count]) => {
      console.log(`✅ ${this.formatFixType(fixType)}: ${count} fixed`);
    });

    const failedFixes = results.fixes.filter(f => f.status === 'failed');
    if (failedFixes.length > 0) {
      console.log(`❌ Failed to fix: ${failedFixes.length} issues`);
    }
  }

  printRecommendations(results) {
    if (results.recommendations.length === 0) return;

    console.log(`\n💡 RECOMMENDATIONS (${results.recommendations.length})`);
    console.log('-'.repeat(40));

    const sortedRecommendations = results.recommendations.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    sortedRecommendations.forEach((rec, index) => {
      const icon = this.getPriorityIcon(rec.priority);
      console.log(`${icon} ${rec.recommendation}`);
      if (rec.count) {
        console.log(`   📊 Affected items: ${rec.count}`);
      }
    });
  }

  printFooter(results) {
    console.log('\n' + '='.repeat(80));
    
    const overallStatus = results.summary.failed === 0 ? '✅ SYSTEM HEALTHY' : '⚠️  ISSUES DETECTED';
    console.log(`${overallStatus} - Report generated at ${results.timestamp}`);
    
    if (results.summary.failed > 0) {
      console.log('🔧 Run with --fix flag to attempt automatic resolution');
    }
    
    console.log('📄 Detailed reports available in verification-system/reports/');
    console.log('='.repeat(80) + '\n');
  }

  async generateJSON(results) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `verification-report-${timestamp}.json`;
    const filepath = path.join(this.reportsDir, filename);

    const jsonReport = {
      ...results,
      generatedAt: new Date().toISOString(),
      reportType: 'json',
      version: '1.0.0'
    };

    fs.writeFileSync(filepath, JSON.stringify(jsonReport, null, 2), 'utf8');
    console.log(`📄 JSON report saved: ${filename}`);
    
    return filepath;
  }

  async generateHTML(results) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `verification-report-${timestamp}.html`;
    const filepath = path.join(this.reportsDir, filename);

    const htmlContent = this.generateHTMLContent(results);
    fs.writeFileSync(filepath, htmlContent, 'utf8');
    
    console.log(`📄 HTML report saved: ${filename}`);
    return filepath;
  }

  generateHTMLContent(results) {
    const { summary } = results;
    const successRate = summary.total > 0 ? ((summary.passed / summary.total) * 100).toFixed(1) : 0;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FloWorx Verification Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
        .content { padding: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; color: #333; }
        .metric-label { color: #666; margin-top: 5px; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px; }
        .issue { background: #fff; border-left: 4px solid #dc3545; padding: 15px; margin-bottom: 10px; border-radius: 4px; }
        .issue.high { border-left-color: #fd7e14; }
        .issue.medium { border-left-color: #ffc107; }
        .issue.low { border-left-color: #28a745; }
        .recommendation { background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin-bottom: 10px; border-radius: 4px; }
        .timestamp { color: #666; font-size: 0.9em; }
        .success { color: #28a745; }
        .error { color: #dc3545; }
        .warning { color: #ffc107; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 FloWorx Verification System Report</h1>
            <p>Generated on ${new Date(results.timestamp).toLocaleString()}</p>
            <p>Mode: ${results.mode.toUpperCase()} | Duration: ${results.duration}ms</p>
        </div>
        
        <div class="content">
            <div class="summary">
                <div class="metric">
                    <div class="metric-value ${successRate >= 90 ? 'success' : successRate >= 70 ? 'warning' : 'error'}">${successRate}%</div>
                    <div class="metric-label">Success Rate</div>
                </div>
                <div class="metric">
                    <div class="metric-value success">${summary.passed}</div>
                    <div class="metric-label">Passed</div>
                </div>
                <div class="metric">
                    <div class="metric-value error">${summary.failed}</div>
                    <div class="metric-label">Failed</div>
                </div>
                <div class="metric">
                    <div class="metric-value warning">${summary.warnings}</div>
                    <div class="metric-label">Warnings</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${summary.fixed}</div>
                    <div class="metric-label">Fixed</div>
                </div>
            </div>

            ${this.generateHTMLIssues(results.issues)}
            ${this.generateHTMLRecommendations(results.recommendations)}
            ${this.generateHTMLModules(results.modules)}
        </div>
    </div>
</body>
</html>`;
  }

  generateHTMLIssues(issues) {
    if (issues.length === 0) return '<div class="section"><h2>✨ No Issues Found</h2></div>';

    const issuesHTML = issues.map(issue => `
        <div class="issue ${issue.severity}">
            <strong>${issue.message}</strong>
            ${issue.filePath ? `<br><small>📁 ${issue.filePath}</small>` : ''}
            <div class="timestamp">${new Date(issue.timestamp).toLocaleString()}</div>
        </div>
    `).join('');

    return `
        <div class="section">
            <h2>🚨 Issues Found (${issues.length})</h2>
            ${issuesHTML}
        </div>
    `;
  }

  generateHTMLRecommendations(recommendations) {
    if (recommendations.length === 0) return '';

    const recommendationsHTML = recommendations.map(rec => `
        <div class="recommendation">
            <strong>${rec.recommendation}</strong>
            ${rec.count ? `<br><small>📊 Affected items: ${rec.count}</small>` : ''}
        </div>
    `).join('');

    return `
        <div class="section">
            <h2>💡 Recommendations (${recommendations.length})</h2>
            ${recommendationsHTML}
        </div>
    `;
  }

  generateHTMLModules(modules) {
    if (Object.keys(modules).length === 0) return '';

    const modulesHTML = Object.entries(modules).map(([name, results]) => {
      const successRate = results.summary.total > 0 
        ? ((results.summary.passed / results.summary.total) * 100).toFixed(1)
        : 0;
      
      return `
        <div style="margin-bottom: 20px;">
            <h3>${this.formatModuleName(name)}</h3>
            <p>Success Rate: ${successRate}% (${results.summary.passed}/${results.summary.total})</p>
        </div>
      `;
    }).join('');

    return `
        <div class="section">
            <h2>🔍 Module Results</h2>
            ${modulesHTML}
        </div>
    `;
  }

  // Helper methods
  ensureReportsDirectory() {
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  groupBySeverity(issues) {
    return issues.reduce((groups, issue) => {
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

  getPriorityIcon(priority) {
    const icons = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢'
    };
    return icons[priority] || '⚪';
  }

  formatModuleName(name) {
    const names = {
      staticAnalyzer: 'Static Code Analysis',
      integrationTester: 'Integration Testing',
      healthMonitor: 'Health Monitoring',
      autoResolver: 'Auto Resolution'
    };
    return names[name] || name;
  }

  formatFixType(fixType) {
    const types = {
      method_rename: 'Method Renaming',
      warning_comment: 'Warning Comments',
      import_removal: 'Import Cleanup',
      env_var_replacement: 'Environment Variables',
      todo_comment: 'TODO Comments'
    };
    return types[fixType] || fixType;
  }
}

module.exports = Reporter;
