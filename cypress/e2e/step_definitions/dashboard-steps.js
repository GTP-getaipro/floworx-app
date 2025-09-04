import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';

// Dashboard loading and display steps
Then('I should see the dashboard header with my name', () => {
  cy.get('[data-testid="dashboard-header"]').should('be.visible');
  cy.get('[data-testid="user-name"]').should('be.visible').and('not.be.empty');
});

Then('I should see my account statistics:', (dataTable) => {
  const expectedStats = dataTable.hashes();
  
  expectedStats.forEach((stat) => {
    cy.get(`[data-testid="stat-${stat.metric.toLowerCase().replace(/\s+/g, '-')}"]`)
      .should('be.visible');
    
    if (stat.display === 'number') {
      cy.get(`[data-testid="stat-${stat.metric.toLowerCase().replace(/\s+/g, '-')}"] .stat-value`)
        .should('match', /^\d+$/);
    } else if (stat.display === 'date') {
      cy.get(`[data-testid="stat-${stat.metric.toLowerCase().replace(/\s+/g, '-')}"] .stat-value`)
        .should('not.be.empty');
    }
  });
});

Then('I should see my connection status section', () => {
  cy.get('[data-testid="connections-section"]').should('be.visible');
});

Then('I should see quick action buttons', () => {
  cy.get('[data-testid="quick-actions"]').should('be.visible');
  cy.get('[data-testid="quick-actions"] button').should('have.length.at.least', 1);
});

// User status information steps
When('the dashboard loads my user status', () => {
  // Make a real API call to get user status
  cy.window().then((window) => {
    const token = window.localStorage.getItem('authToken');
    if (token) {
      cy.request({
        method: 'GET',
        url: '/api/user/status',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        failOnStatusCode: false
      }).then((response) => {
        cy.wrap(response).as('userStatusResponse');
      });
    }
  });
});

Then('I should see my profile information:', (dataTable) => {
  const expectedFields = dataTable.hashes();
  
  expectedFields.forEach((field) => {
    cy.get(`[data-testid="profile-${field.field}"]`)
      .should('be.visible');
    
    if (field.type === 'string') {
      cy.get(`[data-testid="profile-${field.field}"]`)
        .should('not.be.empty');
    } else if (field.type === 'date') {
      cy.get(`[data-testid="profile-${field.field}"]`)
        .should('match', /\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}/);
    }
  });
});

Then('my email verification status should be displayed', () => {
  cy.get('[data-testid="email-verification-status"]')
    .should('be.visible')
    .and('contain.oneOf', ['Verified', 'Not Verified', 'Pending']);
});

Then('my last login time should be shown', () => {
  cy.get('[data-testid="last-login-time"]')
    .should('be.visible')
    .and('not.be.empty');
});

// Connection status steps
When('I view the connections section', () => {
  cy.get('[data-testid="connections-section"]').scrollIntoView();
});

Then('I should see the Google connection status', () => {
  cy.get('[data-testid="google-connection-status"]').should('be.visible');
});

Then('if not connected, I should see a {string} button', (buttonText) => {
  cy.get('[data-testid="google-connection-status"]').then(($status) => {
    if ($status.text().includes('Not Connected') || $status.text().includes('Disconnected')) {
      cy.get(`[data-testid="connect-google-button"]`)
        .should('be.visible')
        .and('contain', buttonText);
    }
  });
});

Then('if connected, I should see connection details:', (dataTable) => {
  const expectedDetails = dataTable.hashes();
  
  cy.get('[data-testid="google-connection-status"]').then(($status) => {
    if ($status.text().includes('Connected')) {
      expectedDetails.forEach((detail) => {
        cy.get(`[data-testid="connection-${detail.detail}"]`)
          .should('be.visible');
      });
    }
  });
});

// Quick actions steps
When('I view the quick actions section', () => {
  cy.get('[data-testid="quick-actions"]').scrollIntoView();
});

Then('I should see relevant action buttons based on my account status', () => {
  cy.get('[data-testid="quick-actions"] button').should('have.length.at.least', 1);
});

