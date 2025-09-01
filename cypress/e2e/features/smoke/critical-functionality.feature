Feature: Critical Functionality Smoke Tests
  As a stakeholder
  I want to ensure critical application functionality works
  So that users can successfully use the FloWorx platform

  @smoke @critical
  Scenario: Application loads and basic navigation works
    Given I visit the FloWorx application
    Then the application should load successfully
    And I should see the main navigation
    And all critical pages should be accessible:
      | page         | url        | expected_element           |
      | Home         | /          | [data-testid="hero"]       |
      | Login        | /login     | [data-testid="login-form"] |
      | Register     | /register  | [data-testid="register-form"] |

  @smoke @api @critical
  Scenario: Critical API endpoints are functional
    Given the FloWorx API is available
    When I test critical API endpoints:
      | endpoint      | method | expected_status | critical |
      | /health       | GET    | 200            | true     |
      | /auth/login   | POST   | 401            | true     |
      | /auth/register| POST   | 400            | true     |
    Then all critical endpoints should respond correctly
    And the API should be healthy and operational

  @smoke @authentication @critical
  Scenario: User authentication flow works end-to-end
    Given I am on the registration page
    When I register a new user with valid information
    Then I should be successfully registered
    And I should be automatically logged in
    And I should be redirected to the dashboard
    
    When I log out of the application
    Then I should be redirected to the login page
    
    When I log back in with the same credentials
    Then I should be successfully authenticated
    And I should access my dashboard

  @smoke @dashboard @critical
  Scenario: Dashboard loads with user data
    Given I am logged in as a registered user
    When I access the dashboard
    Then the dashboard should load within 5 seconds
    And I should see my user information
    And I should see my account statistics
    And I should see connection status
    And I should see available actions

  @smoke @oauth @critical
  Scenario: OAuth integration is accessible
    Given I am logged in and on the dashboard
    When I attempt to connect my Google account
    Then the OAuth flow should initiate successfully
    And I should be redirected to Google's authorization page
    Or I should see appropriate OAuth configuration messages

  @smoke @security @critical
  Scenario: Security measures are in place
    Given I access the FloWorx application
    Then the application should be served over HTTPS
    And security headers should be present
    And authentication should be required for protected pages:
      | page      | url         | requires_auth |
      | Dashboard | /dashboard  | true          |
      | Profile   | /profile    | true          |
    And unauthenticated access should redirect to login

  @smoke @performance @critical
  Scenario: Application meets basic performance requirements
    Given I am testing application performance
    When I measure page load times:
      | page      | max_load_time |
      | Home      | 3 seconds     |
      | Login     | 2 seconds     |
      | Register  | 2 seconds     |
      | Dashboard | 5 seconds     |
    Then all pages should load within acceptable time limits
    And the application should be responsive

  @smoke @responsive @critical
  Scenario: Application works on different devices
    Given I am testing responsive design
    When I test the application on different screen sizes:
      | device_type | width | height |
      | Mobile      | 375   | 667    |
      | Tablet      | 768   | 1024   |
      | Desktop     | 1280  | 720    |
    Then the application should be usable on all device types
    And all critical functionality should remain accessible
    And the layout should adapt appropriately

  @smoke @error-handling @critical
  Scenario: Error handling works correctly
    Given I am using the FloWorx application
    When I encounter different error scenarios:
      | scenario                    | expected_behavior                |
      | Invalid login credentials   | User-friendly error message     |
      | Network connectivity issues | Graceful degradation            |
      | Server errors              | Appropriate error pages         |
      | Missing pages              | 404 error handling              |
    Then errors should be handled gracefully
    And users should receive helpful feedback
    And the application should remain stable

  @smoke @data-flow @critical
  Scenario: Data flows correctly between frontend and backend
    Given I complete a full user interaction flow
    When I register, login, and update my profile
    Then data should be consistently stored and retrieved
    And changes should be reflected immediately
    And data integrity should be maintained
    And API responses should match frontend expectations

  @smoke @browser-compatibility @critical
  Scenario: Application works across major browsers
    Given I am testing browser compatibility
    When I test the application on different browsers:
      | browser | version | critical_features |
      | Chrome  | latest  | all               |
      | Firefox | latest  | all               |
      | Safari  | latest  | basic             |
      | Edge    | latest  | all               |
    Then core functionality should work in all browsers
    And the user experience should be consistent
    And no critical JavaScript errors should occur
