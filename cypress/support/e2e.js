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
  
  // Set up API interceptors for common endpoints
  cy.intercept('GET', '/api/health', {
    statusCode: 200,
    body: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }
  }).as('healthCheck');
});

// Global beforeEach hook
beforeEach(() => {
  // Reset state before each test
  cy.clearLocalStorage();
  cy.clearCookies();
  
  // Set up common interceptors
  cy.setupCommonInterceptors();
  
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

// Custom Cypress configuration
Cypress.Commands.add('setupCommonInterceptors', () => {
  // Health check
  cy.intercept('GET', '/api/health', {
    statusCode: 200,
    body: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: { connected: true, provider: 'Supabase' },
      environment: 'test',
      version: '1.0.0'
    }
  }).as('healthCheck');
  
  // User status
  cy.intercept('GET', '/api/user/status', (req) => {
    if (req.headers.authorization) {
      req.reply({
        statusCode: 200,
        body: {
          id: 'test-user-id',
          email: 'test@floworx.com',
          firstName: 'Test',
          lastName: 'User',
          companyName: 'Test Company',
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          emailVerified: true,
          connected_services: [],
          oauth_connections: [],
          has_google_connection: false
        }
      });
    } else {
      req.reply({
        statusCode: 401,
        body: {
          error: 'Authentication required',
          message: 'Please log in to access this resource'
        }
      });
    }
  }).as('getUserStatus');
  
  // Dashboard data
  cy.intercept('GET', '/api/dashboard', (req) => {
    if (req.headers.authorization) {
      req.reply({
        statusCode: 200,
        body: {
          user: {
            id: 'test-user-id',
            email: 'test@floworx.com',
            firstName: 'Test',
            lastName: 'User',
            companyName: 'Test Company',
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
          },
          stats: {
            emailsProcessed: 0,
            workflowsActive: 0,
            totalAutomations: 0,
            lastActivity: new Date().toISOString()
          },
          connections: {
            google: { connected: false, status: 'not_connected' }
          },
          recentActivities: [],
          quickActions: [
            {
              id: 'connect_google',
              title: 'Connect Google Account',
              description: 'Connect your Google account to start automating emails',
              action: '/api/oauth/google',
              enabled: true,
              priority: 1
            }
          ],
          systemStatus: {
            apiHealthy: true,
            databaseConnected: true,
            lastUpdated: new Date().toISOString()
          }
        }
      });
    } else {
      req.reply({
        statusCode: 401,
        body: {
          error: 'Authentication required',
          message: 'Please log in to access this resource'
        }
      });
    }
  }).as('getDashboard');
});

// Add custom assertion for JWT tokens
Cypress.Commands.add('shouldBeValidJWT', { prevSubject: true }, (subject) => {
  expect(subject).to.match(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);
  return cy.wrap(subject);
});

// Add custom command for API testing
Cypress.Commands.add('apiRequest', (method, url, body = null, headers = {}) => {
  return cy.request({
    method,
    url: `${Cypress.env('API_BASE_URL')}${url}`,
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
    
    return cy.apiRequest(method, url, body, {
      'Authorization': `Bearer ${token}`
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
