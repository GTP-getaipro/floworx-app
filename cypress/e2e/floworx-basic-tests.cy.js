describe('FloworX Basic Functionality Tests', () => {
  const baseUrl = 'https://app.floworx-iq.com';

  beforeEach(() => {
    // Set up common configurations
    cy.viewport(1280, 720);
  });

  describe('Application Health & Accessibility', () => {
    it('should load the homepage successfully', () => {
      cy.visit('/');
      cy.url().should('include', 'app.floworx-iq.com');
      
      // Check that the page loads without errors
      cy.get('body').should('be.visible');
      
      // Check for basic page structure
      cy.get('html').should('have.attr', 'lang');
      cy.title().should('not.be.empty');
    });

    it('should have working API health endpoints', () => {
      // Test health endpoint
      cy.request('GET', '/api/health').then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('status', 'healthy');
        expect(response.body).to.have.property('database');
        expect(response.body.database).to.have.property('connected', true);
      });

      // Test database health endpoint
      cy.request('GET', '/api/health/db').then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('database', 'connected');
        expect(response.body).to.have.property('status', 'healthy');
      });

      // Test API status endpoint
      cy.request('GET', '/api/api/status').then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('api', 'online');
        expect(response.body).to.have.property('version');
      });
    });
  });

  describe('CORS Configuration', () => {
    it('should have proper CORS headers', () => {
      cy.request({
        method: 'OPTIONS',
        url: '/api/user/status',
        headers: {
          'Origin': baseUrl,
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Content-Type, Authorization'
        }
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.headers).to.have.property('access-control-allow-origin');
        expect(response.headers).to.have.property('access-control-allow-methods');
        expect(response.headers).to.have.property('access-control-allow-headers');
        expect(response.headers).to.have.property('access-control-allow-credentials', 'true');
      });
    });
  });

  describe('Authentication Endpoints', () => {
    it('should handle login endpoint correctly', () => {
      cy.request({
        method: 'POST',
        url: '/api/auth/login',
        body: {
          email: 'test@example.com',
          password: 'invalidpassword'
        },
        failOnStatusCode: false
      }).then((response) => {
        // Should return 401 for invalid credentials
        expect(response.status).to.eq(401);
        expect(response.body).to.have.property('error');
      });
    });

    it('should handle registration endpoint', () => {
      const uniqueEmail = `cypress-test-${Date.now()}@example.com`;
      
      cy.request({
        method: 'POST',
        url: '/api/auth/register',
        body: {
          firstName: 'Cypress',
          lastName: 'Test',
          email: uniqueEmail,
          password: 'CypressTest123!',
          agreeToTerms: true
        },
        failOnStatusCode: false
      }).then((response) => {
        // Should return 201 for successful registration or 409 if email exists
        expect([201, 409]).to.include(response.status);
      });
    });

    it('should handle logout endpoint', () => {
      cy.request('POST', '/api/auth/logout').then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('message');
      });
    });
  });

  describe('Protected Endpoints', () => {
    const protectedEndpoints = [
      '/api/user/status',
      '/api/user/profile',
      '/api/onboarding/status',
      '/api/dashboard',
      '/api/analytics',
      '/api/workflows'
    ];

    protectedEndpoints.forEach((endpoint) => {
      it(`should require authentication for ${endpoint}`, () => {
        cy.request({
          method: 'GET',
          url: endpoint,
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(401);
          expect(response.body).to.have.property('error');
        });
      });
    });
  });

  describe('Analytics Endpoints', () => {
    it('should handle analytics tracking', () => {
      cy.request({
        method: 'POST',
        url: '/api/analytics/onboarding/started',
        body: {
          timestamp: new Date().toISOString(),
          source: 'cypress-test'
        }
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('success', true);
      });

      cy.request({
        method: 'POST',
        url: '/api/analytics/user/track',
        body: {
          action: 'cypress_test_action',
          timestamp: new Date().toISOString()
        }
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('success', true);
      });
    });
  });

  describe('OAuth Endpoints', () => {
    it('should handle OAuth initiation', () => {
      cy.request({
        method: 'GET',
        url: '/api/oauth/google',
        followRedirect: false,
        failOnStatusCode: false
      }).then((response) => {
        // Should redirect (302) or return success (200)
        expect([200, 302]).to.include(response.status);
      });
    });

    it('should handle OAuth callback with query parameters', () => {
      cy.request({
        method: 'GET',
        url: '/api/oauth/google/callback?code=test123&state=abc456',
        failOnStatusCode: false
      }).then((response) => {
        // Should return 400 for invalid test data (not 404)
        expect(response.status).to.eq(400);
        expect(response.body).to.have.property('error');
      });
    });
  });

  describe('Support & Recovery Endpoints', () => {
    it('should handle support contact form', () => {
      cy.request({
        method: 'POST',
        url: '/api/support/contact',
        body: {
          name: 'Cypress Test',
          email: 'cypress@example.com',
          subject: 'Test Support Request',
          message: 'This is a test message from Cypress.'
        }
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('success', true);
        expect(response.body).to.have.property('ticketId');
      });
    });

    it('should handle session recovery', () => {
      cy.request({
        method: 'GET',
        url: '/api/recovery/session',
        failOnStatusCode: false
      }).then((response) => {
        // Should return 404 when no session exists (correct behavior)
        expect(response.status).to.eq(404);
        expect(response.body).to.have.property('success', false);
      });
    });
  });

  describe('Frontend Application', () => {
    it('should load the application successfully', () => {
      cy.visit('/');

      // Check that the page loads (even if it shows the JS requirement message)
      cy.get('body').should('be.visible');
      cy.get('html').should('have.attr', 'lang');

      // The app should at least load the basic HTML structure
      cy.get('head').should('exist');
      cy.get('title').should('exist');

      // Check that we're on the correct domain
      cy.url().should('include', 'app.floworx-iq.com');
    });

    it('should be responsive', () => {
      // Test desktop view
      cy.viewport(1280, 720);
      cy.visit('/');
      cy.get('body').should('be.visible');

      // Test tablet view
      cy.viewport(768, 1024);
      cy.get('body').should('be.visible');

      // Test mobile view
      cy.viewport(375, 667);
      cy.get('body').should('be.visible');
    });

    it('should have proper meta tags', () => {
      cy.visit('/');
      
      // Check for essential meta tags
      cy.get('head meta[name="viewport"]').should('exist');
      cy.get('head meta[charset]').should('exist');
      cy.title().should('not.be.empty');
    });
  });

  describe('Performance & Security', () => {
    it('should load within acceptable time', () => {
      const startTime = Date.now();
      
      cy.visit('/').then(() => {
        const loadTime = Date.now() - startTime;
        expect(loadTime).to.be.lessThan(10000); // 10 seconds max
      });
    });

    it('should have security headers', () => {
      cy.request('/api/health').then((response) => {
        // Check for basic security considerations
        expect(response.headers).to.have.property('access-control-allow-origin');
      });
    });
  });
});
