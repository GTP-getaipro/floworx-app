# 🔧 FloWorx Test Fixes - Detailed Action Plan

## 🚨 CRITICAL FIXES (Execute Immediately)

### 1. Fix Frontend Test Environment Configuration

**Problem**: React component tests failing due to Node environment instead of jsdom

**Solution**: Create separate Jest configurations

```javascript
// Create: jest.frontend.config.js
module.exports = {
  displayName: 'Frontend Tests',
  testEnvironment: 'jsdom',
  testMatch: [
    '**/tests/frontend/**/*.test.js',
    '**/frontend/**/*.test.js'
  ],
  setupFilesAfterEnv: [
    '@testing-library/jest-dom',
    '<rootDir>/tests/setup/jest.setup.js'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/frontend/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2)$': 'jest-transform-stub'
  },
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  testTimeout: 10000
};
```

**Commands to run**:
```bash
npm install --save-dev @testing-library/jest-dom identity-obj-proxy jest-transform-stub
npx jest --config=jest.frontend.config.js tests/frontend
```

### 2. Fix AuthContext Import Paths

**Problem**: Tests importing from wrong AuthContext path

**Current Error**:
```javascript
jest.mock('../../src/context/AuthContext'); // ❌ Wrong path
```

**Fix Required**:
```javascript
// In tests/frontend/Login.test.js and Register.test.js
jest.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({
    login: jest.fn(),
    register: jest.fn(),
    user: null,
    loading: false
  })
}));
```

### 3. Set Missing Environment Variables

**Problem**: Tests failing due to missing JWT_SECRET, ENCRYPTION_KEY

**Solution**: Create test environment file

```bash
# Create: .env.test
NODE_ENV=test
JWT_SECRET=floworx_test_jwt_secret_key_minimum_32_characters_long_for_security
ENCRYPTION_KEY=floworx_test_encryption_key_32_characters_minimum_length
DATABASE_URL=postgresql://test_user:test_pass@localhost:5432/floworx_test
REDIS_URL=redis://localhost:6379/1
FRONTEND_URL=http://localhost:3000
SUPABASE_URL=https://test.supabase.co
SUPABASE_ANON_KEY=test_anon_key
```

**Update Jest setup**:
```javascript
// Update: tests/setup/jest.setup.js
require('dotenv').config({ path: '.env.test' });

// Ensure minimum environment variables
process.env.JWT_SECRET = process.env.JWT_SECRET || 'floworx_test_jwt_secret_key_minimum_32_characters_long_for_security';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'floworx_test_encryption_key_32_characters_minimum_length';
process.env.NODE_ENV = 'test';
```

### 4. Fix Missing Module Dependencies

**Problem**: `Cannot find module '../../../services/n8nScheduler'`

**Solution A - Create Mock** (Recommended for tests):
```javascript
// Create: backend/tests/__mocks__/n8nScheduler.js
module.exports = {
  scheduleWorkflow: jest.fn().mockResolvedValue({ success: true }),
  cancelWorkflow: jest.fn().mockResolvedValue({ success: true }),
  getWorkflowStatus: jest.fn().mockResolvedValue({ status: 'active' }),
  updateWorkflow: jest.fn().mockResolvedValue({ success: true })
};
```

**Solution B - Create Actual Service** (If missing):
```javascript
// Create: backend/services/n8nScheduler.js
class N8nScheduler {
  async scheduleWorkflow(workflowData) {
    // Implementation
    return { success: true, workflowId: 'test-id' };
  }
  
  async cancelWorkflow(workflowId) {
    return { success: true };
  }
  
  async getWorkflowStatus(workflowId) {
    return { status: 'active' };
  }
}

module.exports = new N8nScheduler();
```

---

## 🟡 HIGH PRIORITY FIXES (This Week)

### 5. Create Missing Unit Tests

#### A. Cache Service Test
```javascript
// Create: backend/tests/unit/services/cacheService.test.js
const cacheService = require('../../../services/cacheService');

describe('Cache Service', () => {
  beforeEach(async () => {
    await cacheService.clear();
  });

  test('should set and get string values', async () => {
    await cacheService.set('test-key', 'test-value');
    const value = await cacheService.get('test-key');
    expect(value).toBe('test-value');
  });

  test('should set and get object values', async () => {
    const testObj = { name: 'test', id: 123 };
    await cacheService.set('test-obj', testObj);
    const value = await cacheService.get('test-obj');
    expect(value).toEqual(testObj);
  });

  test('should handle TTL expiration', async () => {
    await cacheService.set('ttl-key', 'ttl-value', 1); // 1 second TTL
    let value = await cacheService.get('ttl-key');
    expect(value).toBe('ttl-value');
    
    await new Promise(resolve => setTimeout(resolve, 1100));
    value = await cacheService.get('ttl-key');
    expect(value).toBeNull();
  });

  test('should delete keys', async () => {
    await cacheService.set('delete-key', 'delete-value');
    await cacheService.delete('delete-key');
    const value = await cacheService.get('delete-key');
    expect(value).toBeNull();
  });
});
```

