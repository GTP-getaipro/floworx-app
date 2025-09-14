/**
 * Jest Test Results Processor
 * Processes test results and provides enhanced reporting
 */

const fs = require('fs');
const path = require('path');

/**
 * Process Jest test results
 * @param {Object} results - Jest test results object
 * @returns {Object} - Processed results
 */
function processResults(results) {
  try {
    // Ensure results directory exists
    const resultsDir = path.join(process.cwd(), 'tests', 'results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    // Extract key metrics
    const summary = {
      timestamp: new Date().toISOString(),
      success: results.success,
      numTotalTests: results.numTotalTests,
      numPassedTests: results.numPassedTests,
      numFailedTests: results.numFailedTests,
      numPendingTests: results.numPendingTests,
      numTodoTests: results.numTodoTests,
      testResults: results.testResults.map(testResult => ({
        testFilePath: testResult.testFilePath,
        numPassingTests: testResult.numPassingTests,
        numFailingTests: testResult.numFailingTests,
        numPendingTests: testResult.numPendingTests,
        numTodoTests: testResult.numTodoTests,
        perfStats: testResult.perfStats,
        failureMessage: testResult.failureMessage,
        testResults: testResult.testResults.map(test => ({
          title: test.title,
          fullName: test.fullName,
          status: test.status,
          duration: test.duration,
          failureMessages: test.failureMessages,
          ancestorTitles: test.ancestorTitles
        }))
      }))
    };

    // Write summary to file
    const summaryPath = path.join(resultsDir, 'test-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

    // Generate simple HTML report if needed
    if (process.env.GENERATE_HTML_REPORT === 'true') {
      generateHTMLReport(summary, resultsDir);
    }

    // Log summary to console
    console.log('\n📊 Test Results Summary:');
    console.log(`✅ Passed: ${results.numPassedTests}`);
    console.log(`❌ Failed: ${results.numFailedTests}`);
    console.log(`⏸️  Pending: ${results.numPendingTests}`);
    console.log(`📝 Todo: ${results.numTodoTests}`);
    console.log(`📊 Total: ${results.numTotalTests}`);
    console.log(`🎯 Success Rate: ${((results.numPassedTests / results.numTotalTests) * 100).toFixed(1)}%`);

    if (results.numFailedTests > 0) {
      console.log('\n❌ Failed Tests:');
      results.testResults.forEach(testResult => {
        if (testResult.numFailingTests > 0) {
          console.log(`  📁 ${path.basename(testResult.testFilePath)}`);
          testResult.testResults.forEach(test => {
            if (test.status === 'failed') {
              console.log(`    ❌ ${test.title}`);
            }
          });
        }
      });
    }

    return results;
  } catch (error) {
    console.error('Error processing test results:', error);
    return results;
  }
}

/**
 * Generate simple HTML report
 * @param {Object} summary - Test summary
 * @param {string} resultsDir - Results directory path
 */
function generateHTMLReport(summary, resultsDir) {
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Floworx Test Results</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .pending { color: #ffc107; }
        .test-file { margin-bottom: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .test-file-header { background: #e9ecef; padding: 10px; font-weight: bold; }
        .test-result { padding: 5px 10px; border-bottom: 1px solid #eee; }
        .test-result:last-child { border-bottom: none; }
    </style>
</head>
<body>
    <h1>Floworx Test Results</h1>
    <div class="summary">
        <h2>Summary</h2>
        <p><strong>Timestamp:</strong> ${summary.timestamp}</p>
        <p><strong>Total Tests:</strong> ${summary.numTotalTests}</p>
        <p><strong class="passed">Passed:</strong> ${summary.numPassedTests}</p>
        <p><strong class="failed">Failed:</strong> ${summary.numFailedTests}</p>
        <p><strong class="pending">Pending:</strong> ${summary.numPendingTests}</p>
        <p><strong>Success Rate:</strong> ${((summary.numPassedTests / summary.numTotalTests) * 100).toFixed(1)}%</p>
    </div>
    
    <h2>Test Files</h2>
    ${summary.testResults.map(testResult => `
        <div class="test-file">
            <div class="test-file-header">
                ${path.basename(testResult.testFilePath)}
                (${testResult.numPassingTests} passed, ${testResult.numFailingTests} failed)
            </div>
            ${testResult.testResults.map(test => `
                <div class="test-result ${test.status}">
                    <strong>${test.status === 'passed' ? '✅' : test.status === 'failed' ? '❌' : '⏸️'}</strong>
                    ${test.title}
                    ${test.duration ? `(${test.duration}ms)` : ''}
                </div>
            `).join('')}
        </div>
    `).join('')}
</body>
</html>
  `;

  const htmlPath = path.join(resultsDir, 'simple-report.html');
  fs.writeFileSync(htmlPath, html);
}

module.exports = processResults;
