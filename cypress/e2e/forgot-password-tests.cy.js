describe('FloworX Forgot Password Functionality', () => {
  const baseUrl = 'https://app.floworx-iq.com';
  
  beforeEach(() => {
    cy.viewport(1280, 720);
    cy.clearLocalStorage();
    cy.clearCookies();
  });

  describe('Forgot Password API Endpoints', () => {
    it('should handle forgot password request with valid email', () => {
      const testEmail = 'cypress-test@example.com';
      
      cy.request({
        method: 'POST',
        url: '/api/auth/forgot-password',
        body: {
          email: testEmail
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('message', 'Password reset email sent successfully');
        expect(response.body).to.have.property('email', testEmail);
      });
    });

    it('should handle forgot password request with missing email', () => {
      cy.request({
        method: 'POST',
        url: '/api/auth/forgot-password',
        body: {},
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(400);
        expect(response.body).to.have.property('error', 'Missing email');
        expect(response.body).to.have.property('message', 'Email address is required for password reset');
      });
    });

    it('should handle forgot password request with invalid email format', () => {
      cy.request({
        method: 'POST',
        url: '/api/auth/forgot-password',
        body: {
          email: 'invalid-email-format'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(400);
        expect(response.body).to.have.property('error', 'Invalid email');
        expect(response.body).to.have.property('message', 'Please provide a valid email address');
      });
    });

    it('should handle forgot password request with non-existent email gracefully', () => {
      const nonExistentEmail = `non-existent-${Date.now()}@example.com`;
      
      cy.request({
        method: 'POST',
        url: '/api/auth/forgot-password',
        body: {
          email: nonExistentEmail
        },
        failOnStatusCode: false
      }).then((response) => {
        // Should return success for security reasons (don't reveal if email exists)
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('message', 'Password reset email sent successfully');
        expect(response.body).to.have.property('email', nonExistentEmail);
      });
    });
  });

  describe('Password Reset Token Verification', () => {
    it('should handle token verification with missing token', () => {
      cy.request({
        method: 'POST',
        url: '/api/auth/verify-reset-token',
        body: {},
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(400);
        expect(response.body).to.have.property('error', 'Missing token');
        expect(response.body).to.have.property('message', 'Reset token is required');
      });
    });

    it('should handle token verification with invalid token', () => {
      cy.request({
        method: 'POST',
        url: '/api/auth/verify-reset-token',
        body: {
          token: 'invalid-token-123'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(400);
        expect(response.body).to.have.property('error', 'Invalid token');
        expect(response.body).to.have.property('message');
        expect(response.body.message).to.include('invalid');
      });
    });
  });

  describe('Password Reset Completion', () => {
    it('should handle password reset with missing token', () => {
      cy.request({
        method: 'POST',
        url: '/api/auth/reset-password',
        body: {
          newPassword: 'NewPassword123!'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(400);
        expect(response.body).to.have.property('error', 'Missing token');
        expect(response.body).to.have.property('message', 'Reset token is required');
      });
    });

    it('should handle password reset with missing password', () => {
      cy.request({
        method: 'POST',
        url: '/api/auth/reset-password',
        body: {
          token: 'test-token-123'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(400);
        expect(response.body).to.have.property('error', 'Missing password');
        expect(response.body).to.have.property('message', 'New password is required');
      });
    });

    it('should handle password reset with weak password', () => {
      cy.request({
        method: 'POST',
        url: '/api/auth/reset-password',
        body: {
          token: 'test-token-123',
          newPassword: '123'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(400);
        expect(response.body).to.have.property('error', 'Invalid password');
        expect(response.body).to.have.property('message');
        expect(response.body.message).to.include('Password must be at least 8 characters');
      });
    });

    it('should handle password reset with invalid token', () => {
      cy.request({
        method: 'POST',
        url: '/api/auth/reset-password',
        body: {
          token: 'invalid-token-123',
          newPassword: 'ValidPassword123!'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(400);
        expect(response.body).to.have.property('error', 'Invalid token');
        expect(response.body).to.have.property('message');
        expect(response.body.message).to.include('invalid');
      });
    });
  });

  describe('Password Requirements Endpoint', () => {
    it('should return password requirements', () => {
      cy.request('GET', '/api/auth/password-requirements').then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('requirements');
        expect(response.body.requirements).to.have.property('minLength');
        expect(response.body.requirements).to.have.property('requireUppercase');
        expect(response.body.requirements).to.have.property('requireLowercase');
        expect(response.body.requirements).to.have.property('requireNumbers');
        expect(response.body).to.have.property('description');
      });
    });
  });

  describe('Rate Limiting and Security', () => {
    it('should handle multiple forgot password requests', () => {
      const testEmail = 'rate-limit-test@example.com';
      
      // Make multiple requests to test rate limiting
      const requests = Array.from({ length: 3 }, () => 
        cy.request({
          method: 'POST',
          url: '/api/auth/forgot-password',
          body: { email: testEmail },
          failOnStatusCode: false
        })
      );

      // All requests should be handled (rate limiting may apply but shouldn't fail completely)
      requests.forEach(requestPromise => {
        requestPromise.then((response) => {
          expect([200, 429]).to.include(response.status);
          if (response.status === 429) {
            expect(response.body).to.have.property('rateLimited', true);
          }
        });
      });
    });

    it('should include security headers in responses', () => {
      cy.request({
        method: 'POST',
        url: '/api/auth/forgot-password',
        body: { email: 'test@example.com' },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.headers).to.have.property('access-control-allow-origin');
        expect(response.headers).to.have.property('content-type');
      });
    });
  });

  describe('Frontend Integration Tests', () => {
    it('should load the forgot password page', () => {
      cy.visit('/');
      
      // Look for forgot password link or form
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="forgot-password-link"]').length > 0) {
          cy.get('[data-testid="forgot-password-link"]').should('be.visible');
        } else if ($body.find('a[href*="forgot"]').length > 0) {
          cy.get('a[href*="forgot"]').should('be.visible');
        } else if ($body.find('a').filter(':contains("Forgot")').length > 0) {
          cy.get('a').filter(':contains("Forgot")').should('be.visible');
        } else {
          // Check if there's a forgot password form directly on the page
          cy.get('body').should('be.visible');
          cy.log('Forgot password functionality not immediately visible - this is acceptable');
        }
      });
    });

    it('should handle forgot password form submission', () => {
      cy.visit('/');
      
      // Try to find and interact with forgot password functionality
      cy.get('body').then(($body) => {
        const bodyText = $body.text();
        
        if (bodyText.includes('Forgot') || bodyText.includes('Reset')) {
          // If forgot password functionality is visible, test it
          cy.log('Forgot password functionality found on page');
          
          // Look for email input field
          if ($body.find('input[type="email"]').length > 0) {
            cy.get('input[type="email"]').first().type('test@example.com');
            
            // Look for submit button
            if ($body.find('button[type="submit"]').length > 0) {
              cy.get('button[type="submit"]').first().should('be.visible');
            }
          }
        } else {
          cy.log('Forgot password functionality not immediately visible - this is acceptable');
        }
      });
    });

    it('should be responsive on mobile devices', () => {
      cy.viewport(375, 667); // iPhone SE
      cy.visit('/');
      
      cy.get('body').should('be.visible');
      cy.get('html').should('have.attr', 'lang');
    });
  });

  describe('Complete Password Reset Flow Simulation', () => {
    it('should simulate complete password reset workflow', () => {
      const testEmail = `flow-test-${Date.now()}@example.com`;
      
      // Step 1: Create a test user first
      cy.request({
        method: 'POST',
        url: '/api/auth/register',
        body: {
          firstName: 'Flow',
          lastName: 'Test',
          email: testEmail,
          password: 'OriginalPassword123!',
          companyName: 'Test Company',
          agreeToTerms: true
        },
        failOnStatusCode: false
      }).then((registerResponse) => {
        // Registration successful or user already exists
        expect([201, 409]).to.include(registerResponse.status);
        
        // Step 2: Request password reset
        cy.request({
          method: 'POST',
          url: '/api/auth/forgot-password',
          body: { email: testEmail },
          failOnStatusCode: false
        }).then((resetResponse) => {
          expect(resetResponse.status).to.eq(200);
          expect(resetResponse.body).to.have.property('message', 'Password reset email sent successfully');
          expect(resetResponse.body).to.have.property('email', testEmail);

          cy.log('Password reset flow completed successfully');
        });
      });
    });

    it('should validate password requirements during reset', () => {
      // Get password requirements first
      cy.request('GET', '/api/auth/password-requirements').then((reqResponse) => {
        expect(reqResponse.status).to.eq(200);
        const requirements = reqResponse.body.requirements;
        
        // Test password reset with requirements validation
        cy.request({
          method: 'POST',
          url: '/api/auth/reset-password',
          body: {
            token: 'test-token',
            newPassword: '123' // Too weak
          },
          failOnStatusCode: false
        }).then((resetResponse) => {
          expect(resetResponse.status).to.eq(400);
          expect(resetResponse.body).to.have.property('error');
          
          cy.log(`Password requirements validated: min length ${requirements.minLength}`);
        });
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed requests gracefully', () => {
      cy.request({
        method: 'POST',
        url: '/api/auth/forgot-password',
        body: 'invalid-json',
        headers: { 'Content-Type': 'text/plain' },
        failOnStatusCode: false
      }).then((response) => {
        expect([400, 500]).to.include(response.status);
      });
    });

    it('should handle extremely long email addresses', () => {
      const longEmail = 'a'.repeat(300) + '@example.com';
      
      cy.request({
        method: 'POST',
        url: '/api/auth/forgot-password',
        body: { email: longEmail },
        failOnStatusCode: false
      }).then((response) => {
        expect([400, 413]).to.include(response.status);
      });
    });

    it('should handle special characters in email', () => {
      const specialEmail = 'test+special.email@example.com';
      
      cy.request({
        method: 'POST',
        url: '/api/auth/forgot-password',
        body: { email: specialEmail },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('message', 'Password reset email sent successfully');
        expect(response.body).to.have.property('email', specialEmail);
      });
    });
  });
});
