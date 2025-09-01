import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';

// Common navigation steps
Given('I am on the FloWorx registration page', () => {
  cy.visit('/register');
  cy.url().should('include', '/register');
});

Given('I am on the login page', () => {
  cy.visit('/login');
  cy.url().should('include', '/login');
});

Given('I am on the dashboard page', () => {
  cy.visit('/dashboard');
  cy.url().should('include', '/dashboard');
});

Given('I am on the profile page', () => {
  cy.visit('/profile');
  cy.url().should('include', '/profile');
});

// Authentication state steps
Given('I am logged in as a registered user', () => {
  cy.loginAsTestUser();
});

Given('I have a registered account with email {string} and password {string}', (email, password) => {
  cy.createTestUser(email, password);
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
