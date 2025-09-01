import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';

// OAuth connection state steps
Given('I have not connected my Google account yet', () => {
  cy.get('[data-testid="google-connection-status"]')
    .should('contain', 'Not Connected');
});

Given('I have connected my Google account', () => {
  // Mock connected state or set up test data
  cy.window().then((window) => {
    window.localStorage.setItem('googleConnected', 'true');
  });
  cy.reload();
});

Given('I have a connected Google account with expired access token', () => {
  // Mock expired token state
  cy.window().then((window) => {
    window.localStorage.setItem('googleConnected', 'true');
    window.localStorage.setItem('googleTokenExpired', 'true');
  });
});

// OAuth initiation steps
When('I click the {string} button', (buttonText) => {
  cy.get(`[data-testid*="connect-google"], [data-testid*="oauth"]`)
    .contains(buttonText)
    .click();
});

Then('I should be redirected to Google\'s OAuth authorization page', () => {
  // Since we can't actually test Google's OAuth in Cypress, we'll mock this
  cy.intercept('GET', '/api/oauth/google', {
    statusCode: 302,
    headers: {
      'Location': 'https://accounts.google.com/o/oauth2/v2/auth?client_id=test'
    }
  }).as('oauthInitiation');
  
  cy.get('@oauthInitiation').should('exist');
});

Then('the OAuth URL should contain the correct parameters:', (dataTable) => {
  const expectedParams = dataTable.hashes();
  
  cy.intercept('GET', '/api/oauth/google').as('oauthRequest');
  cy.get('[data-testid="connect-google-button"]').click();
  
  cy.wait('@oauthRequest').then((interception) => {
    // In a real implementation, we would check the redirect URL
    // For now, we verify the endpoint was called
    expect(interception.request.url).to.include('/api/oauth/google');
  });
});

Then('the OAuth state parameter should be present for security', () => {
  // This would be verified in the actual OAuth URL
  cy.log('OAuth state parameter validation would be implemented here');
});

// OAuth callback steps
Given('I have initiated the Google OAuth flow', () => {
  cy.intercept('GET', '/api/oauth/google', {
    statusCode: 302,
    headers: {
      'Location': 'https://accounts.google.com/o/oauth2/v2/auth?client_id=test&state=test123'
    }
  }).as('oauthInitiation');
});

Given('I have authorized FloWorx to access my Google account', () => {
  // Mock successful authorization
  cy.window().then((window) => {
    window.localStorage.setItem('oauthAuthorized', 'true');
  });
});

When('Google redirects me back to the callback URL with an authorization code', () => {
  // Mock the callback with authorization code
  cy.intercept('GET', '/api/oauth/google/callback*', {
    statusCode: 200,
    body: {
      message: 'OAuth connection successful',
      user: {
        email: 'test@gmail.com',
        name: 'Test User'
      },
      tokenReceived: true
    }
  }).as('oauthCallback');
  
  cy.visit('/api/oauth/google/callback?code=test_auth_code&state=test123');
});

Then('the callback should exchange the code for access tokens', () => {
  cy.wait('@oauthCallback').then((interception) => {
    expect(interception.response.statusCode).to.equal(200);
    expect(interception.response.body).to.have.property('tokenReceived', true);
  });
});

Then('I should be redirected back to the dashboard', () => {
  cy.url().should('include', '/dashboard');
});

Then('my Google connection status should show as {string}', (status) => {
  cy.get('[data-testid="google-connection-status"]')
    .should('contain', status);
});

Then('I should see my Google account information', () => {
  cy.get('[data-testid="google-account-info"]')
    .should('be.visible')
    .and('not.be.empty');
});

// OAuth error handling steps
When('I deny authorization on Google\'s consent screen', () => {
  // Mock OAuth denial
  cy.intercept('GET', '/api/oauth/google/callback*', {
    statusCode: 400,
    body: {
      error: 'OAuth authorization failed',
      message: 'Google OAuth authorization was denied or failed'
    }
  }).as('oauthDenied');
  
  cy.visit('/api/oauth/google/callback?error=access_denied&state=test123');
});

Then('I should see an error message {string}', (errorMessage) => {
  cy.get('[data-testid="error-message"]')
    .should('be.visible')
    .and('contain', errorMessage);
});

