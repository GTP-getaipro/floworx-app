import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';

// Common navigation steps
Given('I am on the FloWorx registration page', () => {
  cy.visit('/');
  // Check if we're on the homepage and need to navigate to registration
  cy.get('body').then(($body) => {
    if ($body.find('[data-testid="register-link"]').length > 0) {
      cy.get('[data-testid="register-link"]').click();
    } else if ($body.find('a[href*="register"]').length > 0) {
      cy.get('a[href*="register"]').first().click();
    } else {
      // Try direct navigation
      cy.visit('/register');
    }
  });
  cy.url().should('match', /(register|signup)/);
});

Given('I am on the login page', () => {
  cy.visit('/');
  // Check if we're already on login page or need to navigate
  cy.get('body').then(($body) => {
    if ($body.find('[data-testid="login-form"]').length === 0) {
      if ($body.find('[data-testid="login-link"]').length > 0) {
        cy.get('[data-testid="login-link"]').click();
      } else if ($body.find('a[href*="login"]').length > 0) {
        cy.get('a[href*="login"]').first().click();
      }
    }
  });
  cy.url().should('match', /(login|signin|\/)/);
});

Given('I am on the dashboard page', () => {
  // First ensure we're logged in
  cy.loginAsTestUser();
  cy.visit('/dashboard');
  cy.url().should('include', '/dashboard');
});

Given('I am on the profile page', () => {
  // First ensure we're logged in
  cy.loginAsTestUser();
  cy.visit('/profile');
  cy.url().should('include', '/profile');
});

// Authentication state steps
Given('I am logged in as a registered user', () => {
  cy.loginAsTestUser();
});

Given('I have a registered account with email {string} and password {string}', (email, password) => {
  // Create a real test user account
  cy.request({
    method: 'POST',
    url: '/api/auth/register',
    body: {
      firstName: 'Test',
      lastName: 'User',
      email: email,
      password: password,
      companyName: 'Test Company',
      agreeToTerms: true
    },
    failOnStatusCode: false
  }).then((response) => {
    // Account creation successful or already exists
    expect([201, 409]).to.include(response.status);
    cy.wrap({ email, password }).as('testUserCredentials');
  });
});

Given('I am a new user who wants to create an account', () => {
  // Generate unique test user data
  cy.task('generateTestEmail').then((email) => {
    cy.wrap({
      email: email,
      firstName: 'Test',
      lastName: 'User',
      password: 'TestPassword123!',
      companyName: 'Test Company'
    }).as('testUser');
  });
});

Given('I am a new user visiting FloWorx for the first time', () => {
  cy.clearLocalStorage();
  cy.clearCookies();
  cy.visit('/');
  cy.get('body').should('be.visible');
});

Given('I am going through the user registration process', () => {
  cy.visit('/');
  // Navigate to registration if not already there
  cy.get('body').then(($body) => {
    if ($body.find('[data-testid="register-link"]').length > 0) {
      cy.get('[data-testid="register-link"]').click();
    }
  });
});

Given('I have completed the full registration and setup process', () => {
  // Create and login with a test user
  cy.task('generateTestEmail').then((email) => {
    const userData = {
      firstName: 'Test',
      lastName: 'User',
      email: email,
      password: 'TestPassword123!',
      companyName: 'Test Company',
      agreeToTerms: true
    };

    // Register the user
    cy.request({
      method: 'POST',
      url: '/api/auth/register',
      body: userData,
      failOnStatusCode: false
    }).then((response) => {
      if (response.status === 201 && response.body.token) {
        // Store the token for authenticated requests
        window.localStorage.setItem('authToken', response.body.token);
        cy.wrap(userData).as('registeredUser');
      }
    });
  });
});

Given('I start my user journey on Chrome browser', () => {
  // Cypress runs in the configured browser, so just ensure clean state
  cy.clearLocalStorage();
  cy.clearCookies();
  cy.visit('/');
});

Given('I am using a mobile device', () => {
  cy.viewport(375, 667); // iPhone SE dimensions
  cy.visit('/');
});

Given('I am completing the user journey', () => {
  cy.visit('/');
  cy.get('body').should('be.visible');
});

