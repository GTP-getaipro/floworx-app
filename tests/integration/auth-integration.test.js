/**
 * Authentication Integration Tests
 * 
 * Tests the complete authentication flow to prevent component-context mismatches
 * and ensure proper integration between frontend components and backend APIs.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../frontend/src/contexts/AuthContext';
import RegisterPage from '../../frontend/src/pages/RegisterPage';
import LoginPage from '../../frontend/src/pages/LoginPage';
import { rest } from 'msw';
import { setupServer } from 'msw/node';

// Mock API server for testing
const server = setupServer(
  // Registration endpoint
  rest.post('/api/auth/register', (req, res, ctx) => {
    const { email, password, firstName, lastName } = req.body;
    
    // Simulate validation
    if (!email || !password || !firstName || !lastName) {
      return res(
        ctx.status(400),
        ctx.json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'All fields are required'
          }
        })
      );
    }

    // Simulate email already exists
    if (email === 'existing@example.com') {
      return res(
        ctx.status(409),
        ctx.json({
          success: false,
          error: {
            code: 'EMAIL_EXISTS',
            message: 'Email address already registered'
          }
        })
      );
    }

    // Success response
    return res(
      ctx.status(201),
      ctx.json({
        success: true,
        data: {
          userId: 'user_123',
          email: email,
          requiresVerification: true
        },
        message: 'Account created successfully'
      })
    );
  }),

  // Login endpoint
  rest.post('/api/auth/login', (req, res, ctx) => {
    const { email, password } = req.body;

    // Simulate validation
    if (!email || !password) {
      return res(
        ctx.status(400),
        ctx.json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email and password are required'
          }
        })
      );
    }

    // Simulate invalid credentials
    if (email !== 'test@example.com' || password !== 'Password123!') {
      return res(
        ctx.status(401),
        ctx.json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          }
        })
      );
    }

    // Simulate unverified email
    if (email === 'unverified@example.com') {
      return res(
        ctx.status(403),
        ctx.json({
          success: false,
          error: {
            code: 'EMAIL_NOT_VERIFIED',
            message: 'Please verify your email address to log in'
          }
        })
      );
    }

    // Success response
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        data: {
          user: {
            id: 'user_123',
            email: email,
            firstName: 'Test',
            lastName: 'User'
          },
          token: 'jwt_token_here'
        }
      })
    );
  }),

  // Auth verification endpoint
  rest.get('/api/auth/verify', (req, res, ctx) => {
    return res(
      ctx.status(401),
      ctx.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'No valid session'
        }
      })
    );
  })
);

// Test wrapper component
const TestWrapper = ({ children }) => (
  <BrowserRouter>
    <AuthProvider>
      {children}
    </AuthProvider>
  </BrowserRouter>
);

describe('Authentication Integration Tests', () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  describe('RegisterPage Integration', () => {
    test('renders correctly with AuthContext', () => {
      render(
        <TestWrapper>
          <RegisterPage />
        </TestWrapper>
      );

      // Verify all form fields are present
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });

    test('handles successful registration', async () => {
      render(
        <TestWrapper>
          <RegisterPage />
        </TestWrapper>
      );

      // Fill out the form
      fireEvent.change(screen.getByLabelText(/first name/i), { 
        target: { value: 'John' } 
      });
      fireEvent.change(screen.getByLabelText(/last name/i), { 
        target: { value: 'Doe' } 
      });
      fireEvent.change(screen.getByLabelText(/email address/i), { 
        target: { value: 'john@example.com' } 
      });
      fireEvent.change(screen.getByLabelText(/^password$/i), { 
        target: { value: 'Password123!' } 
      });
      fireEvent.change(screen.getByLabelText(/confirm password/i), { 
        target: { value: 'Password123!' } 
      });

      // Submit the form
      fireEvent.click(screen.getByRole('button', { name: /create account/i }));

      // Verify loading state
      await waitFor(() => {
        expect(screen.getByText(/creating account/i)).toBeInTheDocument();
      });

      // Verify success message
      await waitFor(() => {
        expect(screen.getByText(/account created successfully/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    test('handles registration errors', async () => {
      render(
        <TestWrapper>
          <RegisterPage />
        </TestWrapper>
      );

      // Fill out form with existing email
      fireEvent.change(screen.getByLabelText(/first name/i), { 
        target: { value: 'John' } 
      });
      fireEvent.change(screen.getByLabelText(/last name/i), { 
        target: { value: 'Doe' } 
      });
      fireEvent.change(screen.getByLabelText(/email address/i), { 
        target: { value: 'existing@example.com' } 
      });
      fireEvent.change(screen.getByLabelText(/^password$/i), { 
        target: { value: 'Password123!' } 
      });
      fireEvent.change(screen.getByLabelText(/confirm password/i), { 
        target: { value: 'Password123!' } 
      });

      // Submit the form
      fireEvent.click(screen.getByRole('button', { name: /create account/i }));

      // Verify error message
      await waitFor(() => {
        expect(screen.getByText(/email address already registered/i)).toBeInTheDocument();
      });
    });

    test('validates form fields', async () => {
      render(
        <TestWrapper>
          <RegisterPage />
        </TestWrapper>
      );

      // Try to submit empty form
      fireEvent.click(screen.getByRole('button', { name: /create account/i }));

      // Verify validation errors appear
      await waitFor(() => {
        expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('LoginPage Integration', () => {
    test('renders correctly with AuthContext', () => {
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    test('handles successful login', async () => {
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      // Fill out login form
      fireEvent.change(screen.getByLabelText(/email address/i), { 
        target: { value: 'test@example.com' } 
      });
      fireEvent.change(screen.getByLabelText(/password/i), { 
        target: { value: 'Password123!' } 
      });

      // Submit the form
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      // Verify loading state
      await waitFor(() => {
        expect(screen.getByText(/signing in/i)).toBeInTheDocument();
      });

      // Note: In a real test, you'd verify navigation to dashboard
      // This would require additional setup with React Router testing
    });

    test('handles login errors', async () => {
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      // Fill out form with invalid credentials
      fireEvent.change(screen.getByLabelText(/email address/i), { 
        target: { value: 'wrong@example.com' } 
      });
      fireEvent.change(screen.getByLabelText(/password/i), { 
        target: { value: 'wrongpassword' } 
      });

      // Submit the form
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      // Verify error message
      await waitFor(() => {
        expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
      });
    });

    test('handles unverified email', async () => {
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      );

      // Fill out form with unverified email
      fireEvent.change(screen.getByLabelText(/email address/i), { 
        target: { value: 'unverified@example.com' } 
      });
      fireEvent.change(screen.getByLabelText(/password/i), { 
        target: { value: 'Password123!' } 
      });

      // Submit the form
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      // Verify unverified banner appears
      await waitFor(() => {
        expect(screen.getByText(/verify your email address/i)).toBeInTheDocument();
      });
    });
  });

  describe('AuthContext Integration', () => {
    test('provides authentication state correctly', () => {
      let authContextValue;
      
      const TestComponent = () => {
        const auth = require('../../frontend/src/contexts/AuthContext').useAuth();
        authContextValue = auth;
        return <div>Test</div>;
      };

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      );

      // Verify AuthContext provides expected interface
      expect(authContextValue).toHaveProperty('user');
      expect(authContextValue).toHaveProperty('isAuthenticated');
      expect(authContextValue).toHaveProperty('loading');
      expect(authContextValue).toHaveProperty('login');
      expect(authContextValue).toHaveProperty('register');
      expect(authContextValue).toHaveProperty('logout');
    });
  });
});

/**
 * USAGE:
 * 
 * Run these tests with:
 * npm test -- auth-integration.test.js
 * 
 * Or add to your CI/CD pipeline to catch integration issues early.
 * 
 * These tests verify:
 * 1. Components integrate correctly with AuthContext
 * 2. API calls work as expected
 * 3. Error handling works properly
 * 4. Form validation functions correctly
 * 5. Loading states are managed properly
 */