Then('if Google is not connected, I should see {string}', (buttonText) => {
  cy.get('[data-testid="google-connection-status"]').then(($status) => {
    if ($status.text().includes('Not Connected')) {
      cy.get('[data-testid="quick-actions"]')
        .should('contain', buttonText);
    }
  });
});

Then('if Google is connected, I should see {string}', (buttonText) => {
  cy.get('[data-testid="google-connection-status"]').then(($status) => {
    if ($status.text().includes('Connected')) {
      cy.get('[data-testid="quick-actions"]')
        .should('contain', buttonText);
    }
  });
});

Then('all action buttons should be clickable and functional', () => {
  cy.get('[data-testid="quick-actions"] button').each(($button) => {
    cy.wrap($button).should('not.be.disabled');
  });
});

// Loading states steps
When('the dashboard is loading data', () => {
  cy.intercept('GET', '/api/dashboard', { delay: 1000 }).as('getDashboard');
  cy.reload();
});

Then('I should see appropriate loading indicators', () => {
  cy.get('[data-testid="loading-spinner"]', { timeout: 1000 }).should('be.visible');
});

Then('if data fails to load, I should see user-friendly error messages', () => {
  cy.intercept('GET', '/api/dashboard', { statusCode: 500 }).as('getDashboardError');
  cy.reload();
  cy.wait('@getDashboardError');
  
  cy.get('[data-testid="error-message"]')
    .should('be.visible')
    .and('not.contain', 'Internal Server Error')
    .and('not.contain', '500');
});

Then('I should have options to retry loading failed data', () => {
  cy.get('[data-testid="retry-button"]').should('be.visible');
});

// Responsive design steps
When('I view the dashboard on different screen sizes:', (dataTable) => {
  const screenSizes = dataTable.hashes();
  
  screenSizes.forEach((size) => {
    cy.viewport(parseInt(size.width), parseInt(size.height));
    cy.get('[data-testid="dashboard-container"]').should('be.visible');
  });
});

Then('the dashboard should be properly responsive', () => {
  // Test mobile viewport
  cy.viewport(375, 667);
  cy.get('[data-testid="dashboard-container"]').should('be.visible');
  
  // Test tablet viewport
  cy.viewport(768, 1024);
  cy.get('[data-testid="dashboard-container"]').should('be.visible');
  
  // Test desktop viewport
  cy.viewport(1280, 720);
  cy.get('[data-testid="dashboard-container"]').should('be.visible');
});

Then('all elements should be accessible and usable', () => {
  cy.get('[data-testid="dashboard-container"] button').each(($button) => {
    cy.wrap($button).should('be.visible');
  });
});

Then('the layout should adapt appropriately', () => {
  // Mobile layout checks
  cy.viewport(375, 667);
  cy.get('[data-testid="mobile-menu"]').should('be.visible');
  
  // Desktop layout checks
  cy.viewport(1280, 720);
  cy.get('[data-testid="desktop-sidebar"]').should('be.visible');
});

// API integration steps
When('I access the dashboard', () => {
  cy.intercept('GET', '/api/dashboard').as('getDashboard');
  cy.intercept('GET', '/api/user/status').as('getUserStatus');
  cy.visit('/dashboard');
});

Then('the dashboard should make API calls to:', (dataTable) => {
  const expectedCalls = dataTable.hashes();
  
  expectedCalls.forEach((call) => {
    cy.wait(`@${call.endpoint.replace('/api/', '').replace('/', '')}`);
  });
});

Then('all API calls should include proper authentication headers', () => {
  cy.get('@getDashboard').should((interception) => {
    expect(interception.request.headers).to.have.property('authorization');
    expect(interception.request.headers.authorization).to.match(/^Bearer /);
  });
});

Then('the dashboard should handle API responses correctly', () => {
  cy.get('[data-testid="dashboard-container"]').should('be.visible');
  cy.get('[data-testid="error-message"]').should('not.exist');
});
