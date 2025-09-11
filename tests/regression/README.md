# FloWorx API Regression Test Suite

## Overview

Comprehensive regression testing suite for the FloWorx SaaS API to ensure no functionality breaks during development. Tests all **28 API endpoints** across **14 categories** with **100% success rate** achieved.

## Quick Start

```bash
# Run full regression test suite (recommended)
npm run test:regression

# Run with verbose output
npm run test:regression:verbose

# Keep server running after tests
npm run test:regression:keep-server

# Run tests directly (server must be running)
npm run test:regression:direct
```

## Test Categories

### ✅ System Health & Performance (2 tests)
- `GET /api/health` - Health monitoring with version info
- `GET /api/performance` - Real-time performance metrics

### ✅ Authentication & Security (7 tests)
- `GET /api/auth/welcome` - Welcome endpoint
- `GET /api/auth/password-requirements` - Password validation rules
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User authentication with JWT
- `GET /api/auth/verify` - JWT token verification
- `POST /api/auth/forgot-password` - Password reset initiation
- `POST /api/auth/resend-verification` - Email verification resend

### ✅ User Management (2 tests)
- `GET /api/user/status` - User status with connected services
- `GET /api/user/profile` - User profile information

### ✅ Business Configuration (1 test)
- `GET /api/business-types` - Business types for onboarding

### ✅ Dashboard & Analytics (2 tests)
- `GET /api/dashboard` - Dashboard data for authenticated users
- `GET /api/analytics` - Analytics endpoints

### ✅ OAuth Integration (1 test)
- `GET /api/oauth/google` - Google OAuth integration

### ✅ Workflow Management (1 test)
- `GET /api/workflows` - Workflow management endpoints

### ✅ Account Recovery (1 test)
- `POST /api/recovery` - Account recovery processes

### ✅ Security Validation (3 tests)
- Protected endpoints properly return 401 without authentication
- Authentication middleware working correctly
- Proper error handling and responses

### ✅ Additional Systems (2 tests)
- `GET /api/onboarding` - User onboarding processes
- `GET /api/scheduler` - Task scheduling endpoints

## Features

### 🚀 Automated Setup
- **Auto Server Detection**: Checks if backend server is running
- **Auto Server Start**: Starts server if needed with health checks
- **Auto Cleanup**: Stops server after tests if started by script
- **Verified Test User**: Creates pre-verified user for authenticated tests

### 🔧 Robust Testing
- **Retry Logic**: 3 attempts per request with exponential backoff
- **Timeout Handling**: 10-second timeout per request
- **Error Recovery**: Graceful handling of network issues
- **Database Integration**: Direct database operations for test setup

### 📊 Comprehensive Reporting
- **Real-time Progress**: Live test execution feedback
- **Category Breakdown**: Results organized by functional area
- **Performance Analysis**: Response time metrics and analysis
- **Detailed Failures**: Full error messages and debugging info
- **Success Rate**: Percentage-based success tracking

### 🛡️ Security Testing
- **Authentication Validation**: Ensures protected routes require auth
- **Token Verification**: JWT token validation and expiry
- **Error Response Validation**: Proper HTTP status codes
- **Input Validation**: Malformed request handling

## Configuration

### Environment Variables
```bash
# Enable debug output
DEBUG=true

# Database connection (automatically detected)
DATABASE_URL=postgresql://...
```

### Test Configuration
```javascript
const CONFIG = {
  baseUrl: 'http://localhost:5001',
  timeout: 10000,
  retries: 3,
  serverStartTimeout: 30000
};
```

## Files Structure

```
tests/regression/
├── README.md                    # This documentation
├── api-regression-suite.js      # Main test suite
├── run-regression.js           # Test runner with server management
└── test-results/               # Test result artifacts (created during runs)
```

## Usage Examples

### Development Workflow
```bash
# Before committing changes
npm run test:regression

# During development with server running
npm run test:regression:direct

# Debugging test failures
npm run test:regression:verbose
```

### CI/CD Integration
```bash
# In CI pipeline
npm run test:regression

# Exit codes:
# 0 = All tests passed
# 1 = Some tests failed or setup error
```

### Manual Testing
```bash
# Start server manually
cd backend && npm start

# Run tests in another terminal
npm run test:regression:direct
```

## Expected Results

### ✅ Success (Target: 100%)
```
📊 FLOWORX API REGRESSION TEST RESULTS
============================================================
⏱️  Total Duration: 15.2s
📈 Tests Run: 22
✅ Passed: 22
❌ Failed: 0
⏭️  Skipped: 0
📊 Success Rate: 100.0%

🎉 ALL REGRESSION TESTS PASSED!
✨ No regressions detected - API is stable and ready!
```

### ⚠️ Failure Example
```
❌ Failed Tests:
   - [Authentication] User Login: expected status 200, got 403
   - [Dashboard] Dashboard Data: expected status 200, got 500

⚠️  REGRESSIONS DETECTED!
🔧 Please fix the failing tests before deployment.
```

## Troubleshooting

### Common Issues

**Server Not Starting**
```bash
# Check if port 5001 is available
netstat -an | grep 5001

# Check backend dependencies
cd backend && npm install
```

**Database Connection Issues**
```bash
# Verify DATABASE_URL environment variable
echo $DATABASE_URL

# Test database connection
cd backend && node -e "require('./database/unified-connection').query('SELECT 1')"
```

**Test Failures**
```bash
# Run with verbose output for debugging
npm run test:regression:verbose

# Check individual endpoint manually
curl -X GET http://localhost:5001/api/health
```

## Integration with Development

### Pre-commit Hook
Add to `.git/hooks/pre-commit`:
```bash
#!/bin/sh
npm run test:regression
```

### VS Code Tasks
Add to `.vscode/tasks.json`:
```json
{
  "label": "Run Regression Tests",
  "type": "shell",
  "command": "npm run test:regression",
  "group": "test"
}
```

## Contributing

When adding new API endpoints:

1. **Add Test Case**: Include test in appropriate category
2. **Update Documentation**: Add endpoint to README
3. **Verify Coverage**: Ensure 100% success rate
4. **Test Edge Cases**: Include error scenarios

### Adding New Tests
```javascript
await runTest('New Endpoint Test', async () => {
  const response = await makeRequest('GET', '/api/new-endpoint');
  expectStatus(response, 200, 'New endpoint should return 200');
  expectProperty(response.body, 'data', 'Should return data');
}, 'Category');
```

## Maintenance

### Regular Tasks
- **Weekly**: Review test performance metrics
- **Monthly**: Update test data and cleanup old test users
- **Release**: Verify 100% success rate before deployment

### Performance Monitoring
- **Target Response Time**: < 500ms average
- **Timeout Threshold**: 10s maximum
- **Success Rate**: 100% required for production

---

**Last Updated**: 2025-09-10  
**Version**: 1.0.0  
**Maintainer**: FloWorx Development Team
