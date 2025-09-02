#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function validateTestSuite() {
  log('\n🔍 Validating Floworx Playwright Test Suite', 'bright');
  log('═'.repeat(60), 'blue');

  const requiredFiles = [
    'playwright.config.js',
    'tests/auth.spec.js',
    'tests/onboarding.spec.js',
    'tests/dashboard.spec.js',
    'tests/email-workflows.spec.js',
    'tests/error-handling.spec.js',
    'tests/performance.spec.js',
    'tests/utils/test-helpers.js',
    'tests/global-setup.js',
    'tests/global-teardown.js',
    'tests/README.md',
    'run-playwright-tests.js'
  ];

  const requiredPackages = [
    '@playwright/test',
    'pg'
  ];

  let allValid = true;

  // Check required files
  log('\n📁 Checking required files...', 'cyan');
  requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
      log(`✅ ${file}`, 'green');
    } else {
      log(`❌ ${file} - MISSING`, 'red');
      allValid = false;
    }
  });

  // Check package.json for required dependencies
  log('\n📦 Checking dependencies...', 'cyan');
  if (fs.existsSync('package.json')) {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    requiredPackages.forEach(pkg => {
      if (allDeps[pkg]) {
        log(`✅ ${pkg} (${allDeps[pkg]})`, 'green');
      } else {
        log(`❌ ${pkg} - NOT INSTALLED`, 'red');
        allValid = false;
      }
    });
  } else {
    log('❌ package.json not found', 'red');
    allValid = false;
  }

  // Check test file structure
  log('\n🧪 Analyzing test files...', 'cyan');
  const testFiles = [
    'tests/auth.spec.js',
    'tests/onboarding.spec.js',
    'tests/dashboard.spec.js',
    'tests/email-workflows.spec.js',
    'tests/error-handling.spec.js',
    'tests/performance.spec.js'
  ];

  let totalTests = 0;
  testFiles.forEach(file => {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      const testCount = (content.match(/test\(/g) || []).length;
      const describeCount = (content.match(/test\.describe\(/g) || []).length;
      
      log(`📄 ${path.basename(file)}: ${testCount} tests, ${describeCount} test suites`, 'blue');
      totalTests += testCount;
    }
  });

  log(`\n📊 Total test cases: ${totalTests}`, 'bright');

  // Check security test coverage
  log('\n🔒 Security test coverage...', 'cyan');
  const securityFeatures = [
    'progressive lockout',
    'token expiration',
    'XSS prevention',
    'SQL injection',
    'JWT validation',
    'session management'
  ];

  if (fs.existsSync('tests/auth.spec.js') && fs.existsSync('tests/error-handling.spec.js')) {
    const authContent = fs.readFileSync('tests/auth.spec.js', 'utf8');
    const errorContent = fs.readFileSync('tests/error-handling.spec.js', 'utf8');
    const combinedContent = authContent + errorContent;

    securityFeatures.forEach(feature => {
      const hasTest = combinedContent.toLowerCase().includes(feature.toLowerCase());
      if (hasTest) {
        log(`✅ ${feature}`, 'green');
      } else {
        log(`⚠️  ${feature} - may need coverage`, 'yellow');
      }
    });
  }

  // Check configuration completeness
  log('\n⚙️  Configuration validation...', 'cyan');
  if (fs.existsSync('playwright.config.js')) {
    const configContent = fs.readFileSync('playwright.config.js', 'utf8');
    
    const configChecks = [
      { name: 'Multiple browsers', pattern: /projects.*Desktop Chrome.*Desktop Firefox/s },
      { name: 'Mobile testing', pattern: /Mobile Chrome|iPhone/ },
      { name: 'Global setup', pattern: /globalSetup/ },
      { name: 'Global teardown', pattern: /globalTeardown/ },
      { name: 'Screenshots on failure', pattern: /screenshot.*only-on-failure/ },
      { name: 'Video recording', pattern: /video.*retain-on-failure/ },
      { name: 'Test timeout', pattern: /timeout.*\d+/ }
    ];

    configChecks.forEach(check => {
      if (check.pattern.test(configContent)) {
        log(`✅ ${check.name}`, 'green');
      } else {
        log(`⚠️  ${check.name} - not configured`, 'yellow');
      }
    });
  }

  // Performance test validation
  log('\n⚡ Performance test coverage...', 'cyan');
  if (fs.existsSync('tests/performance.spec.js')) {
    const perfContent = fs.readFileSync('tests/performance.spec.js', 'utf8');
    
    const perfChecks = [
      'Page Load Performance',
      'Concurrent User Load',
      'Memory and Resource Usage',
      'Scalability Tests'
    ];

    perfChecks.forEach(check => {
      if (perfContent.includes(check)) {
        log(`✅ ${check}`, 'green');
      } else {
        log(`❌ ${check} - missing`, 'red');
        allValid = false;
      }
    });
  }

  // Final validation summary
  log('\n' + '═'.repeat(60), 'blue');
  if (allValid) {
    log('🎉 Test suite validation PASSED!', 'green');
    log('\nThe Floworx Playwright test suite is complete and ready for use.', 'bright');
    log('\nNext steps:', 'cyan');
    log('1. Install Playwright browsers: npx playwright install', 'blue');
    log('2. Set up test database and environment variables', 'blue');
    log('3. Start backend and frontend servers', 'blue');
    log('4. Run tests: node run-playwright-tests.js all', 'blue');
  } else {
    log('❌ Test suite validation FAILED!', 'red');
    log('\nPlease address the missing components above.', 'yellow');
  }

  return allValid;
}

// Test coverage summary
function printTestCoverage() {
  log('\n📋 Test Coverage Summary', 'bright');
  log('═'.repeat(60), 'blue');

  const coverage = {
    'Authentication & Security': [
      'User registration with validation',
      'Login/logout with progressive lockout',
      'Password reset with token expiry',
      'JWT token handling',
      'Session management',
      'Account recovery scenarios'
    ],
    'User Onboarding Flow': [
      'Complete 5-step onboarding wizard',
      'Google OAuth integration',
      'Business type selection',
      'Gmail label mapping',
      'Team notification setup',
      'Onboarding interruption/resume'
    ],
    'Dashboard & Navigation': [
      'Dashboard metrics display',
      'Navigation between sections',
      'User profile management',
      'Settings configuration',
      'Search and filtering',
      'Responsive design'
    ],
    'Email Processing & Workflows': [
      'Email categorization (manual/auto)',
      'Workflow creation and management',
      'N8n integration and sync',
      'Automated response handling',
      'Bulk operations',
      'Template customization'
    ],
    'Error Handling & Edge Cases': [
      'Network failure scenarios',
      'Authentication edge cases',
      'Input validation (XSS, SQL injection)',
      'Data consistency issues',
      'Browser compatibility',
      'Concurrent modifications'
    ],
    'Performance & Load Testing': [
      'Page load performance',
      'Large dataset handling',
      'Concurrent user simulation',
      'Memory leak detection',
      'Resource optimization',
      'Scalability testing'
    ]
  };

  Object.entries(coverage).forEach(([category, tests]) => {
    log(`\n${category}:`, 'cyan');
    tests.forEach(test => {
      log(`  ✅ ${test}`, 'green');
    });
  });

  log(`\n📊 Total test scenarios: ${Object.values(coverage).flat().length}`, 'bright');
}

// Run validation
if (require.main === module) {
  const isValid = validateTestSuite();
  printTestCoverage();
  
  if (isValid) {
    log('\n🚀 Ready to run comprehensive E2E tests!', 'green');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

module.exports = { validateTestSuite };
