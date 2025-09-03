# FloWorx Regression Testing Guide

## 🧪 Overview

This guide provides comprehensive instructions for running regression tests on the FloWorx application using the existing Jest test framework. The regression testing suite validates all critical functionality before deployment.

---

## 📋 Test Suite Components

### **✅ 1. Comprehensive Test Coverage**
- **Unit Tests** - Core business logic and service layer validation
- **Integration Tests** - API endpoints and service interaction testing
- **Authentication Regression** - Complete auth flow validation
- **Monitoring Regression** - Monitoring system and alerting validation
- **Security Tests** - Vulnerability and penetration testing
- **Performance Tests** - Load testing and performance benchmarks
- **Middleware Tests** - Request processing validation
- **Route Tests** - API route handler testing

### **✅ 2. Quality Gates**
- **95%+ Code Coverage** across all modules
- **Zero Critical Security Vulnerabilities**
- **Sub-1000ms Average Response Times**
- **95%+ Test Success Rate**

### **✅ 3. Test Data Management**
- **Consistent Test Data Factory** for reproducible tests
- **Automated Cleanup** of test artifacts
- **Isolated Test Environments** preventing interference

---

## 🚀 Quick Start

### **Option 1: Run All Tests (Recommended)**

#### **Windows:**
```cmd
run-regression-tests.bat
```

#### **Linux/Mac:**
```bash
./run-regression-tests.sh
```

### **Option 2: Run Specific Test Suites**

#### **Windows:**
```cmd
# Authentication tests only
run-regression-tests.bat --suite auth

# Monitoring tests with verbose output
run-regression-tests.bat --suite monitoring --verbose

# Unit tests with coverage report
run-regression-tests.bat --suite unit --coverage
```

#### **Linux/Mac:**
```bash
# Authentication tests only
./run-regression-tests.sh --suite auth

# Monitoring tests with verbose output
./run-regression-tests.sh --suite monitoring --verbose

# Unit tests with coverage report
./run-regression-tests.sh --suite unit --coverage
```

### **Option 3: Manual Test Execution**

```bash
# Navigate to backend directory
cd backend

# Run full regression suite
npm run test:full-regression

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:auth-regression
npm run test:monitoring-regression
npm run test:performance
npm run test:security
```

---

## 📊 Available Test Suites

### **1. Full Regression Suite (`all`)**
- **Duration:** 15-20 minutes
- **Coverage:** All test categories
- **Use Case:** Pre-deployment validation
- **Command:** `--suite all` (default)

### **2. Unit Tests (`unit`)**
- **Duration:** 2-3 minutes
- **Coverage:** Service layer, utilities, business logic
- **Use Case:** Development validation
- **Command:** `--suite unit`

### **3. Integration Tests (`integration`)**
- **Duration:** 5-8 minutes
- **Coverage:** API endpoints, database interactions
- **Use Case:** API validation
- **Command:** `--suite integration`

### **4. Authentication Regression (`auth`)**
- **Duration:** 3-5 minutes
- **Coverage:** Login, registration, JWT, password reset
- **Use Case:** Security validation
- **Command:** `--suite auth`

### **5. Monitoring Regression (`monitoring`)**
- **Duration:** 5-7 minutes
- **Coverage:** Real-time monitoring, alerting, error tracking
- **Use Case:** Monitoring system validation
- **Command:** `--suite monitoring`

### **6. Performance Tests (`performance`)**
- **Duration:** 10-15 minutes
- **Coverage:** Load testing, response times, resource usage
- **Use Case:** Performance validation
- **Command:** `--suite performance`

### **7. Security Tests (`security`)**
- **Duration:** 3-5 minutes
- **Coverage:** Vulnerability scanning, input validation
- **Use Case:** Security validation
- **Command:** `--suite security`

---

## 🔧 Configuration Options

### **Command Line Arguments**

| Option | Description | Example |
|--------|-------------|---------|
| `--verbose` | Enable detailed output | `--verbose` |
| `--coverage` | Generate coverage report | `--coverage` |
| `--suite NAME` | Run specific test suite | `--suite auth` |
| `--help` | Show help information | `--help` |

### **Environment Variables**

```bash
# Test environment (automatically set)
NODE_ENV=test

# JWT secret for testing (automatically set)
JWT_SECRET=test-jwt-secret-for-regression-testing-32-chars

# Encryption key for testing (automatically set)
ENCRYPTION_KEY=test-encryption-key-32-chars-long

# Optional: Custom test database
TEST_DATABASE_URL=postgresql://test:test@localhost:5432/floworx_test
```

---

## 📈 Test Results and Reports

### **Generated Reports**

1. **Test Results Report**
   - Location: `test-results/full-regression-report-[timestamp].json`
   - Contains: Test outcomes, timing, coverage data
   - Format: JSON with detailed metrics

2. **Coverage Report**
   - Location: `backend/coverage/lcov-report/index.html`
   - Contains: Line-by-line coverage analysis
   - Format: Interactive HTML report

3. **Failure Report** (if tests fail)
   - Location: `test-results/regression-failure-[timestamp].json`
   - Contains: Error details, stack traces, context
   - Format: JSON with debugging information

### **Quality Gate Results**

The system validates these quality gates:

#### **Coverage Gate**
- ✅ **Statements:** 95%+
- ✅ **Branches:** 95%+
- ✅ **Functions:** 95%+
- ✅ **Lines:** 95%+

