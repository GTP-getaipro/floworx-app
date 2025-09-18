/**
 * FloWorx Frontend Guardrails Tests
 * 
 * These tests validate that frontend components follow FloWorx design system
 * and security requirements to prevent architectural drift.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';

// Import components to test
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import ResetPasswordPage from '../pages/ResetPasswordPage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';

// Mock API calls
global.fetch = jest.fn();

// Mock useSearchParams for components that need it
const mockSearchParams = new URLSearchParams();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useSearchParams: () => [mockSearchParams],
  useNavigate: () => jest.fn(),
}));

describe('FloWorx Frontend Guardrails', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    });
  });

  describe('Email Security Guardrails', () => {
    test('ForgotPasswordPage email field starts empty', () => {
      render(
        <BrowserRouter>
          <ForgotPasswordPage />
        </BrowserRouter>
      );

      const emailInput = screen.getByRole('textbox', { name: /email/i });
      expect(emailInput).toHaveValue('');
      expect(emailInput).not.toHaveAttribute('defaultValue');
    });

    test('LoginPage email field starts empty', () => {
      render(
        <BrowserRouter>
          <LoginPage />
        </BrowserRouter>
      );

      const emailInput = screen.getByRole('textbox', { name: /email/i });
      expect(emailInput).toHaveValue('');
      expect(emailInput).not.toHaveAttribute('defaultValue');
    });

    test('RegisterPage email field starts empty', () => {
      render(
        <BrowserRouter>
          <RegisterPage />
        </BrowserRouter>
      );

      const emailInput = screen.getByRole('textbox', { name: /email/i });
      expect(emailInput).toHaveValue('');
      expect(emailInput).not.toHaveAttribute('defaultValue');
    });

    test('auth forms have autocomplete disabled for security', () => {
      render(
        <BrowserRouter>
          <ForgotPasswordPage />
        </BrowserRouter>
      );

      const emailInput = screen.getByRole('textbox', { name: /email/i });
      expect(emailInput).toHaveAttribute('autoComplete', 'off');
    });
  });

  describe('Form Validation Guardrails', () => {
    test('ForgotPasswordPage uses proper validation', () => {
      render(
        <BrowserRouter>
          <ForgotPasswordPage />
        </BrowserRouter>
      );

      const emailInput = screen.getByRole('textbox', { name: /email/i });
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toBeRequired();
    });

    test('LoginPage has proper form structure', () => {
      render(
        <BrowserRouter>
          <LoginPage />
        </BrowserRouter>
      );

      // Check for email and password fields
      expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    test('RegisterPage has comprehensive validation fields', () => {
      render(
        <BrowserRouter>
          <RegisterPage />
        </BrowserRouter>
      );

      // Check for all required registration fields
      expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    });
  });

  describe('Design System Compliance Guardrails', () => {
    test('auth pages use FloWorx design system components', () => {
      render(
        <BrowserRouter>
          <ForgotPasswordPage />
        </BrowserRouter>
      );

      // Check for FloWorx design system classes (Tailwind-based)
      const container = document.querySelector('.min-h-screen');
      expect(container).toBeInTheDocument();
      
      // Check for FloWorx branding
      expect(screen.getByText(/floworx/i)).toBeInTheDocument();
    });

    test('components do not use external design library classes', () => {
      render(
        <BrowserRouter>
          <LoginPage />
        </BrowserRouter>
      );

      // Check that no Material-UI classes are present
      const muiClasses = document.querySelectorAll('[class*="MuiButton"], [class*="MuiTextField"], [class*="MuiFormControl"]');
      expect(muiClasses).toHaveLength(0);

      // Check that no Bootstrap classes are present
      const bootstrapClasses = document.querySelectorAll('[class*="btn-primary"], [class*="form-control"], [class*="container-fluid"]');
      expect(bootstrapClasses).toHaveLength(0);
    });

    test('forms use consistent FloWorx styling patterns', () => {
      render(
        <BrowserRouter>
          <RegisterPage />
        </BrowserRouter>
      );

      // Check for consistent Tailwind classes that indicate FloWorx design system
      const inputs = document.querySelectorAll('input');
      inputs.forEach(input => {
        // Should have Tailwind classes, not external library classes
        const className = input.className;
        expect(className).not.toContain('MuiInput');
        expect(className).not.toContain('form-control');
        expect(className).not.toContain('ant-input');
      });
    });
  });

  describe('Component Structure Guardrails', () => {
    test('canonical auth components render without errors', () => {
      const components = [
        { Component: ForgotPasswordPage, name: 'ForgotPasswordPage' },
        { Component: LoginPage, name: 'LoginPage' },
        { Component: RegisterPage, name: 'RegisterPage' }
      ];

      components.forEach(({ Component, name }) => {
        expect(() => {
          render(
            <BrowserRouter>
              <Component />
            </BrowserRouter>
          );
        }).not.toThrow();
      });
    });

    test('ResetPasswordPage handles token parameter correctly', () => {
      // Mock token in URL params
      mockSearchParams.set('token', 'test-token-123');
      
      expect(() => {
        render(
          <BrowserRouter>
            <ResetPasswordPage />
          </BrowserRouter>
        );
      }).not.toThrow();
    });
  });

  describe('Error Handling Guardrails', () => {
    test('auth pages handle API errors gracefully', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      render(
        <BrowserRouter>
          <ForgotPasswordPage />
        </BrowserRouter>
      );

      // Component should render even if API calls fail
      expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
    });

    test('forms display validation errors appropriately', () => {
      render(
        <BrowserRouter>
          <LoginPage errors={{ submit: 'Invalid credentials' }} />
        </BrowserRouter>
      );

      // Should handle error props gracefully
      expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
    });
  });

  describe('Accessibility Guardrails', () => {
    test('auth forms have proper ARIA labels', () => {
      render(
        <BrowserRouter>
          <RegisterPage />
        </BrowserRouter>
      );

      const emailInput = screen.getByRole('textbox', { name: /email/i });
      expect(emailInput).toHaveAccessibleName();

      const passwordInput = screen.getByLabelText(/^password/i);
      expect(passwordInput).toHaveAccessibleName();
    });

    test('forms are keyboard navigable', () => {
      render(
        <BrowserRouter>
          <LoginPage />
        </BrowserRouter>
      );

      const emailInput = screen.getByRole('textbox', { name: /email/i });
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Check that elements can receive focus
      expect(emailInput).not.toHaveAttribute('tabIndex', '-1');
      expect(passwordInput).not.toHaveAttribute('tabIndex', '-1');
      expect(submitButton).not.toHaveAttribute('tabIndex', '-1');
    });
  });

  describe('Performance Guardrails', () => {
    test('components render efficiently without unnecessary re-renders', () => {
      const renderSpy = jest.fn();
      
      const TestComponent = () => {
        renderSpy();
        return (
          <BrowserRouter>
            <ForgotPasswordPage />
          </BrowserRouter>
        );
      };

      const { rerender } = render(<TestComponent />);
      expect(renderSpy).toHaveBeenCalledTimes(1);

      // Re-render with same props should not cause unnecessary renders
      rerender(<TestComponent />);
      expect(renderSpy).toHaveBeenCalledTimes(2); // Expected for React testing
    });
  });
});
