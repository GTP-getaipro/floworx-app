// Custom commands for FloWorx E2E testing

// Authentication commands
Cypress.Commands.add('loginAsTestUser', (email = null, password = null) => {
  const testEmail = email || Cypress.env('TEST_USER_EMAIL');
  const testPassword = password || Cypress.env('TEST_USER_PASSWORD');
  
  cy.session([testEmail, testPassword], () => {
    cy.visit('/login');
    
    // Mock successful login response
    cy.intercept('POST', '/api/auth/login', {
      statusCode: 200,
      body: {
        message: 'Login successful',
        user: {
          id: 'test-user-id',
          email: testEmail,
          firstName: 'Test',
          lastName: 'User',
          companyName: 'Test Company',
          createdAt: new Date().toISOString()
        },
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItaWQiLCJlbWFpbCI6InRlc3RAZmxvd29yeC5jb20iLCJpYXQiOjE2MzQ1NjcwMDAsImV4cCI6MTYzNDY1MzQwMH0.test-signature',
        expiresIn: '24h'
      }
    }).as('loginRequest');
    
    cy.get('[data-testid="email-input"]').type(testEmail);
    cy.get('[data-testid="password-input"]').type(testPassword);
    cy.get('[data-testid="login-submit-button"]').click();
    
    cy.wait('@loginRequest');
    
    // Verify login success
    cy.url().should('include', '/dashboard');
    cy.window().then((window) => {
      expect(window.localStorage.getItem('authToken')).to.exist;
    });
  });
});

Cypress.Commands.add('createTestUser', (email = null, password = null) => {
  const testEmail = email || `test-${Date.now()}@floworx.com`;
  const testPassword = password || 'TestPassword123!';
  
  // Mock user creation
  cy.intercept('POST', '/api/auth/register', {
    statusCode: 201,
    body: {
      message: 'User registered successfully',
      user: {
        id: 'new-test-user-id',
        email: testEmail,
        firstName: 'Test',
        lastName: 'User',
        companyName: 'Test Company',
        createdAt: new Date().toISOString()
      },
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJuZXctdGVzdC11c2VyLWlkIiwiZW1haWwiOiJ0ZXN0QGZsb3dvcnguY29tIiwiaWF0IjoxNjM0NTY3MDAwLCJleHAiOjE2MzQ2NTM0MDB9.test-signature',
      expiresIn: '24h'
    }
  }).as('registerRequest');
  
  return cy.wrap({ email: testEmail, password: testPassword });
});

Cypress.Commands.add('logout', () => {
  cy.intercept('POST', '/api/auth/logout', {
    statusCode: 200,
    body: {
      message: 'Logout successful',
      timestamp: new Date().toISOString()
    }
  }).as('logoutRequest');
  
  cy.get('[data-testid="user-menu"]').click();
  cy.get('[data-testid="logout-button"]').click();
  
  cy.wait('@logoutRequest');
  
  // Verify logout
  cy.url().should('include', '/login');
  cy.window().then((window) => {
    expect(window.localStorage.getItem('authToken')).to.be.null;
  });
});

// Form interaction commands
Cypress.Commands.add('fillRegistrationForm', (userData) => {
  cy.get('[data-testid="firstName-input"]').type(userData.firstName);
  cy.get('[data-testid="lastName-input"]').type(userData.lastName);
  cy.get('[data-testid="email-input"]').type(userData.email);
  cy.get('[data-testid="password-input"]').type(userData.password);
  
  if (userData.companyName) {
    cy.get('[data-testid="companyName-input"]').type(userData.companyName);
  }
});

Cypress.Commands.add('fillLoginForm', (email, password) => {
  cy.get('[data-testid="email-input"]').type(email);
  cy.get('[data-testid="password-input"]').type(password);
});

// Dashboard interaction commands
Cypress.Commands.add('waitForDashboardLoad', () => {
  cy.get('[data-testid="dashboard-container"]').should('be.visible');
  cy.get('[data-testid="loading-spinner"]').should('not.exist');
});

