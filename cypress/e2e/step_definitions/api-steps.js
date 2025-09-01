import { Given, When, Then } from '@badeball/cypress-cucumber-preprocessor';

// API setup steps
Given('the FloWorx API is available at {string}', (baseUrl) => {
  cy.wrap(baseUrl).as('apiBaseUrl');
});

Given('I have valid user registration data:', (dataTable) => {
  const userData = dataTable.hashes()[0];
  cy.wrap(userData).as('registrationData');
});

Given('I have a registered user with email {string} and password {string}', (email, password) => {
  // Mock user creation for testing
  cy.wrap({ email, password }).as('testUser');
});

Given('I am authenticated with a valid JWT token', () => {
  const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItaWQiLCJlbWFpbCI6InRlc3RAZmxvd29yeC5jb20iLCJpYXQiOjE2MzQ1NjcwMDAsImV4cCI6MTYzNDY1MzQwMH0.test-signature';
  cy.wrap(mockToken).as('authToken');
});

Given('I have a valid OAuth authorization code {string}', (authCode) => {
  cy.wrap(authCode).as('oauthCode');
});

Given('I have a valid state parameter {string}', (stateParam) => {
  cy.wrap(stateParam).as('oauthState');
});

// API request steps
When('I make a GET request to {string}', (endpoint) => {
  const perf = cy.measureApiCall(`GET-${endpoint}`);
  
  cy.apiRequest('GET', endpoint).then((response) => {
    cy.wrap(response).as('apiResponse');
    perf.end();
  });
});

When('I make a POST request to {string} with the registration data', (endpoint) => {
  cy.get('@registrationData').then((userData) => {
    const perf = cy.measureApiCall(`POST-${endpoint}`);
    
    cy.apiRequest('POST', endpoint, userData).then((response) => {
      cy.wrap(response).as('apiResponse');
      perf.end();
    });
  });
});

When('I make a POST request to {string} with valid credentials', (endpoint) => {
  cy.get('@testUser').then((user) => {
    const perf = cy.measureApiCall(`POST-${endpoint}`);
    
    cy.apiRequest('POST', endpoint, {
      email: user.email,
      password: user.password
    }).then((response) => {
      cy.wrap(response).as('apiResponse');
      perf.end();
    });
  });
});

When('I make a POST request to {string} with invalid credentials:', (endpoint, dataTable) => {
  const credentials = dataTable.hashes()[0];
  const perf = cy.measureApiCall(`POST-${endpoint}`);
  
  cy.apiRequest('POST', endpoint, credentials).then((response) => {
    cy.wrap(response).as('apiResponse');
    perf.end();
  });
});

When('I make a GET request to {string} with authentication headers', (endpoint) => {
  cy.get('@authToken').then((token) => {
    const perf = cy.measureApiCall(`GET-${endpoint}`);
    
    cy.apiRequest('GET', endpoint, null, {
      'Authorization': `Bearer ${token}`
    }).then((response) => {
      cy.wrap(response).as('apiResponse');
      perf.end();
    });
  });
});

When('I make a GET request to {string} without authentication headers', (endpoint) => {
  const perf = cy.measureApiCall(`GET-${endpoint}`);
  
  cy.apiRequest('GET', endpoint).then((response) => {
    cy.wrap(response).as('apiResponse');
    perf.end();
  });
});

When('I make a GET request to {string} with OAuth parameters:', (endpoint, dataTable) => {
  const params = dataTable.hashes()[0];
  const queryString = Object.entries(params)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
  
  const perf = cy.measureApiCall(`GET-${endpoint}`);
  
  cy.apiRequest('GET', `${endpoint}?${queryString}`).then((response) => {
    cy.wrap(response).as('apiResponse');
    perf.end();
  });
});

When('I make a PUT request to {string} with updated information:', (endpoint, dataTable) => {
  const updateData = dataTable.hashes()[0];
  
  cy.get('@authToken').then((token) => {
    const perf = cy.measureApiCall(`PUT-${endpoint}`);
    
    cy.apiRequest('PUT', endpoint, updateData, {
      'Authorization': `Bearer ${token}`
    }).then((response) => {
      cy.wrap(response).as('apiResponse');
      perf.end();
    });
  });
});

// Response validation steps
Then('the response status should be {int}', (expectedStatus) => {
  cy.get('@apiResponse').should('have.property', 'status', expectedStatus);
});

