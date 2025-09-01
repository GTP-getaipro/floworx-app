Feature: API Integration Testing
  As a developer
  I want to ensure all API endpoints work correctly
  So that the frontend can communicate properly with the backend

  Background:
    Given the FloWorx API is available at "https://floworx-app.vercel.app/api"

  @smoke @api
  Scenario: API health check endpoint
    When I make a GET request to "/health"
    Then the response status should be 200
    And the response should contain:
      | field       | type   | required |
      | status      | string | true     |
      | timestamp   | string | true     |
      | database    | object | true     |
      | environment | string | true     |
      | version     | string | true     |
    And the status should be "healthy"
    And the database should be connected

  @api @authentication
  Scenario: User registration API endpoint
    Given I have valid user registration data:
      | firstName | lastName | email                    | password       | companyName  |
      | API       | Test     | api.test@floworx.com     | ApiTest123!    | API Company  |
    When I make a POST request to "/auth/register" with the registration data
    Then the response status should be 201
    And the response should contain:
      | field     | type   | required |
      | message   | string | true     |
      | user      | object | true     |
      | token     | string | true     |
      | expiresIn | string | true     |
    And the token should be a valid JWT
    And the user object should contain my registration information

  @api @authentication
  Scenario: User login API endpoint
    Given I have a registered user with email "login.test@floworx.com" and password "LoginTest123!"
    When I make a POST request to "/auth/login" with valid credentials
    Then the response status should be 200
    And the response should contain:
      | field     | type   | required |
      | message   | string | true     |
      | user      | object | true     |
      | token     | string | true     |
      | expiresIn | string | true     |
    And the token should be a valid JWT
    And the message should be "Login successful"

  @api @authentication @error-handling
  Scenario: Login with invalid credentials
    When I make a POST request to "/auth/login" with invalid credentials:
      | email                     | password      |
      | nonexistent@floworx.com   | WrongPass123! |
    Then the response status should be 401
    And the response should contain:
      | field   | type   | required |
      | error   | string | true     |
      | message | string | true     |
    And the error should be "Invalid credentials"
    And no token should be provided

  @api @user-management
  Scenario: User status endpoint with authentication
    Given I am authenticated with a valid JWT token
    When I make a GET request to "/user/status" with authentication headers
    Then the response status should be 200
    And the response should contain user information:
      | field                | type    | required |
      | id                   | string  | true     |
      | email                | string  | true     |
      | firstName            | string  | true     |
      | lastName             | string  | true     |
      | companyName          | string  | false    |
      | createdAt            | string  | true     |
      | lastLogin            | string  | false    |
      | emailVerified        | boolean | true     |
      | connected_services   | array   | true     |
      | oauth_connections    | array   | true     |
      | has_google_connection| boolean | true     |

  @api @user-management @error-handling
  Scenario: User status endpoint without authentication
    When I make a GET request to "/user/status" without authentication headers
    Then the response status should be 401
    And the response should contain:
      | field   | type   | required |
      | error   | string | true     |
      | message | string | true     |
    And the error should be "Authentication required"

  @api @dashboard
  Scenario: Dashboard data endpoint
    Given I am authenticated with a valid JWT token
    When I make a GET request to "/dashboard" with authentication headers
    Then the response status should be 200
    And the response should contain dashboard data:
      | field         | type   | required |
      | user          | object | true     |
      | stats         | object | true     |
      | connections   | object | true     |
      | quickActions  | array  | true     |
      | systemStatus  | object | true     |
    And the user object should contain profile information
    And the stats should include email and workflow metrics
    And the connections should include Google OAuth status

  @api @oauth
  Scenario: OAuth initiation endpoint
    When I make a GET request to "/oauth/google"
    Then the response status should be 302
    And the response should redirect to Google OAuth
    And the redirect URL should contain:
      | parameter     | required |
      | client_id     | true     |
      | redirect_uri  | true     |
      | response_type | true     |
      | scope         | true     |
      | state         | true     |

  @api @oauth
  Scenario: OAuth callback endpoint
    Given I have a valid OAuth authorization code "test_auth_code"
    And I have a valid state parameter "test_state_123"
    When I make a GET request to "/oauth/google/callback" with OAuth parameters:
      | parameter | value           |
      | code      | test_auth_code  |
      | state     | test_state_123  |
    Then the response status should be 200
    And the response should contain:
      | field                 | type    | required |
      | message               | string  | true     |
      | user                  | object  | true     |
      | tokenReceived         | boolean | true     |
      | refreshTokenReceived  | boolean | false    |
    And the message should indicate successful OAuth connection

  @api @profile-management
  Scenario: User profile retrieval
    Given I am authenticated with a valid JWT token
    When I make a GET request to "/user/profile" with authentication headers
    Then the response status should be 200
    And the response should contain profile information:
      | field                    | type   | required |
      | id                       | string | true     |
      | email                    | string | true     |
      | firstName                | string | true     |
      | lastName                 | string | true     |
      | companyName              | string | false    |
      | createdAt                | string | true     |
      | lastLogin                | string | false    |
      | emailVerified            | boolean| true     |
      | notificationPreferences  | object | false    |

  @api @profile-management
  Scenario: User profile update
    Given I am authenticated with a valid JWT token
    When I make a PUT request to "/user/profile" with updated information:
      | field       | value              |
      | firstName   | UpdatedFirstName   |
      | lastName    | UpdatedLastName    |
      | companyName | Updated Company    |
    Then the response status should be 200
    And the response should contain:
      | field   | type   | required |
      | message | string | true     |
      | user    | object | true     |
    And the user object should reflect the updated information
    And the message should indicate successful update

  @api @security
  Scenario: API security headers validation
    When I make a GET request to "/health"
    Then the response should include security headers:
      | header                    | required |
      | X-Content-Type-Options    | true     |
      | X-Frame-Options           | true     |
      | Strict-Transport-Security | true     |
      | X-XSS-Protection          | false    |
    And all API responses should be served over HTTPS

  @api @error-handling
  Scenario Outline: API error handling for different scenarios
    Given I make a request that triggers "<error_scenario>"
    When the API responds with status code <status_code>
    Then the response should contain user-friendly error information:
      | field   | type   | required |
      | error   | string | true     |
      | message | string | true     |
    And the error message should not expose sensitive system information
    And the error should be appropriate for "<error_scenario>"

    Examples:
      | error_scenario        | status_code |
      | Invalid request data  | 400         |
      | Unauthorized access   | 401         |
      | Forbidden resource    | 403         |
      | Resource not found    | 404         |
      | Server error          | 500         |

  @api @performance
  Scenario: API response time requirements
    Given I am testing API performance
    When I make requests to critical endpoints:
      | endpoint        | max_response_time |
      | /health         | 500ms             |
      | /auth/login     | 1000ms            |
      | /auth/register  | 1500ms            |
      | /user/status    | 1000ms            |
      | /dashboard      | 2000ms            |
    Then all endpoints should respond within their time limits
    And the API should handle concurrent requests efficiently
