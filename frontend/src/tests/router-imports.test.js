/**
 * Router Import Regression Test
 * 
 * Ensures that Router components are properly imported and no
 * "Router is not defined" errors occur during rendering.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import App from '../App';

// Mock the auth context to avoid authentication issues in tests
jest.mock('../contexts/AuthContext', () => ({
  AuthProvider: ({ children }) => <div data-testid="auth-provider">{children}</div>,
  useAuth: () => ({
    isAuthenticated: () => false,
    loading: false,
    user: null,
    login: jest.fn(),
    logout: jest.fn(),
  }),
}));

// Mock the toast context
jest.mock('../contexts/ToastContext', () => ({
  ToastProvider: ({ children }) => <div data-testid="toast-provider">{children}</div>,
  useToast: () => ({
    showSuccess: jest.fn(),
    showError: jest.fn(),
    showInfo: jest.fn(),
  }),
}));

// Mock the error context
jest.mock('../contexts/ErrorContext', () => ({
  ErrorProvider: ({ children }) => <div data-testid="error-provider">{children}</div>,
  useErrorReporting: () => ({
    reportError: jest.fn(),
  }),
}));

describe('Router Import Regression Test', () => {
  test('App component renders without Router import errors', () => {
    // This test will fail if Router, Routes, Route, or Navigate are not properly imported
    expect(() => {
      render(<App />);
    }).not.toThrow();
  });

  test('Router components are properly defined and accessible', () => {
    render(<App />);

    // The app should render without throwing "Router is not defined" errors
    // We should see the main app structure
    expect(screen.getAllByText('FloWorx')).toHaveLength(2); // Header and brand
    expect(screen.getByText('Email AI Built by Hot Tub Pros—For Hot Tub Pros')).toBeInTheDocument();
  });

  test('Navigation routes are accessible without errors', () => {
    render(<App />);
    
    // The Router should be working and routes should be accessible
    // Since we're not authenticated, we should see the login form
    expect(screen.getByText('Sign in to Floworx')).toBeInTheDocument();
  });

  test('React Router components are imported correctly', () => {
    // Test that the imports don't cause reference errors
    const { BrowserRouter, Routes, Route, Navigate } = require('react-router-dom');
    
    expect(BrowserRouter).toBeDefined();
    expect(Routes).toBeDefined();
    expect(Route).toBeDefined();
    expect(Navigate).toBeDefined();
  });
});