Then('the response should contain:', (dataTable) => {
  const expectedFields = dataTable.hashes();
  
  cy.get('@apiResponse').then((response) => {
    expectedFields.forEach((field) => {
      if (field.required === 'true') {
        expect(response.body).to.have.property(field.field);
        
        if (field.type === 'string') {
          expect(response.body[field.field]).to.be.a('string');
        } else if (field.type === 'object') {
          expect(response.body[field.field]).to.be.an('object');
        } else if (field.type === 'array') {
          expect(response.body[field.field]).to.be.an('array');
        } else if (field.type === 'boolean') {
          expect(response.body[field.field]).to.be.a('boolean');
        }
      }
    });
  });
});

Then('the status should be {string}', (expectedStatus) => {
  cy.get('@apiResponse').then((response) => {
    expect(response.body.status).to.equal(expectedStatus);
  });
});

Then('the database should be connected', () => {
  cy.get('@apiResponse').then((response) => {
    expect(response.body.database.connected).to.be.true;
  });
});

Then('the token should be a valid JWT', () => {
  cy.get('@apiResponse').then((response) => {
    expect(response.body.token).to.match(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);
  });
});

Then('the user object should contain my registration information', () => {
  cy.get('@apiResponse').then((response) => {
    cy.get('@registrationData').then((userData) => {
      expect(response.body.user.email).to.equal(userData.email);
      expect(response.body.user.firstName).to.equal(userData.firstName);
      expect(response.body.user.lastName).to.equal(userData.lastName);
    });
  });
});

Then('the message should be {string}', (expectedMessage) => {
  cy.get('@apiResponse').then((response) => {
    expect(response.body.message).to.equal(expectedMessage);
  });
});

Then('the error should be {string}', (expectedError) => {
  cy.get('@apiResponse').then((response) => {
    expect(response.body.error).to.equal(expectedError);
  });
});

Then('no token should be provided', () => {
  cy.get('@apiResponse').then((response) => {
    expect(response.body).to.not.have.property('token');
  });
});

// Complex response validation steps
Then('the response should contain user information:', (dataTable) => {
  const expectedFields = dataTable.hashes();
  
  cy.get('@apiResponse').then((response) => {
    expectedFields.forEach((field) => {
      if (field.required === 'true') {
        expect(response.body).to.have.property(field.field);
        
        if (field.type === 'string') {
          expect(response.body[field.field]).to.be.a('string');
        } else if (field.type === 'boolean') {
          expect(response.body[field.field]).to.be.a('boolean');
        } else if (field.type === 'array') {
          expect(response.body[field.field]).to.be.an('array');
        }
      }
    });
  });
});

Then('the response should contain dashboard data:', (dataTable) => {
  const expectedFields = dataTable.hashes();
  
  cy.get('@apiResponse').then((response) => {
    expectedFields.forEach((field) => {
      if (field.required === 'true') {
        expect(response.body).to.have.property(field.field);
        
        if (field.type === 'object') {
          expect(response.body[field.field]).to.be.an('object');
        } else if (field.type === 'array') {
          expect(response.body[field.field]).to.be.an('array');
        }
      }
    });
  });
});

Then('the user object should contain profile information', () => {
  cy.get('@apiResponse').then((response) => {
    expect(response.body.user).to.have.property('id');
    expect(response.body.user).to.have.property('email');
    expect(response.body.user).to.have.property('firstName');
    expect(response.body.user).to.have.property('lastName');
  });
});

Then('the stats should include email and workflow metrics', () => {
  cy.get('@apiResponse').then((response) => {
    expect(response.body.stats).to.have.property('emailsProcessed');
    expect(response.body.stats).to.have.property('workflowsActive');
    expect(response.body.stats).to.have.property('totalAutomations');
  });
});

Then('the connections should include Google OAuth status', () => {
  cy.get('@apiResponse').then((response) => {
    expect(response.body.connections).to.have.property('google');
    expect(response.body.connections.google).to.have.property('connected');
    expect(response.body.connections.google).to.have.property('status');
  });
});

// OAuth validation steps
Then('the response should redirect to Google OAuth', () => {
  cy.get('@apiResponse').then((response) => {
    expect(response.status).to.equal(302);
    expect(response.headers).to.have.property('location');
    expect(response.headers.location).to.include('accounts.google.com');
  });
});

Then('the redirect URL should contain:', (dataTable) => {
  const expectedParams = dataTable.hashes();
  
  cy.get('@apiResponse').then((response) => {
    const redirectUrl = response.headers.location;
    
    expectedParams.forEach((param) => {
      if (param.required === 'true') {
        expect(redirectUrl).to.include(param.parameter);
      }
    });
  });
});

Then('the message should indicate successful OAuth connection', () => {
  cy.get('@apiResponse').then((response) => {
    expect(response.body.message).to.include('OAuth connection successful');
  });
});

