// Import commands.js using ES2015 syntax:
import './commands';

// Import Cypress plugins
import 'cypress-mochawesome-reporter/register';

// Global configuration
Cypress.on('uncaught:exception', (err, runnable) => {
  // Prevent Cypress from failing on uncaught exceptions
  // that might occur in the application
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false;
  }
  if (err.message.includes('Non-Error promise rejection captured')) {
    return false;
  }
  return true;
});

// Global before hook
before(() => {
  // Set up test environment
  cy.log('Setting up E2E test environment');
  
  // Clear any existing data
  cy.clearLocalStorage();
  cy.clearCookies();
  
  // Log that we're using real API endpoints
  cy.log('Using real API endpoints at https://app.floworx-iq.com/api');
});

// Global beforeEach hook
beforeEach(() => {
  // Reset state before each test
  cy.clearLocalStorage();
  cy.clearCookies();
  
  // Using real API endpoints - no interceptors needed
  
  // Set viewport to desktop by default
  cy.viewport(1280, 720);
});

// Global afterEach hook
afterEach(() => {
  // Clean up after each test
  cy.clearLocalStorage();
  cy.clearCookies();
  
  // Log test completion
  cy.log('Test completed, cleaning up...');
});

// Custom Cypress configuration for real API testing

// Add custom assertion for JWT tokens
Cypress.Commands.add('shouldBeValidJWT', { prevSubject: true }, (subject) => {
  expect(subject).to.match(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);
  return cy.wrap(subject);
});

// Add custom command for API testing
Cypress.Commands.add('apiRequest', (method, url, body = null, headers = {}) => {
  const fullUrl = url.startsWith('http') ? url : `${Cypress.env('API_BASE_URL')}${url}`;

  return cy.request({
    method,
    url: fullUrl,
    body,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    failOnStatusCode: false
  });
});

// Add custom command for authenticated API requests
Cypress.Commands.add('authenticatedApiRequest', (method, url, body = null) => {
  return cy.window().then((window) => {
    const token = window.localStorage.getItem('authToken') ||
                  window.sessionStorage.getItem('authToken');

    return cy.request({
      method,
      url: url.startsWith('http') ? url : `${Cypress.env('API_BASE_URL')}${url}`,
      body,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      failOnStatusCode: false
    });
  });
});

// Performance monitoring
Cypress.Commands.add('measurePerformance', (actionName) => {
  cy.window().then((window) => {
    window.performance.mark(`${actionName}-start`);
  });
  
  return {
    end: () => {
      cy.window().then((window) => {
        window.performance.mark(`${actionName}-end`);
        window.performance.measure(actionName, `${actionName}-start`, `${actionName}-end`);
        
        const measure = window.performance.getEntriesByName(actionName)[0];
        cy.log(`Performance: ${actionName} took ${measure.duration.toFixed(2)}ms`);
        
        // Assert performance requirements
        if (actionName.includes('page-load')) {
          expect(measure.duration).to.be.lessThan(3000); // 3 seconds max
        } else if (actionName.includes('api-call')) {
          expect(measure.duration).to.be.lessThan(2000); // 2 seconds max
        }
      });
    }
  };
});
