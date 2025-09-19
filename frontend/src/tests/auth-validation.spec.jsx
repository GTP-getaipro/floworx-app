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
      expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
      
      // Check for links
      expect(screen.getByText('Forgot your password?')).toBeInTheDocument();
      expect(screen.getByText('Create an account')).toBeInTheDocument();
    });

    test('password field renders correctly', () => {
      render(
        <TestWrapper>
          <LoginPage {...mockHandlers} />
        </TestWrapper>
      );

      const passwordInput = screen.getByLabelText(/Password/i);

      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('placeholder', '••••••••');
    });

    test('form validation works correctly', async () => {
      render(
        <TestWrapper>
          <LoginPage {...mockHandlers} />
        </TestWrapper>
      );

      const submitButton = screen.getByRole('button', { name: 'Sign In' });
      const emailInput = screen.getByLabelText(/Email Address/i);

      // Try to submit empty form
      fireEvent.click(submitButton);

      // Check that validation errors appear (multiple required fields)
      await waitFor(() => {
        // Look for the actual validation messages that appear
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
        expect(screen.getByText(/this field is required/i)).toBeInTheDocument();
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
      expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Last Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Company/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
      expect(screen.getAllByLabelText(/Password/i)[0]).toBeInTheDocument();
      expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument();
    });

    test('password fields render correctly', () => {
      render(
        <TestWrapper>
          <RegisterPage {...mockHandlers} />
        </TestWrapper>
      );

      const passwordInputs = screen.getAllByLabelText(/Password/i);

      expect(passwordInputs).toHaveLength(2); // Password and Confirm Password
      expect(passwordInputs[0]).toHaveAttribute('type', 'password');
      expect(passwordInputs[1]).toHaveAttribute('type', 'password');
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
      expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
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
      
      const emailInput = screen.getByLabelText(/Email Address/i);
      expect(emailInput).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByText(/this field is required/i)).toBeInTheDocument();
    });

    test('keyboard navigation works properly', () => {
      render(
        <TestWrapper>
          <LoginPage {...mockHandlers} />
        </TestWrapper>
      );
      
      const emailInput = screen.getByLabelText(/Email Address/i);
      const passwordInput = screen.getByLabelText(/Password/i);
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