// Profile validation steps
Then('the response should contain profile information:', (dataTable) => {
  const expectedFields = dataTable.hashes();
  
  cy.get('@apiResponse').then((response) => {
    expectedFields.forEach((field) => {
      if (field.required === 'true') {
        expect(response.body).to.have.property(field.field);
      }
    });
  });
});

Then('the user object should reflect the updated information', () => {
  cy.get('@apiResponse').then((response) => {
    expect(response.body.user).to.have.property('firstName', 'UpdatedFirstName');
    expect(response.body.user).to.have.property('lastName', 'UpdatedLastName');
    expect(response.body.user).to.have.property('companyName', 'Updated Company');
  });
});

Then('the message should indicate successful update', () => {
  cy.get('@apiResponse').then((response) => {
    expect(response.body.message).to.include('updated successfully');
  });
});

// Security validation steps
Then('the response should include security headers:', (dataTable) => {
  const expectedHeaders = dataTable.hashes();
  
  cy.get('@apiResponse').then((response) => {
    expectedHeaders.forEach((header) => {
      if (header.required === 'true') {
        expect(response.headers).to.have.property(header.header.toLowerCase());
      }
    });
  });
});

Then('all API responses should be served over HTTPS', () => {
  cy.location('protocol').should('eq', 'https:');
});

// Error handling validation steps
Given('I make a request that triggers {string}', (errorScenario) => {
  // Mock different error scenarios
  let endpoint, method, statusCode;
  
  switch (errorScenario) {
    case 'Invalid request data':
      endpoint = '/auth/register';
      method = 'POST';
      statusCode = 400;
      break;
    case 'Unauthorized access':
      endpoint = '/user/status';
      method = 'GET';
      statusCode = 401;
      break;
    case 'Forbidden resource':
      endpoint = '/admin/users';
      method = 'GET';
      statusCode = 403;
      break;
    case 'Resource not found':
      endpoint = '/nonexistent';
      method = 'GET';
      statusCode = 404;
      break;
    case 'Server error':
      endpoint = '/health';
      method = 'GET';
      statusCode = 500;
      break;
  }
  
  cy.intercept(method, `**${endpoint}`, {
    statusCode: statusCode,
    body: {
      error: errorScenario,
      message: `Test error for ${errorScenario}`
    }
  }).as('errorRequest');
  
  cy.apiRequest(method, endpoint).then((response) => {
    cy.wrap(response).as('apiResponse');
  });
});

Then('the response should contain user-friendly error information:', (dataTable) => {
  const expectedFields = dataTable.hashes();
  
  cy.get('@apiResponse').then((response) => {
    expectedFields.forEach((field) => {
      if (field.required === 'true') {
        expect(response.body).to.have.property(field.field);
      }
    });
  });
});

Then('the error message should not expose sensitive system information', () => {
  cy.get('@apiResponse').then((response) => {
    const sensitivePatterns = [
      /database/i,
      /sql/i,
      /internal/i,
      /stack/i,
      /query/i,
      /connection/i,
      /password/i,
      /token/i
    ];
    
    const message = response.body.message || '';
    sensitivePatterns.forEach((pattern) => {
      expect(message).to.not.match(pattern);
    });
  });
});

Then('the error should be appropriate for {string}', (errorScenario) => {
  cy.get('@apiResponse').then((response) => {
    expect(response.body.error).to.include(errorScenario);
  });
});

// Performance validation steps
Given('I am testing API performance', () => {
  cy.log('Starting API performance tests');
});

When('I make requests to critical endpoints:', (dataTable) => {
  const endpoints = dataTable.hashes();
  
  endpoints.forEach((endpoint) => {
    const maxTime = parseInt(endpoint.max_response_time.replace('ms', ''));
    
    const startTime = Date.now();
    cy.apiRequest('GET', endpoint.endpoint).then((response) => {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      expect(responseTime).to.be.lessThan(maxTime);
      cy.log(`${endpoint.endpoint}: ${responseTime}ms (max: ${maxTime}ms)`);
    });
  });
});

Then('all endpoints should respond within their time limits', () => {
  cy.log('All performance requirements met');
});

Then('the API should handle concurrent requests efficiently', () => {
  // Test concurrent requests
  const requests = [];
  for (let i = 0; i < 5; i++) {
    requests.push(cy.apiRequest('GET', '/health'));
  }
  
  Promise.all(requests).then((responses) => {
    responses.forEach((response) => {
      expect(response.status).to.equal(200);
    });
  });
});