Given('I am testing the complete API integration', () => {
  // Set up for API testing
  cy.visit('/');
});

// Form interaction steps
When('I fill in the registration form with valid information:', (dataTable) => {
  const userData = dataTable.hashes()[0];
  
  cy.get('[data-testid="firstName-input"]').type(userData.firstName);
  cy.get('[data-testid="lastName-input"]').type(userData.lastName);
  cy.get('[data-testid="email-input"]').type(userData.email);
  cy.get('[data-testid="password-input"]').type(userData.password);
  
  if (userData.companyName) {
    cy.get('[data-testid="companyName-input"]').type(userData.companyName);
  }
});

When('I submit the registration form', () => {
  cy.get('[data-testid="register-submit-button"]').click();
});

When('I enter my valid credentials:', (dataTable) => {
  const credentials = dataTable.hashes()[0];
  
  cy.get('[data-testid="email-input"]').type(credentials.email);
  cy.get('[data-testid="password-input"]').type(credentials.password);
});

When('I click the login button', () => {
  cy.get('[data-testid="login-submit-button"]').click();
});

// Assertion steps
Then('I should see a successful registration message', () => {
  cy.get('[data-testid="success-message"]')
    .should('be.visible')
    .and('contain', 'registration successful');
});

Then('I should be redirected to the dashboard', () => {
  cy.url().should('include', '/dashboard');
  cy.get('[data-testid="dashboard-container"]').should('be.visible');
});

Then('I should have a valid authentication token stored', () => {
  cy.window().then((window) => {
    const token = window.localStorage.getItem('authToken') || 
                  window.sessionStorage.getItem('authToken');
    expect(token).to.exist;
    expect(token).to.match(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);
  });
});

Then('I should be successfully logged in', () => {
  cy.get('[data-testid="user-menu"]').should('be.visible');
  cy.url().should('not.include', '/login');
});

Then('I should see an error message {string}', (errorMessage) => {
  cy.get('[data-testid="error-message"]')
    .should('be.visible')
    .and('contain', errorMessage);
});

Then('I should remain on the login page', () => {
  cy.url().should('include', '/login');
});

Then('no authentication token should be stored', () => {
  cy.window().then((window) => {
    const token = window.localStorage.getItem('authToken') || 
                  window.sessionStorage.getItem('authToken');
    expect(token).to.be.null;
  });
});

// API validation steps
Then('the API should return a {int} status code', (statusCode) => {
  cy.get('@apiResponse').should('have.property', 'status', statusCode);
});

Then('the response should contain:', (dataTable) => {
  const expectedFields = dataTable.hashes();
  
  expectedFields.forEach((field) => {
    cy.get('@apiResponse').then((response) => {
      expect(response.body).to.have.property(field.field);
      
      if (field.type === 'string') {
        expect(response.body[field.field]).to.be.a('string');
      } else if (field.type === 'object') {
        expect(response.body[field.field]).to.be.an('object');
      } else if (field.type === 'number') {
        expect(response.body[field.field]).to.be.a('number');
      }
    });
  });
});

// Security validation steps
Then('the form should be served over HTTPS', () => {
  cy.location('protocol').should('eq', 'https:');
});

Then('the password field should be masked', () => {
  cy.get('[data-testid="password-input"]')
    .should('have.attr', 'type', 'password');
});

// Accessibility validation steps
Then('all form fields should have proper labels', () => {
  cy.get('input').each(($input) => {
    const id = $input.attr('id');
    if (id) {
      cy.get(`label[for="${id}"]`).should('exist');
    }
  });
});

Then('the form should be keyboard navigable', () => {
  cy.get('input:first').focus();
  cy.focused().tab();
  cy.focused().should('not.be', 'input:first');
});

// Error handling steps
Then('I should see validation errors for:', (dataTable) => {
  const expectedErrors = dataTable.hashes();
  
  expectedErrors.forEach((errorInfo) => {
    cy.get(`[data-testid="${errorInfo.field}-error"]`)
      .should('be.visible')
      .and('contain', errorInfo.error);
  });
});

Then('the form should not be submitted', () => {
  cy.url().should('not.have.changed');
  cy.get('[data-testid="loading-spinner"]').should('not.exist');
});