#### B. Database Connection Test
```javascript
// Create: backend/tests/unit/database/unified-connection.test.js
const DatabaseManager = require('../../../database/unified-connection');

describe('Database Connection Manager', () => {
  test('should establish database connection', async () => {
    const result = await DatabaseManager.query('SELECT 1 as test');
    expect(result.rows[0].test).toBe(1);
  });

  test('should handle query errors gracefully', async () => {
    await expect(
      DatabaseManager.query('SELECT * FROM non_existent_table')
    ).rejects.toThrow();
  });

  test('should use connection pooling', () => {
    expect(DatabaseManager.pool).toBeDefined();
    expect(DatabaseManager.pool.totalCount).toBeGreaterThan(0);
  });
});
```

#### C. Register Form Test
```javascript
// Create: frontend/tests/components/RegisterForm.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RegisterForm from '../../src/components/RegisterForm';
import { useAuth } from '../../src/contexts/AuthContext';

jest.mock('../../src/contexts/AuthContext');

describe('RegisterForm', () => {
  const mockRegister = jest.fn();
  
  beforeEach(() => {
    useAuth.mockReturnValue({
      register: mockRegister,
      loading: false,
      error: null
    });
  });

  test('renders registration form fields', () => {
    render(<RegisterForm />);
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/company name/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
  });

  test('validates required fields', async () => {
    render(<RegisterForm />);
    
    fireEvent.click(screen.getByRole('button', { name: /register/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  test('submits form with valid data', async () => {
    render(<RegisterForm />);
    
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' }
    });
    fireEvent.change(screen.getByLabelText(/company name/i), {
      target: { value: 'Test Company' }
    });
    
    fireEvent.click(screen.getByRole('button', { name: /register/i }));
    
    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        company_name: 'Test Company'
      });
    });
  });
});
```

### 6. Fix Database Schema Issues

**Problem**: Tests failing due to missing `deleted_at` column

**Solution**: Update test database schema or modify queries

```sql
-- Add to test database migration
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP NULL;
ALTER TABLE credentials ADD COLUMN deleted_at TIMESTAMP NULL;

-- Create indexes for performance tests
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_credentials_user_id ON credentials(user_id);
```

**Or modify query in queryOptimizationService.js**:
```javascript
// Remove deleted_at references if column doesn't exist
const query = `
  SELECT u.id, u.email, u.company_name, u.created_at,
         c.provider, c.encrypted_tokens
  FROM users u
  LEFT JOIN credentials c ON u.id = c.user_id
  WHERE u.id = $1
`;
```

---

## 🟢 MEDIUM PRIORITY (Next Week)

### 7. Set Up E2E Testing Infrastructure

```bash
# Install Playwright
npm install --save-dev @playwright/test
npx playwright install

# Create playwright.config.js
module.exports = {
  testDir: './tests/e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } }
  ]
};
```

### 8. Create Integration Tests for Registration Flow

```javascript
// Create: tests/integration/registration-flow.test.js
const request = require('supertest');
const app = require('../../backend/server');

describe('Registration Flow Integration', () => {
  test('complete registration process', async () => {
    const userData = {
      email: 'integration-test@example.com',
      password: 'securePassword123',
      company_name: 'Integration Test Co',
      phone: '+1234567890'
    };

    // Test registration endpoint
    const response = await request(app)
      .post('/api/auth/register')
      .send(userData)
      .expect(201);

    expect(response.body.token).toBeDefined();
    expect(response.body.user.email).toBe(userData.email);

    // Test login with new account
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: userData.email,
        password: userData.password
      })
      .expect(200);

    expect(loginResponse.body.token).toBeDefined();
  });
});
```

---

## 📋 Execution Checklist

### Phase 1: Critical Fixes (Day 1)
- [ ] Create `jest.frontend.config.js`
- [ ] Fix AuthContext import paths in test files
- [ ] Create `.env.test` with required variables
- [ ] Create missing service mocks
- [ ] Run frontend tests: `npx jest --config=jest.frontend.config.js`

### Phase 2: Unit Tests (Days 2-3)
- [ ] Create `cacheService.test.js`
- [ ] Create `unified-connection.test.js`
- [ ] Create `RegisterForm.test.js`
- [ ] Fix database schema issues
- [ ] Run backend tests: `npx jest backend/tests`

### Phase 3: Integration & E2E (Days 4-5)
- [ ] Set up Playwright
- [ ] Create registration flow integration test
- [ ] Fix remaining backend test failures
- [ ] Set up CI/CD test automation

### Success Criteria
- [ ] Frontend tests: >80% pass rate
- [ ] Backend tests: >70% pass rate
- [ ] Critical components: 100% test coverage
- [ ] Registration flow: Fully tested end-to-end

---

## 🎯 Expected Outcomes

After implementing these fixes:

1. **Frontend Tests**: 18 failing → 15+ passing
2. **Backend Tests**: 142 failing → <50 failing  
3. **Test Coverage**: Critical paths fully covered
4. **CI/CD Ready**: Automated testing pipeline functional
5. **Developer Confidence**: Reliable test suite for ongoing development

**Total Estimated Effort**: 3-5 developer days
**Timeline**: 1 week for critical fixes, 2 weeks for complete restoration
