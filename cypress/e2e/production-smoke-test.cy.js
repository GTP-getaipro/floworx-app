describe('Floworx Production Smoke Tests', () => {
  beforeEach(() => {
    // Visit the production application
    cy.visit('/')
  })

  it('should load the homepage successfully', () => {
    // Check that the page loads
    cy.url().should('include', 'app.floworx-iq.com')
    
    // Check for basic page elements
    cy.get('body').should('be.visible')
    
    // Check that we can access the API health endpoint
    cy.request('GET', '/api/health').then((response) => {
      expect(response.status).to.eq(200)
      expect(response.body).to.have.property('status', 'healthy')
    })
  })

  it('should have working API endpoints', () => {
    // Test health endpoint
    cy.request('GET', '/api/health').then((response) => {
      expect(response.status).to.eq(200)
      expect(response.body.status).to.eq('healthy')
    })

    // Test database health endpoint
    cy.request('GET', '/api/health/db').then((response) => {
      expect(response.status).to.eq(200)
      expect(response.body.database).to.eq('connected')
    })

    // Test password requirements endpoint
    cy.request('GET', '/api/auth/password-requirements').then((response) => {
      expect(response.status).to.eq(200)
      expect(response.body).to.have.property('requirements')
    })
  })

  it('should handle user registration API', () => {
    const testEmail = `cypress-test-${Date.now()}@example.com`
    
    cy.request({
      method: 'POST',
      url: '/api/auth/register',
      body: {
        email: testEmail,
        password: 'CypressTest123!',
        firstName: 'Cypress',
        lastName: 'Test',
        businessName: 'Cypress Test Company',
        agreeToTerms: true
      }
    }).then((response) => {
      expect(response.status).to.eq(201)
      expect(response.body).to.have.property('message', 'User registered successfully')
      expect(response.body).to.have.property('token')
      expect(response.body.user).to.have.property('email', testEmail)
    })
  })

  it('should handle authentication flow', () => {
    const testEmail = `cypress-auth-${Date.now()}@example.com`
    const testPassword = 'CypressTest123!'
    
    // First register a user
    cy.request({
      method: 'POST',
      url: '/api/auth/register',
      body: {
        email: testEmail,
        password: testPassword,
        firstName: 'Cypress',
        lastName: 'Auth',
        businessName: 'Cypress Auth Company',
        agreeToTerms: true
      }
    }).then((registerResponse) => {
      expect(registerResponse.status).to.eq(201)
      const token = registerResponse.body.token
      
      // Test token verification
      cy.request({
        method: 'GET',
        url: '/api/auth/verify',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }).then((verifyResponse) => {
        expect(verifyResponse.status).to.eq(200)
        expect(verifyResponse.body.message).to.eq('Token is valid')
      })

      // Test user status endpoint
      cy.request({
        method: 'GET',
        url: '/api/user/status',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }).then((statusResponse) => {
        expect(statusResponse.status).to.eq(200)
        expect(statusResponse.body).to.have.property('email', testEmail)
      })

      // Test dashboard endpoint
      cy.request({
        method: 'GET',
        url: '/api/dashboard',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }).then((dashboardResponse) => {
        expect(dashboardResponse.status).to.eq(200)
        expect(dashboardResponse.body).to.have.property('user')
        expect(dashboardResponse.body).to.have.property('stats')
      })

      // Test user profile endpoint
      cy.request({
        method: 'GET',
        url: '/api/user/profile',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }).then((profileResponse) => {
        expect(profileResponse.status).to.eq(200)
        expect(profileResponse.body).to.have.property('email', testEmail)
      })
    })
  })

  it('should test all API endpoints coverage', () => {
    const testEmail = `cypress-coverage-${Date.now()}@example.com`
    
    // Register and get token
    cy.request({
      method: 'POST',
      url: '/api/auth/register',
      body: {
        email: testEmail,
        password: 'CypressTest123!',
        firstName: 'Coverage',
        lastName: 'Test',
        businessName: 'Coverage Test Company',
        agreeToTerms: true
      }
    }).then((response) => {
      const token = response.body.token
      
      // Test all authenticated endpoints
      const endpoints = [
        '/api/user/status',
        '/api/dashboard',
        '/api/user/profile',
        '/api/workflows',
        '/api/analytics'
      ]
      
      endpoints.forEach(endpoint => {
        cy.request({
          method: 'GET',
          url: endpoint,
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }).then((response) => {
          expect(response.status).to.eq(200)
          cy.log(`✅ ${endpoint}: ${response.status}`)
        })
      })
    })
  })
})