#### **Test Gate**
- ✅ **Success Rate:** 95%+
- ✅ **Failed Suites:** 0
- ✅ **Critical Tests:** All passing

#### **Performance Gate**
- ✅ **Average Response Time:** <1000ms
- ✅ **Memory Usage:** <512MB
- ✅ **Query Performance:** <500ms average

---

## 🛠️ Test Development

### **Adding New Tests**

1. **Create Test File:**
   ```javascript
   // backend/tests/regression/new-feature-regression.test.js
   const testDataFactory = require('../helpers/testDataFactory');
   const testUtils = require('../helpers/testUtils');

   describe('New Feature Regression Tests', () => {
     // Your tests here
   });
   ```

2. **Use Test Helpers:**
   ```javascript
   // Generate test data
   const userData = testDataFactory.createUser();
   
   // Make authenticated requests
   const response = await testUtils.authenticatedRequest('GET', '/api/endpoint', userData);
   
   // Assert response structure
   testUtils.assertSuccessResponse(response, 200);
   ```

3. **Update Test Suite Configuration:**
   ```javascript
   // Add to scripts/run-full-regression.js testSuites array
   {
     name: 'New Feature Tests',
     command: 'npx',
     args: ['jest', 'tests/regression/new-feature-regression.test.js', '--verbose'],
     timeout: 120000,
     critical: true,
     description: 'New feature comprehensive testing'
   }
   ```

### **Test Data Factory Usage**

```javascript
// Create test entities
const user = testDataFactory.createUser({ email: 'custom@test.com' });
const credential = testDataFactory.createCredential({ userId: user.id });
const workflow = testDataFactory.createWorkflowDeployment({ userId: user.id });

// Create test scenarios
const scenario = testDataFactory.createTestScenario('complete_onboarding');

// Generate batch data
const users = testDataFactory.createBatch('users', 10);
```

### **Test Utilities Usage**

```javascript
// Authenticated API testing
const response = await testUtils.authenticatedRequest('POST', '/api/endpoint')
  .send({ data: 'test' });

// Load testing
const loadResults = await testUtils.simulateLoad('/api/endpoint', {
  concurrency: 10,
  requests: 100,
  authenticated: true
});

// Mock services
const mockService = testUtils.mockExternalService('emailService', {
  sendEmail: { resolves: { success: true } }
});
```

---

## 🚨 Troubleshooting

### **Common Issues**

#### **Tests Fail with Database Connection Error**
```bash
# Solution: Ensure test database is running
# Check DATABASE_URL or TEST_DATABASE_URL environment variable
echo $DATABASE_URL
```

#### **Coverage Below Threshold**
```bash
# Solution: Add tests for uncovered code
# Check coverage report for specific files needing tests
open backend/coverage/lcov-report/index.html
```

#### **Performance Tests Timeout**
```bash
# Solution: Increase timeout or optimize queries
# Check for slow database queries or external service calls
```

#### **Authentication Tests Fail**
```bash
# Solution: Verify JWT_SECRET and test user creation
# Check that test environment is properly isolated
```

### **Debug Mode**

Run tests with verbose output for debugging:

```bash
# Windows
run-regression-tests.bat --verbose --suite auth

# Linux/Mac
./run-regression-tests.sh --verbose --suite auth
```

### **Manual Test Execution**

For detailed debugging, run individual test files:

```bash
cd backend

# Run specific test file with Jest directly
npx jest tests/regression/auth-regression.test.js --verbose --detectOpenHandles

# Run with coverage
npx jest tests/regression/auth-regression.test.js --coverage --verbose
```

---

## 📞 Support and Best Practices

### **Best Practices**

1. **Run Tests Before Every Commit**
   ```bash
   # Quick validation
   ./run-regression-tests.sh --suite unit

   # Full validation before major changes
   ./run-regression-tests.sh --coverage
   ```

2. **Monitor Test Performance**
   - Keep individual test suites under 5 minutes
   - Optimize slow tests or mark as performance tests
   - Use test data factory for consistent data

3. **Maintain Test Quality**
   - Keep tests independent and isolated
   - Use descriptive test names and descriptions
   - Clean up test data after each test

4. **Review Test Reports**
   - Check coverage reports for gaps
   - Address failing tests immediately
   - Monitor performance trends

### **Integration with CI/CD**

```yaml
# Example GitHub Actions workflow
- name: Run Regression Tests
  run: |
    chmod +x run-regression-tests.sh
    ./run-regression-tests.sh --coverage
    
- name: Upload Coverage Reports
  uses: codecov/codecov-action@v3
  with:
    file: ./backend/coverage/lcov.info
```

### **Getting Help**

- **Test Failures:** Check `test-results/` directory for detailed reports
- **Coverage Issues:** Review `backend/coverage/lcov-report/index.html`
- **Performance Problems:** Analyze performance test results
- **Configuration Issues:** Verify environment variables and dependencies

---

## 🎯 Success Criteria

Your regression tests are successful when:

✅ **All test suites pass** with 95%+ success rate  
✅ **Code coverage** meets 95%+ threshold  
✅ **Performance benchmarks** are within acceptable limits  
✅ **Security tests** show no critical vulnerabilities  
✅ **Quality gates** all pass  
✅ **Test reports** show no critical issues  

**Ready for deployment!** 🚀

---

**Need Help?** Contact the development team or create an issue in the project repository.
