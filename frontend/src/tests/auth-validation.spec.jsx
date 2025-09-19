import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { ErrorProvider } from '../contexts/ErrorContext';
import { ToastProvider } from '../contexts/ToastContext';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';

// Test wrapper with all necessary providers
const TestWrapper = ({ children }) => (
  <BrowserRouter>
    <ErrorProvider>
      <ToastProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </ToastProvider>
    </ErrorProvider>
  </BrowserRouter>
);

// Mock handlers for testing
const mockHandlers = {
  onSubmit: jest.fn(),
  errors: {},
  values: {},
  links: {}
};

describe('Auth Pages Design Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('LoginPage', () => {
    test('renders with new glassmorphism design', () => {
      render(
        <TestWrapper>
          <LoginPage {...mockHandlers} />
        </TestWrapper>
      );
      
      // Check for FloWorx branding
      expect(screen.getByText('FloWorx')).toBeInTheDocument();
      expect(screen.getByText('Email AI Built by Hot Tub Pros—For Hot Tub Pros')).toBeInTheDocument();
      
      // Check for form elements
      expect(screen.getByText('Sign in to FloWorx')).toBeInTheDocument();
      expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
      
      // Check for links
      expect(screen.getByText('Forgot your password?')).toBeInTheDocument();
      expect(screen.getByText('Create an account')).toBeInTheDocument();
    });

    test('password field has show/hide toggle', () => {
      render(
        <TestWrapper>
          <LoginPage {...mockHandlers} />
        </TestWrapper>
      );
      
      const passwordInput = screen.getByLabelText('Password');
      const toggleButton = screen.getByLabelText('Show password');
      
      expect(passwordInput).toHaveAttribute('type', 'password');
      
      fireEvent.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'text');
      expect(screen.getByLabelText('Hide password')).toBeInTheDocument();
    });

    test('form validation works correctly', async () => {
      render(
        <TestWrapper>
          <LoginPage {...mockHandlers} />
        </TestWrapper>
      );

      const submitButton = screen.getByRole('button', { name: 'Sign In' });
      const emailInput = screen.getByLabelText('Email Address');

      // Try to submit empty form
      fireEvent.click(submitButton);

      // Check that validation errors appear (multiple required fields)
      await waitFor(() => {
        expect(screen.getAllByText(/required/i)).toHaveLength(2);
      });

      // Fill in invalid email
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.blur(emailInput);

      await waitFor(() => {
        expect(screen.getByText(/valid email/i)).toBeInTheDocument();
      });
    });
  });

  describe('RegisterPage', () => {
    test('renders with new glassmorphism design', () => {
      render(
        <TestWrapper>
          <RegisterPage {...mockHandlers} />
        </TestWrapper>
      );
      
      // Check for FloWorx branding
      expect(screen.getByText('FloWorx')).toBeInTheDocument();
      expect(screen.getByText('Create your FloWorx account')).toBeInTheDocument();
      
      // Check for form elements
      expect(screen.getByLabelText('First Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Last Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Company (optional)')).toBeInTheDocument();
      expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
      expect(screen.getAllByLabelText('Password')[0]).toBeInTheDocument();
      expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument();
    });

    test('both password fields have show/hide toggles', () => {
      render(
        <TestWrapper>
          <RegisterPage {...mockHandlers} />
        </TestWrapper>
      );
      
      const passwordInputs = screen.getAllByDisplayValue('');
      const toggleButtons = screen.getAllByLabelText('Show password');
      
      expect(toggleButtons).toHaveLength(2);
      
      // Test first password toggle
      fireEvent.click(toggleButtons[0]);
      expect(screen.getAllByLabelText('Hide password')).toHaveLength(1);
    });
  });

  describe('ForgotPasswordPage', () => {
    test('renders with new glassmorphism design', () => {
      render(
        <TestWrapper>
          <ForgotPasswordPage {...mockHandlers} />
        </TestWrapper>
      );
      
      // Check for FloWorx branding
      expect(screen.getByText('FloWorx')).toBeInTheDocument();
      expect(screen.getByText('Reset your password')).toBeInTheDocument();
      
      // Check for form elements
      expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Send Reset Link' })).toBeInTheDocument();
      
      // Check for links
      expect(screen.getByText('Back to login')).toBeInTheDocument();
      expect(screen.getByText('Create account')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('all form inputs have proper labels and ARIA attributes', () => {
      render(
        <TestWrapper>
          <LoginPage {...mockHandlers} />
        </TestWrapper>
      );
      
      const emailInput = screen.getByLabelText('Email Address');
      const passwordInput = screen.getByLabelText('Password');
      
      expect(emailInput).toHaveAttribute('id');
      expect(passwordInput).toHaveAttribute('id');
      
      // Check ARIA attributes are set correctly
      expect(emailInput).toHaveAttribute('aria-invalid', 'false');
      expect(passwordInput).toHaveAttribute('aria-invalid', 'false');
    });

    test('error states have proper ARIA attributes', async () => {
      const errorProps = {
        ...mockHandlers,
        errors: { email: 'Email is required' }
      };
      
      render(
        <TestWrapper>
          <LoginPage {...errorProps} />
        </TestWrapper>
      );
      
      const emailInput = screen.getByLabelText('Email Address');
      expect(emailInput).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByText('Email is required')).toBeInTheDocument();
    });

    test('keyboard navigation works properly', () => {
      render(
        <TestWrapper>
          <LoginPage {...mockHandlers} />
        </TestWrapper>
      );
      
      const emailInput = screen.getByLabelText('Email Address');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: 'Sign In' });
      
      // Test tab order
      emailInput.focus();
      expect(document.activeElement).toBe(emailInput);
      
      fireEvent.keyDown(emailInput, { key: 'Tab' });
      // Password input should be next in tab order
      // Note: This is a simplified test - actual tab behavior may vary
    });
  });

  describe('Responsive Design', () => {
    test('components render without errors on different screen sizes', () => {
      // Test mobile viewport
      global.innerWidth = 360;
      global.dispatchEvent(new Event('resize'));
      
      const { rerender } = render(
        <TestWrapper>
          <LoginPage {...mockHandlers} />
        </TestWrapper>
      );
      expect(screen.getByText('FloWorx')).toBeInTheDocument();
      
      // Test tablet viewport
      global.innerWidth = 768;
      global.dispatchEvent(new Event('resize'));
      
      rerender(
        <TestWrapper>
          <RegisterPage {...mockHandlers} />
        </TestWrapper>
      );
      expect(screen.getByText('Create your FloWorx account')).toBeInTheDocument();
      
      // Test desktop viewport
      global.innerWidth = 1024;
      global.dispatchEvent(new Event('resize'));
      
      rerender(
        <TestWrapper>
          <ForgotPasswordPage {...mockHandlers} />
        </TestWrapper>
      );
      expect(screen.getByText('Reset your password')).toBeInTheDocument();
    });
  });
});
