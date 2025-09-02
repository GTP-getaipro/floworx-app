import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';
import ForgotPassword from '../../frontend/src/components/ForgotPassword';
import ResetPassword from '../../frontend/src/components/ResetPassword';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useSearchParams: () => [new URLSearchParams('?token=valid-reset-token')]
}));

describe('Password Reset Components Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ForgotPassword Component', () => {
    const renderForgotPassword = () => {
      return render(
        <BrowserRouter>
          <ForgotPassword />
        </BrowserRouter>
      );
    };

    describe('Form Rendering', () => {
      test('FP-001: Renders forgot password form correctly', () => {
        renderForgotPassword();

        expect(screen.getByRole('heading', { name: /Reset Your Password/i })).toBeInTheDocument();
        expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Send Reset Link/i })).toBeInTheDocument();
        expect(screen.getByText(/Enter your email address/i)).toBeInTheDocument();
      });

      test('FP-001-LINKS: Renders navigation links', () => {
        renderForgotPassword();

        expect(screen.getByText(/Remember your password/i)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Back to Login/i })).toBeInTheDocument();
      });
    });

    describe('Form Validation', () => {
      test('FP-002: Email input validation', async () => {
        const user = userEvent.setup();
        renderForgotPassword();

        const emailInput = screen.getByLabelText(/Email Address/i);
        const submitButton = screen.getByRole('button', { name: /Send Reset Link/i });

        // Test empty email
        await user.click(submitButton);
        expect(submitButton).toBeDisabled();

        // Test invalid email format
        await user.type(emailInput, 'invalid-email');
        expect(emailInput).toHaveValue('invalid-email');

        // Test valid email format
        await user.clear(emailInput);
        await user.type(emailInput, 'test@floworx-test.com');
        expect(emailInput).toHaveValue('test@floworx-test.com');
        expect(submitButton).not.toBeDisabled();
      });

      test('FP-002-SANITIZATION: Email input sanitization', async () => {
        const user = userEvent.setup();
        renderForgotPassword();

        const emailInput = screen.getByLabelText(/Email Address/i);
        
        // Test that email is trimmed and lowercased
        await user.type(emailInput, '  TEST@FLOWORX-TEST.COM  ');
        
        mockedAxios.post.mockResolvedValue({
          data: {
            success: true,
            message: 'Reset link sent successfully'
          }
        });

        const submitButton = screen.getByRole('button', { name: /Send Reset Link/i });
        await user.click(submitButton);

        await waitFor(() => {
          expect(mockedAxios.post).toHaveBeenCalledWith('/api/password-reset/request', {
            email: 'test@floworx-test.com'
          });
        });
      });
    });

    describe('Form Submission', () => {
      test('FP-003: Loading state during submission', async () => {
        const user = userEvent.setup();
        renderForgotPassword();

        mockedAxios.post.mockImplementation(() => new Promise(() => {})); // Never resolves

        const emailInput = screen.getByLabelText(/Email Address/i);
        await user.type(emailInput, 'test@floworx-test.com');

        const submitButton = screen.getByRole('button', { name: /Send Reset Link/i });
        await user.click(submitButton);

        expect(screen.getByText(/Sending Reset Link.../i)).toBeInTheDocument();
        expect(screen.getByRole('status')).toBeInTheDocument(); // Loading spinner
        expect(submitButton).toBeDisabled();
      });

      test('FP-004: Success message display', async () => {
        const user = userEvent.setup();
        renderForgotPassword();

        mockedAxios.post.mockResolvedValue({
          data: {
            success: true,
            message: 'If an account with that email exists, a password reset link has been sent.'
          }
        });

        const emailInput = screen.getByLabelText(/Email Address/i);
        await user.type(emailInput, 'test@floworx-test.com');

        const submitButton = screen.getByRole('button', { name: /Send Reset Link/i });
        await user.click(submitButton);

        await waitFor(() => {
          expect(screen.getByText(/password reset link has been sent/i)).toBeInTheDocument();
          expect(screen.getByText('✅')).toBeInTheDocument(); // Success icon
        });

        // Form should be cleared
        expect(emailInput).toHaveValue('');
      });

      test('FP-005: Error handling for API failures', async () => {
        const user = userEvent.setup();
        renderForgotPassword();

        mockedAxios.post.mockRejectedValue({
          response: {
            data: {
              message: 'Failed to send password reset email'
            }
          }
        });

        const emailInput = screen.getByLabelText(/Email Address/i);
        await user.type(emailInput, 'test@floworx-test.com');

        const submitButton = screen.getByRole('button', { name: /Send Reset Link/i });
        await user.click(submitButton);

        await waitFor(() => {
          expect(screen.getByText(/Failed to send password reset email/i)).toBeInTheDocument();
          expect(screen.getByText('⚠️')).toBeInTheDocument(); // Error icon
        });
      });
    });
  });

  describe('ResetPassword Component', () => {
    const renderResetPassword = () => {
      return render(
        <BrowserRouter>
          <ResetPassword />
        </BrowserRouter>
      );
    };

    describe('Token Validation', () => {
      test('RP-001: Token validation on mount', async () => {
        mockedAxios.post.mockResolvedValue({
          data: {
            valid: true,
            message: 'Token is valid'
          }
        });

        renderResetPassword();

        expect(screen.getByText(/Validating reset token.../i)).toBeInTheDocument();

        await waitFor(() => {
          expect(screen.getByRole('heading', { name: /Set New Password/i })).toBeInTheDocument();
        });

        expect(mockedAxios.post).toHaveBeenCalledWith('/api/password-reset/validate', {
          token: 'valid-reset-token'
        });
      });

      test('RP-001-INVALID: Invalid token handling', async () => {
        mockedAxios.post.mockRejectedValue({
          response: {
            data: {
              message: 'Invalid or expired reset token'
            }
          }
        });

        renderResetPassword();

        await waitFor(() => {
          expect(screen.getByRole('heading', { name: /Invalid Reset Link/i })).toBeInTheDocument();
          expect(screen.getByText(/Invalid or expired reset token/i)).toBeInTheDocument();
          expect(screen.getByRole('link', { name: /Request New Reset Link/i })).toBeInTheDocument();
        });
      });
    });

    describe('Password Strength Validation', () => {
      beforeEach(() => {
        mockedAxios.post.mockResolvedValue({
          data: {
            valid: true,
            message: 'Token is valid'
          }
        });
      });

      test('RP-002: Password strength indicator', async () => {
        const user = userEvent.setup();
        renderResetPassword();

        await waitFor(() => {
          expect(screen.getByLabelText(/New Password/i)).toBeInTheDocument();
        });

        const passwordInput = screen.getByLabelText(/New Password/i);

        // Test weak password
        await user.type(passwordInput, 'weak');
        expect(screen.getByText(/At least 8 characters/i)).toBeInTheDocument();
        expect(screen.getByText('❌')).toBeInTheDocument();

        // Test stronger password
        await user.clear(passwordInput);
        await user.type(passwordInput, 'StrongPassword123!');
        
        await waitFor(() => {
          expect(screen.getAllByText('✅')).toHaveLength(4); // All requirements met
        });
      });

      test('RP-002-REQUIREMENTS: All password requirements displayed', async () => {
        const user = userEvent.setup();
        renderResetPassword();

        await waitFor(() => {
          expect(screen.getByLabelText(/New Password/i)).toBeInTheDocument();
        });

        const passwordInput = screen.getByLabelText(/New Password/i);
        await user.type(passwordInput, 'test');

        expect(screen.getByText(/At least 8 characters/i)).toBeInTheDocument();
        expect(screen.getByText(/One lowercase letter/i)).toBeInTheDocument();
        expect(screen.getByText(/One uppercase letter/i)).toBeInTheDocument();
        expect(screen.getByText(/One number/i)).toBeInTheDocument();
      });
    });

    describe('Password Confirmation', () => {
      beforeEach(() => {
        mockedAxios.post.mockResolvedValue({
          data: {
            valid: true,
            message: 'Token is valid'
          }
        });
      });

      test('RP-003: Password confirmation matching', async () => {
        const user = userEvent.setup();
        renderResetPassword();

        await waitFor(() => {
          expect(screen.getByLabelText(/New Password/i)).toBeInTheDocument();
        });

        const passwordInput = screen.getByLabelText(/New Password/i);
        const confirmInput = screen.getByLabelText(/Confirm New Password/i);

        await user.type(passwordInput, 'StrongPassword123!');
        await user.type(confirmInput, 'DifferentPassword123!');

        expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument();

        // Fix the confirmation
        await user.clear(confirmInput);
        await user.type(confirmInput, 'StrongPassword123!');

        await waitFor(() => {
          expect(screen.queryByText(/Passwords do not match/i)).not.toBeInTheDocument();
        });
      });
    });

    describe('Form Submission', () => {
      beforeEach(() => {
        mockedAxios.post.mockResolvedValueOnce({
          data: {
            valid: true,
            message: 'Token is valid'
          }
        });
      });

      test('RP-004: Form submission with valid data', async () => {
        const user = userEvent.setup();
        renderResetPassword();

        await waitFor(() => {
          expect(screen.getByLabelText(/New Password/i)).toBeInTheDocument();
        });

        mockedAxios.post.mockResolvedValueOnce({
          data: {
            success: true,
            message: 'Password has been reset successfully'
          }
        });

        const passwordInput = screen.getByLabelText(/New Password/i);
        const confirmInput = screen.getByLabelText(/Confirm New Password/i);
        const submitButton = screen.getByRole('button', { name: /Reset Password/i });

        await user.type(passwordInput, 'NewStrongPassword123!');
        await user.type(confirmInput, 'NewStrongPassword123!');
        await user.click(submitButton);

        await waitFor(() => {
          expect(mockedAxios.post).toHaveBeenCalledWith('/api/password-reset/reset', {
            token: 'valid-reset-token',
            password: 'NewStrongPassword123!'
          });
        });

        expect(screen.getByText(/Password has been reset successfully/i)).toBeInTheDocument();
      });

      test('RP-005: Redirect to login after successful reset', async () => {
        const user = userEvent.setup();
        renderResetPassword();

        await waitFor(() => {
          expect(screen.getByLabelText(/New Password/i)).toBeInTheDocument();
        });

        mockedAxios.post.mockResolvedValueOnce({
          data: {
            success: true,
            message: 'Password has been reset successfully'
          }
        });

        const passwordInput = screen.getByLabelText(/New Password/i);
        const confirmInput = screen.getByLabelText(/Confirm New Password/i);
        const submitButton = screen.getByRole('button', { name: /Reset Password/i });

        await user.type(passwordInput, 'NewStrongPassword123!');
        await user.type(confirmInput, 'NewStrongPassword123!');
        await user.click(submitButton);

        await waitFor(() => {
          expect(screen.getByText(/Password has been reset successfully/i)).toBeInTheDocument();
        });

        // Wait for redirect
        await waitFor(() => {
          expect(mockNavigate).toHaveBeenCalledWith('/login', {
            state: {
              message: 'Password reset successful. Please log in with your new password.'
            }
          });
        }, { timeout: 3000 });
      });

      test('RP-005-ERROR: Handle submission errors', async () => {
        const user = userEvent.setup();
        renderResetPassword();

        await waitFor(() => {
          expect(screen.getByLabelText(/New Password/i)).toBeInTheDocument();
        });

        mockedAxios.post.mockRejectedValueOnce({
          response: {
            data: {
              message: 'Failed to reset password'
            }
          }
        });

        const passwordInput = screen.getByLabelText(/New Password/i);
        const confirmInput = screen.getByLabelText(/Confirm New Password/i);
        const submitButton = screen.getByRole('button', { name: /Reset Password/i });

        await user.type(passwordInput, 'NewStrongPassword123!');
        await user.type(confirmInput, 'NewStrongPassword123!');
        await user.click(submitButton);

        await waitFor(() => {
          expect(screen.getByText(/Failed to reset password/i)).toBeInTheDocument();
          expect(screen.getByText('⚠️')).toBeInTheDocument();
        });

        expect(mockNavigate).not.toHaveBeenCalled();
      });
    });

    describe('Loading States', () => {
      test('RP-LOADING: Shows loading during password reset', async () => {
        const user = userEvent.setup();
        
        mockedAxios.post.mockResolvedValueOnce({
          data: {
            valid: true,
            message: 'Token is valid'
          }
        });

        renderResetPassword();

        await waitFor(() => {
          expect(screen.getByLabelText(/New Password/i)).toBeInTheDocument();
        });

        mockedAxios.post.mockImplementation(() => new Promise(() => {})); // Never resolves

        const passwordInput = screen.getByLabelText(/New Password/i);
        const confirmInput = screen.getByLabelText(/Confirm New Password/i);
        const submitButton = screen.getByRole('button', { name: /Reset Password/i });

        await user.type(passwordInput, 'NewStrongPassword123!');
        await user.type(confirmInput, 'NewStrongPassword123!');
        await user.click(submitButton);

        expect(screen.getByText(/Resetting Password.../i)).toBeInTheDocument();
        expect(submitButton).toBeDisabled();
      });
    });
  });

  describe('Accessibility Tests', () => {
    test('Password reset forms have proper ARIA labels', () => {
      render(
        <BrowserRouter>
          <ForgotPassword />
        </BrowserRouter>
      );

      expect(screen.getByLabelText(/Email Address/i)).toHaveAttribute('aria-required', 'true');
      expect(screen.getByRole('button', { name: /Send Reset Link/i })).toBeInTheDocument();
    });

    test('Error messages have proper ARIA attributes', async () => {
      const user = userEvent.setup();
      
      render(
        <BrowserRouter>
          <ForgotPassword />
        </BrowserRouter>
      );

      mockedAxios.post.mockRejectedValue({
        response: {
          data: {
            message: 'Test error message'
          }
        }
      });

      const emailInput = screen.getByLabelText(/Email Address/i);
      await user.type(emailInput, 'test@example.com');
      
      const submitButton = screen.getByRole('button', { name: /Send Reset Link/i });
      await user.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.getByText(/Test error message/i);
        expect(errorMessage).toHaveAttribute('role', 'alert');
      });
    });
  });
});