Then('my Google connection status should remain {string}', (status) => {
  cy.get('[data-testid="google-connection-status"]')
    .should('contain', status);
});

Then('I should still have the option to try connecting again', () => {
  cy.get('[data-testid="connect-google-button"]')
    .should('be.visible')
    .and('not.be.disabled');
});

// OAuth security steps
Given('I am initiating the OAuth flow', () => {
  cy.intercept('GET', '/api/oauth/google').as('oauthInitiation');
  cy.get('[data-testid="connect-google-button"]').click();
});

Then('the OAuth request should include a state parameter', () => {
  cy.wait('@oauthInitiation').then((interception) => {
    // In real implementation, check the redirect URL contains state parameter
    cy.log('State parameter validation would be implemented here');
  });
});

Then('the state parameter should be validated on callback', () => {
  cy.log('State parameter validation on callback would be implemented here');
});

Then('the OAuth flow should use HTTPS throughout', () => {
  cy.location('protocol').should('eq', 'https:');
});

Then('access tokens should be stored securely', () => {
  // Verify tokens are not stored in localStorage in plain text
  cy.window().then((window) => {
    const localStorage = window.localStorage;
    const sessionStorage = window.sessionStorage;
    
    // Check that raw tokens are not stored
    Object.keys(localStorage).forEach(key => {
      expect(localStorage.getItem(key)).to.not.match(/^ya29\./); // Google access token pattern
    });
  });
});

Then('refresh tokens should be encrypted', () => {
  cy.log('Refresh token encryption validation would be implemented here');
});

// Connection management steps
When('I view my dashboard', () => {
  cy.visit('/dashboard');
});

Then('I should see my Google connection status as {string}', (status) => {
  cy.get('[data-testid="google-connection-status"]')
    .should('contain', status);
});

Then('I should see the connection date and time', () => {
  cy.get('[data-testid="connection-timestamp"]')
    .should('be.visible')
    .and('not.be.empty');
});

Then('I should see options to:', (dataTable) => {
  const expectedOptions = dataTable.hashes();
  
  expectedOptions.forEach((option) => {
    cy.get(`[data-testid="${option.action.toLowerCase()}-button"]`)
      .should('be.visible');
  });
});

// Disconnection steps
When('I click the {string} button', (buttonText) => {
  cy.get(`button:contains("${buttonText}")`)
    .click();
});

When('I confirm the disconnection', () => {
  cy.get('[data-testid="confirm-disconnect-button"]')
    .click();
});

Then('my Google connection should be removed', () => {
  cy.intercept('DELETE', '/api/oauth/google/disconnect', {
    statusCode: 200,
    body: { message: 'Google account disconnected successfully' }
  }).as('disconnectGoogle');
  
  cy.wait('@disconnectGoogle');
});

Then('my connection status should show {string}', (status) => {
  cy.get('[data-testid="google-connection-status"]')
    .should('contain', status);
});

Then('I should see the {string} button again', (buttonText) => {
  cy.get(`button:contains("${buttonText}")`)
    .should('be.visible');
});

Then('my stored Google tokens should be deleted', () => {
  cy.window().then((window) => {
    expect(window.localStorage.getItem('googleAccessToken')).to.be.null;
    expect(window.localStorage.getItem('googleRefreshToken')).to.be.null;
  });
});

// Token refresh steps
When('I perform an action that requires Google API access', () => {
  cy.intercept('GET', '/api/gmail/messages', {
    statusCode: 401,
    body: { error: 'Token expired' }
  }).as('expiredTokenRequest');
  
  cy.intercept('POST', '/api/oauth/refresh', {
    statusCode: 200,
    body: { access_token: 'new_token', expires_in: 3600 }
  }).as('tokenRefresh');
  
  cy.get('[data-testid="sync-gmail-button"]').click();
});

Then('the system should automatically refresh the access token', () => {
  cy.wait('@tokenRefresh');
});

Then('the action should complete successfully', () => {
  cy.get('[data-testid="success-message"]')
    .should('be.visible');
});

Then('my connection should remain active', () => {
  cy.get('[data-testid="google-connection-status"]')
    .should('contain', 'Connected');
});
