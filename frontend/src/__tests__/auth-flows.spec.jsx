import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import ResetPasswordPage from '../pages/ResetPasswordPage';
import VerifyEmailPage from '../pages/VerifyEmailPage';

// Mock the API
global.fetch = jest.fn();

// Mock useSearchParams for ResetPasswordPage and VerifyEmailPage
const mockSearchParams = new URLSearchParams();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useSearchParams: () => [mockSearchParams],
  useNavigate: () => jest.fn(),
}));

// Wrapper component for router context
const RouterWrapper = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('Auth Flows', () => {
  beforeEach(() => {
    fetch.mockClear();
    mockSearchParams.delete('token');
  });

  describe('ForgotPasswordPage', () => {
    it('should trigger request endpoint and show success message', async () => {
      // Mock successful API response
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Reset email sent' }),
      });

      render(
        <RouterWrapper>
          <ForgotPasswordPage />
        </RouterWrapper>
      );

      // Fill in email
      const emailInput = screen.getByLabelText(/email address/i);
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      // Submit form
      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      fireEvent.click(submitButton);

      // Wait for API call
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/auth/password/request', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email: 'test@example.com' }),
          credentials: 'include',
        });
      });

      // Check success message appears
      await waitFor(() => {
        expect(screen.getByText(/if an account exists with that email address/i)).toBeInTheDocument();
      });
    });
  });

  describe('ResetPasswordPage', () => {
    it('should map 410 error to expired message and keep button enabled for retry', async () => {
      // Set token in search params
      mockSearchParams.set('token', 'test-token');

      // Mock 410 error response
      fetch.mockRejectedValueOnce({
        status: 410,
        code: 'TOKEN_EXPIRED',
        message: 'Token expired',
      });

      render(
        <RouterWrapper>
          <ResetPasswordPage />
        </RouterWrapper>
      );

      // Fill in password fields
      const passwordInput = screen.getByLabelText(/^new password$/i);
      const confirmInput = screen.getByLabelText(/^confirm new password$/i);
      
      fireEvent.change(passwordInput, { target: { value: 'NewPassword123!' } });
      fireEvent.change(confirmInput, { target: { value: 'NewPassword123!' } });

      // Submit form
      const submitButton = screen.getByRole('button', { name: /update password/i });
      fireEvent.click(submitButton);

      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText(/that link has expired/i)).toBeInTheDocument();
      });

      // Check button is still enabled for retry
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('VerifyEmailPage', () => {
    it('should show success on 200 response', async () => {
      // Set token in search params
      mockSearchParams.set('token', 'verify-token');

      // Mock successful verification
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Email verified' }),
      });

      render(
        <RouterWrapper>
          <VerifyEmailPage />
        </RouterWrapper>
      );

      // Wait for verification to complete
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/auth/verify', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ token: 'verify-token' }),
          credentials: 'include',
        });
      });

      // Check success message
      await waitFor(() => {
        expect(screen.getByText(/email verified!/i)).toBeInTheDocument();
        expect(screen.getByText(/continue to sign in/i)).toBeInTheDocument();
      });
    });
  });
});
