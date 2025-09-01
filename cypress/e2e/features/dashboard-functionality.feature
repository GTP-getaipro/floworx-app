Feature: Dashboard Functionality
  As a logged-in user
  I want to access my dashboard
  So that I can view my account status and manage my email automations

  Background:
    Given I am logged in as a registered user

  @smoke @dashboard
  Scenario: Dashboard loads successfully with user data
    Given I am on the dashboard page
    Then I should see the dashboard header with my name
    And I should see my account statistics:
      | metric              | display |
      | Emails Processed    | number  |
      | Active Workflows    | number  |
      | Total Automations   | number  |
      | Last Activity       | date    |
    And I should see my connection status section
    And I should see quick action buttons

  @dashboard @user-status
  Scenario: User status information display
    Given I am on the dashboard
    When the dashboard loads my user status
    Then I should see my profile information:
      | field       | type   |
      | firstName   | string |
      | lastName    | string |
      | email       | string |
      | companyName | string |
      | createdAt   | date   |
    And my email verification status should be displayed
    And my last login time should be shown

  @dashboard @connections
  Scenario: OAuth connection status display
    Given I am on the dashboard
    When I view the connections section
    Then I should see the Google connection status
    And if not connected, I should see a "Connect Google Account" button
    And if connected, I should see connection details:
      | detail        | type |
      | connected     | bool |
      | connectedAt   | date |
      | status        | text |

  @dashboard @quick-actions
  Scenario: Quick actions functionality
    Given I am on the dashboard
    When I view the quick actions section
    Then I should see relevant action buttons based on my account status
    And if Google is not connected, I should see "Connect Google Account"
    And if Google is connected, I should see "Create First Workflow"
    And all action buttons should be clickable and functional

  @dashboard @loading-states
  Scenario: Dashboard loading states and error handling
    Given I am accessing the dashboard
    When the dashboard is loading data
    Then I should see appropriate loading indicators
    And if data fails to load, I should see user-friendly error messages
    And I should have options to retry loading failed data

  @dashboard @responsive-design
  Scenario: Dashboard responsive design
    Given I am on the dashboard
    When I view the dashboard on different screen sizes:
      | device  | width | height |
      | mobile  | 375   | 667    |
      | tablet  | 768   | 1024   |
      | desktop | 1280  | 720    |
    Then the dashboard should be properly responsive
    And all elements should be accessible and usable
    And the layout should adapt appropriately

  @dashboard @api-integration
  Scenario: Dashboard API data integration
    Given I am logged in with a valid token
    When I access the dashboard
    Then the dashboard should make API calls to:
      | endpoint        | method | purpose           |
      | /api/dashboard  | GET    | Load dashboard    |
      | /api/user/status| GET    | Load user status  |
    And all API calls should include proper authentication headers
    And the dashboard should handle API responses correctly

  @dashboard @error-handling
  Scenario: Dashboard error handling scenarios
    Given I am on the dashboard
    When API calls fail with different error codes:
      | status | scenario                    | expected_behavior                |
      | 401    | Unauthorized/expired token  | Redirect to login                |
      | 403    | Forbidden access            | Show access denied message       |
      | 500    | Server error                | Show "Something went wrong"      |
      | 404    | User not found              | Show user not found message      |
    Then the dashboard should handle each error appropriately
    And users should see helpful error messages
    And there should be options to recover from errors

  @dashboard @performance
  Scenario: Dashboard performance requirements
    Given I am accessing the dashboard
    When the dashboard loads
    Then the initial page load should complete within 3 seconds
    And API calls should complete within 2 seconds
    And the dashboard should be interactive within 1 second
    And there should be no memory leaks or performance issues

  @dashboard @security
  Scenario: Dashboard security measures
    Given I am on the dashboard
    Then all API calls should be made over HTTPS
    And my authentication token should be securely stored
    And sensitive user data should not be exposed in browser console
    And the dashboard should be protected against XSS attacks
