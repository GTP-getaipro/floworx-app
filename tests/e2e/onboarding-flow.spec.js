// Cypress E2E Tests for Floworx Onboarding Flow with Business Type Selection
// Run with: npx cypress run --spec "tests/e2e/onboarding-flow.spec.js"

describe('Floworx Onboarding Flow - Business Type Selection', () => {
  const testUser = {
    email: `test-${Date.now()}@floworx-e2e.com`,
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User'
  };

  beforeEach(() => {
    // Set up test environment
    cy.task('db:seed'); // Seed test database
    cy.visit('/');
  });

  afterEach(() => {
    // Cleanup test data
    cy.task('db:cleanup', testUser.email);
  });

  describe('Complete User Journey', () => {
    it('OF-001: Complete onboarding flow with business type selection', () => {
      // Step 1: User Registration
      cy.get('[data-cy=register-link]').click();
      cy.get('[data-cy=first-name-input]').type(testUser.firstName);
      cy.get('[data-cy=last-name-input]').type(testUser.lastName);
      cy.get('[data-cy=email-input]').type(testUser.email);
      cy.get('[data-cy=password-input]').type(testUser.password);
      cy.get('[data-cy=register-button]').click();

      // Step 2: Email Verification (simulate)
      cy.task('email:getVerificationToken', testUser.email).then((token) => {
        cy.visit(`/verify-email?token=${token}`);
        cy.get('[data-cy=verification-success]').should('be.visible');
      });

      // Step 3: Login
      cy.get('[data-cy=login-link]').click();
      cy.get('[data-cy=email-input]').type(testUser.email);
      cy.get('[data-cy=password-input]').type(testUser.password);
      cy.get('[data-cy=login-button]').click();

      // Step 4: Onboarding Wizard Starts
      cy.url().should('include', '/onboarding');
      cy.get('[data-cy=onboarding-wizard]').should('be.visible');

      // Step 5: Welcome Step
      cy.get('[data-cy=step-title]').should('contain', 'Welcome to Floworx');
      cy.get('[data-cy=continue-button]').click();

      // Step 6: Google OAuth Connection
      cy.get('[data-cy=step-title]').should('contain', 'Connect Your Gmail');
      cy.get('[data-cy=google-connect-button]').click();
      
      // Mock Google OAuth success
      cy.window().then((win) => {
        win.postMessage({
          type: 'GOOGLE_AUTH_SUCCESS',
          data: {
            access_token: 'mock-access-token',
            refresh_token: 'mock-refresh-token',
            email: testUser.email
          }
        }, '*');
      });

      cy.get('[data-cy=oauth-success]').should('be.visible');
      cy.get('[data-cy=continue-button]').click();

      // Step 7: Business Type Selection (NEW)
      cy.get('[data-cy=step-title]').should('contain', 'Select Your Business Type');
      cy.get('[data-cy=business-type-cards]').should('be.visible');
      
      // Verify Hot Tub & Spa option is available
      cy.get('[data-cy=business-type-card]')
        .contains('Hot Tub & Spa')
        .should('be.visible');
      
      // Check business type features are displayed
      cy.get('[data-cy=business-type-card]')
        .contains('Hot Tub & Spa')
        .within(() => {
          cy.get('[data-cy=category-list]').should('be.visible');
          cy.get('[data-cy=priority-badge]').should('exist');
          cy.contains('Service Calls').should('be.visible');
          cy.contains('Sales Inquiries').should('be.visible');
        });

      // Select Hot Tub & Spa business type
      cy.get('[data-cy=business-type-card]')
        .contains('Hot Tub & Spa')
        .click();

      // Verify selection feedback
      cy.get('[data-cy=business-type-card]')
        .contains('Hot Tub & Spa')
        .should('have.class', 'selected');
      
      cy.get('[data-cy=selection-summary]').should('be.visible');
      cy.get('[data-cy=selection-summary]')
        .should('contain', 'Selected: Hot Tub & Spa');

      // Continue to next step
      cy.get('[data-cy=continue-button]').should('not.be.disabled');
      cy.get('[data-cy=continue-button]').click();

      // Verify API call was made
      cy.wait('@selectBusinessType').then((interception) => {
        expect(interception.request.body).to.have.property('businessTypeId', 1);
      });

      // Step 8: Business Categories (should be pre-populated based on business type)
      cy.get('[data-cy=step-title]').should('contain', 'Email Categories');
      
      // Verify categories are pre-populated from business type selection
      cy.get('[data-cy=category-item]').should('have.length.greaterThan', 0);
      cy.get('[data-cy=category-item]').contains('Service Calls').should('exist');
      cy.get('[data-cy=category-item]').contains('Sales Inquiries').should('exist');
      
      cy.get('[data-cy=continue-button]').click();

      // Step 9: Label Mapping
      cy.get('[data-cy=step-title]').should('contain', 'Gmail Integration');
      cy.get('[data-cy=label-mapping-form]').should('be.visible');
      cy.get('[data-cy=continue-button]').click();

      // Step 10: Team Setup
      cy.get('[data-cy=step-title]').should('contain', 'Team Notifications');
      cy.get('[data-cy=team-member-input]').type('team@floworx-test.com');
      cy.get('[data-cy=add-team-member]').click();
      cy.get('[data-cy=continue-button]').click();

      // Step 11: Review & Deploy
      cy.get('[data-cy=step-title]').should('contain', 'Review & Activate');
      
      // Verify business type is shown in review
      cy.get('[data-cy=review-business-type]')
        .should('contain', 'Hot Tub & Spa');
      
      cy.get('[data-cy=deploy-workflow-button]').click();

      // Step 12: Workflow Deployment
      cy.get('[data-cy=deployment-progress]').should('be.visible');
      cy.get('[data-cy=deployment-status]', { timeout: 30000 })
        .should('contain', 'Deployment Complete');

      // Step 13: Completion
      cy.get('[data-cy=onboarding-complete]').should('be.visible');
      cy.get('[data-cy=dashboard-link]').click();

      // Verify user is redirected to dashboard
      cy.url().should('include', '/dashboard');
    });

    it('OF-002: Business type selection is required before categories', () => {
      // Login and navigate to onboarding
      cy.login(testUser.email, testUser.password);
      cy.visit('/onboarding');

      // Skip to business type step
      cy.get('[data-cy=step-indicator]').contains('Business Type').click();

      // Try to continue without selecting business type
      cy.get('[data-cy=continue-button]').should('be.disabled');

      // Verify error message appears when trying to proceed
      cy.get('[data-cy=continue-button]').click({ force: true });
      cy.get('[data-cy=validation-error]')
        .should('contain', 'Please select your business type');
    });

    it('OF-003: Skip business type if already selected', () => {
      // Pre-select business type for user
      cy.task('db:setUserBusinessType', {
        email: testUser.email,
        businessTypeId: 1
      });

      cy.login(testUser.email, testUser.password);
      cy.visit('/onboarding');

      // Should skip directly to business categories
      cy.get('[data-cy=step-title]').should('contain', 'Email Categories');
      
      // Business type step should be marked as completed
      cy.get('[data-cy=step-indicator]')
        .contains('Business Type')
        .should('have.class', 'completed');
    });
  });

  describe('Business Type Selection Specific Tests', () => {
    beforeEach(() => {
      cy.login(testUser.email, testUser.password);
      cy.visit('/onboarding/business-type');
    });

    it('BTS-E2E-001: Displays all available business types', () => {
      cy.get('[data-cy=business-type-cards]').should('be.visible');
      cy.get('[data-cy=business-type-card]').should('have.length.greaterThan', 0);
      
      // Verify Hot Tub & Spa is available
      cy.get('[data-cy=business-type-card]')
        .contains('Hot Tub & Spa')
        .should('be.visible');
    });

    it('BTS-E2E-002: Shows business type details and categories', () => {
      cy.get('[data-cy=business-type-card]')
        .contains('Hot Tub & Spa')
        .within(() => {
          // Check description
          cy.get('[data-cy=business-type-description]')
            .should('contain', 'Email automation for hot tub dealers');
          
          // Check categories
          cy.get('[data-cy=category-list]').should('be.visible');
          cy.get('[data-cy=category-item]').should('have.length.greaterThan', 0);
          
          // Check priority badges
          cy.get('[data-cy=priority-badge]').should('exist');
        });
    });

    it('BTS-E2E-003: Selection persistence across page refresh', () => {
      // Select business type
      cy.get('[data-cy=business-type-card]')
        .contains('Hot Tub & Spa')
        .click();

      // Verify selection
      cy.get('[data-cy=business-type-card]')
        .contains('Hot Tub & Spa')
        .should('have.class', 'selected');

      // Refresh page
      cy.reload();

      // Verify selection is maintained
      cy.get('[data-cy=business-type-card]')
        .contains('Hot Tub & Spa')
        .should('have.class', 'selected');
    });

    it('BTS-E2E-004: Error handling for API failures', () => {
      // Mock API failure
      cy.intercept('GET', '/api/business-types', {
        statusCode: 500,
        body: { error: 'Internal server error' }
      }).as('getBusinessTypesError');

      cy.reload();

      cy.wait('@getBusinessTypesError');
      
      // Verify error state
      cy.get('[data-cy=error-message]').should('be.visible');
      cy.get('[data-cy=retry-button]').should('be.visible');

      // Test retry functionality
      cy.intercept('GET', '/api/business-types', {
        fixture: 'business-types.json'
      }).as('getBusinessTypesRetry');

      cy.get('[data-cy=retry-button]').click();
      cy.wait('@getBusinessTypesRetry');

      cy.get('[data-cy=business-type-cards]').should('be.visible');
    });
  });

  describe('Workflow Deployment Integration', () => {
    it('WD-001: Workflow template selected based on business type', () => {
      cy.completeOnboardingToReview(testUser, 'Hot Tub & Spa');

      // Intercept workflow deployment API
      cy.intercept('POST', '/api/workflows/deploy', (req) => {
        expect(req.body.config).to.have.property('businessType');
        expect(req.body.config.businessType.slug).to.equal('hot-tub-spa');
      }).as('deployWorkflow');

      cy.get('[data-cy=deploy-workflow-button]').click();
      cy.wait('@deployWorkflow');

      // Verify deployment uses correct template
      cy.get('[data-cy=deployment-log]')
        .should('contain', 'Hot Tub Email Automation');
    });

    it('WD-002: Template customization with user-specific data', () => {
      cy.completeOnboardingToReview(testUser, 'Hot Tub & Spa');

      cy.intercept('POST', '/api/workflows/deploy').as('deployWorkflow');

      cy.get('[data-cy=deploy-workflow-button]').click();
      cy.wait('@deployWorkflow').then((interception) => {
        const config = interception.request.body.config;
        
        // Verify business type context
        expect(config.businessType).to.exist;
        expect(config.businessType.slug).to.equal('hot-tub-spa');
        
        // Verify user-specific customization
        expect(config.businessCategories).to.be.an('array');
        expect(config.teamMembers).to.be.an('array');
      });
    });
  });

  describe('Performance Tests', () => {
    it('PERF-001: Business type selection loads within performance budget', () => {
      cy.login(testUser.email, testUser.password);
      
      const startTime = Date.now();
      cy.visit('/onboarding/business-type');
      
      cy.get('[data-cy=business-type-cards]').should('be.visible').then(() => {
        const loadTime = Date.now() - startTime;
        expect(loadTime).to.be.lessThan(2000); // Should load within 2 seconds
      });
    });

    it('PERF-002: Business type selection API response time', () => {
      cy.intercept('GET', '/api/business-types', (req) => {
        req.reply((res) => {
          expect(res.delay).to.be.lessThan(500); // API should respond within 500ms
        });
      }).as('getBusinessTypes');

      cy.visit('/onboarding/business-type');
      cy.wait('@getBusinessTypes');
    });
  });

  describe('Accessibility Tests', () => {
    it('A11Y-001: Business type selection is keyboard navigable', () => {
      cy.visit('/onboarding/business-type');
      cy.get('[data-cy=business-type-cards]').should('be.visible');

      // Test keyboard navigation
      cy.get('body').tab();
      cy.focused().should('have.attr', 'data-cy', 'business-type-card');

      // Test Enter key selection
      cy.focused().type('{enter}');
      cy.focused().should('have.class', 'selected');
    });

    it('A11Y-002: Screen reader accessibility', () => {
      cy.visit('/onboarding/business-type');
      
      // Check ARIA labels
      cy.get('[data-cy=business-type-card]').each(($card) => {
        cy.wrap($card).should('have.attr', 'aria-label');
        cy.wrap($card).should('have.attr', 'role', 'button');
      });

      // Check heading structure
      cy.get('h1, h2, h3').should('exist');
      cy.get('[data-cy=step-title]').should('have.attr', 'role', 'heading');
    });
  });
});

// Custom Cypress commands for test helpers
Cypress.Commands.add('login', (email, password) => {
  cy.request({
    method: 'POST',
    url: '/api/auth/login',
    body: { email, password }
  }).then((response) => {
    window.localStorage.setItem('token', response.body.token);
  });
});

Cypress.Commands.add('completeOnboardingToReview', (user, businessType) => {
  cy.login(user.email, user.password);
  cy.visit('/onboarding');
  
  // Complete all steps up to review
  cy.get('[data-cy=continue-button]').click(); // Welcome
  cy.get('[data-cy=google-connect-button]').click(); // OAuth
  cy.get('[data-cy=business-type-card]').contains(businessType).click(); // Business Type
  cy.get('[data-cy=continue-button]').click();
  cy.get('[data-cy=continue-button]').click(); // Categories
  cy.get('[data-cy=continue-button]').click(); // Label Mapping
  cy.get('[data-cy=continue-button]').click(); // Team Setup
  
  // Should now be at review step
  cy.get('[data-cy=step-title]').should('contain', 'Review');
});
