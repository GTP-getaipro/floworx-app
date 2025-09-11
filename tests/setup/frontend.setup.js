
/**
 * Frontend Test Setup
 * Configures jsdom environment for React component tests
 */

import '@testing-library/jest-dom';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Setup console error filtering
const originalError = console.error;
console.error = (...args) => {
  // Filter out known React warnings in tests
  if (
    typeof args[0] === 'string' &&
    args[0].includes('Warning: ReactDOM.render is deprecated')
  ) {
    return;
  }
  originalError.call(console, ...args);
};
