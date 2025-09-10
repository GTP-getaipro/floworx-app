/**
 * Frontend Test Setup
 * Configures React Testing Library and component test environment
 */

// Use require for better compatibility
require('@testing-library/jest-dom');
const { configure } = require('@testing-library/react');

// Configure Testing Library
configure({
  testIdAttribute: 'data-cy', // Use Cypress data attributes for consistency
});

// Mock axios for frontend tests
jest.mock('axios', () => ({
  get: jest.fn(() => Promise.resolve({ data: {} })),
  post: jest.fn(() => Promise.resolve({ data: {} })),
  put: jest.fn(() => Promise.resolve({ data: {} })),
  delete: jest.fn(() => Promise.resolve({ data: {} })),
  create: jest.fn(() => ({
    get: jest.fn(() => Promise.resolve({ data: {} })),
    post: jest.fn(() => Promise.resolve({ data: {} })),
    put: jest.fn(() => Promise.resolve({ data: {} })),
    delete: jest.fn(() => Promise.resolve({ data: {} })),
  })),
}));

// Mock React Router
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
  useLocation: () => ({
    pathname: '/',
    search: '',
    hash: '',
    state: null,
  }),
  useSearchParams: () => [new URLSearchParams(), jest.fn()],
}));

// Mock AuthContext
jest.mock('../../frontend/src/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    token: null,
    login: jest.fn(),
    logout: jest.fn(),
    register: jest.fn(),
    loading: false,
    error: null
  }),
  AuthProvider: ({ children }) => children
}));

// Mock ToastContext
jest.mock('../../frontend/src/contexts/ToastContext', () => ({
  useToast: () => ({
    showToast: jest.fn(),
    hideToast: jest.fn(),
    toasts: []
  }),
  ToastProvider: ({ children }) => children
}));

// Mock CSS imports
jest.mock('*.css', () => ({}));
jest.mock('*.scss', () => ({}));
jest.mock('*.sass', () => ({}));

// Mock image imports
jest.mock('*.jpg', () => 'test-image.jpg');
jest.mock('*.jpeg', () => 'test-image.jpeg');
jest.mock('*.png', () => 'test-image.png');
jest.mock('*.gif', () => 'test-image.gif');
jest.mock('*.svg', () => 'test-image.svg');

// Global setup for frontend tests
beforeAll(() => {
  // Mock window.scrollTo
  window.scrollTo = jest.fn();
  
  // Mock window.alert
  window.alert = jest.fn();
  
  // Mock window.confirm
  window.confirm = jest.fn(() => true);
  
  console.log('⚛️ Frontend test environment configured');
});

// Clean up after each frontend test
afterEach(() => {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Clear localStorage
  localStorage.clear();
  sessionStorage.clear();
});

// Export test utilities using module.exports for compatibility
module.exports = {
  mockAxios: require('axios'),
  mockNavigate: jest.fn(),
  mockLocation: {
    pathname: '/',
    search: '',
    hash: '',
    state: null,
  }
};