Cypress.Commands.add('connectGoogleAccount', () => {
  // Mock OAuth flow
  cy.intercept('GET', '/api/oauth/google', {
    statusCode: 302,
    headers: {
      'Location': 'https://accounts.google.com/o/oauth2/v2/auth?client_id=test'
    }
  }).as('oauthInitiation');
  
  cy.intercept('GET', '/api/oauth/google/callback*', {
    statusCode: 200,
    body: {
      message: 'OAuth connection successful',
      user: {
        email: 'test@gmail.com',
        name: 'Test User',
        picture: 'https://example.com/avatar.jpg'
      },
      tokenReceived: true,
      refreshTokenReceived: true
    }
  }).as('oauthCallback');
  
  cy.get('[data-testid="connect-google-button"]').click();
  cy.wait('@oauthInitiation');
  
  // Simulate successful OAuth callback
  cy.visit('/api/oauth/google/callback?code=test_auth_code&state=test123');
  cy.wait('@oauthCallback');
});

// Validation commands
Cypress.Commands.add('shouldHaveValidationError', (fieldName, errorMessage) => {
  cy.get(`[data-testid="${fieldName}-error"]`)
    .should('be.visible')
    .and('contain', errorMessage);
});

Cypress.Commands.add('shouldNotHaveValidationErrors', () => {
  cy.get('[data-testid*="-error"]').should('not.exist');
});

// API testing commands
Cypress.Commands.add('testApiEndpoint', (method, endpoint, expectedStatus = 200) => {
  return cy.apiRequest(method, endpoint).then((response) => {
    expect(response.status).to.equal(expectedStatus);
    return cy.wrap(response);
  });
});

Cypress.Commands.add('testAuthenticatedEndpoint', (method, endpoint, expectedStatus = 200) => {
  return cy.authenticatedApiRequest(method, endpoint).then((response) => {
    expect(response.status).to.equal(expectedStatus);
    return cy.wrap(response);
  });
});

// Accessibility testing commands
Cypress.Commands.add('checkAccessibility', () => {
  // Basic accessibility checks
  cy.get('img').each(($img) => {
    cy.wrap($img).should('have.attr', 'alt');
  });
  
  cy.get('input').each(($input) => {
    const id = $input.attr('id');
    if (id) {
      cy.get(`label[for="${id}"]`).should('exist');
    }
  });
  
  cy.get('button').each(($button) => {
    cy.wrap($button).should('not.be.empty');
  });
});

// Performance testing commands
Cypress.Commands.add('measurePageLoad', (pageName) => {
  const perf = cy.measurePerformance(`page-load-${pageName}`);
  
  return {
    end: () => {
      perf.end();
    }
  };
});

Cypress.Commands.add('measureApiCall', (apiName) => {
  const perf = cy.measurePerformance(`api-call-${apiName}`);
  
  return {
    end: () => {
      perf.end();
    }
  };
});

// Error handling commands
Cypress.Commands.add('simulateNetworkError', (endpoint) => {
  cy.intercept(endpoint, { forceNetworkError: true }).as('networkError');
});

Cypress.Commands.add('simulateServerError', (endpoint, statusCode = 500) => {
  cy.intercept(endpoint, {
    statusCode: statusCode,
    body: {
      error: 'Internal server error',
      message: 'Something went wrong'
    }
  }).as('serverError');
});

// Mobile testing commands
Cypress.Commands.add('testMobileViewport', () => {
  cy.viewport(375, 667); // iPhone SE
  cy.get('[data-testid="mobile-menu-toggle"]').should('be.visible');
});

Cypress.Commands.add('testTabletViewport', () => {
  cy.viewport(768, 1024); // iPad
});

Cypress.Commands.add('testDesktopViewport', () => {
  cy.viewport(1280, 720); // Desktop
});

// Data cleanup commands
Cypress.Commands.add('cleanupTestData', () => {
  cy.task('clearTestData');
  cy.clearLocalStorage();
  cy.clearCookies();
});

// Screenshot and video commands
Cypress.Commands.add('takeScreenshotOnFailure', (testName) => {
  cy.screenshot(`failed-${testName}-${Date.now()}`);
});

// Custom assertions
Cypress.Commands.add('shouldBeResponsive', { prevSubject: 'element' }, (subject) => {
  // Test different viewports
  const viewports = [
    { width: 375, height: 667 },   // Mobile
    { width: 768, height: 1024 },  // Tablet
    { width: 1280, height: 720 }   // Desktop
  ];
  
  viewports.forEach((viewport) => {
    cy.viewport(viewport.width, viewport.height);
    cy.wrap(subject).should('be.visible');
  });
  
  return cy.wrap(subject);
});
