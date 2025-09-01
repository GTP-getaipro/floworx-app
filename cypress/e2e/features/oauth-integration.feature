Feature: OAuth Integration
  As a logged-in user
  I want to connect my Google account
  So that I can automate my Gmail workflows

  Background:
    Given I am logged in as a registered user
    And I am on the dashboard

  @smoke @oauth
  Scenario: Google OAuth connection initiation
    Given I have not connected my Google account yet
    When I click the "Connect Google Account" button
    Then I should be redirected to Google's OAuth authorization page
    And the OAuth URL should contain the correct parameters:
      | parameter     | value                                                    |
      | client_id     | valid_google_client_id                                   |
      | redirect_uri  | https://floworx-app.vercel.app/api/oauth/google/callback |
      | response_type | code                                                     |
      | scope         | gmail.readonly gmail.modify userinfo.email userinfo.profile |
    And the OAuth state parameter should be present for security

  @oauth @callback
  Scenario: OAuth callback handling after successful authorization
    Given I have initiated the Google OAuth flow
    And I have authorized FloWorx to access my Google account
    When Google redirects me back to the callback URL with an authorization code
    Then the callback should exchange the code for access tokens
    And I should be redirected back to the dashboard
    And my Google connection status should show as "Connected"
    And I should see my Google account information

  @oauth @error-handling
  Scenario: OAuth authorization denied by user
    Given I have initiated the Google OAuth flow
    When I deny authorization on Google's consent screen
    Then I should be redirected back to the dashboard
    And I should see an error message "Google authorization was denied"
    And my Google connection status should remain "Not Connected"
    And I should still have the option to try connecting again

  @oauth @security
  Scenario: OAuth security measures
    Given I am initiating the OAuth flow
    Then the OAuth request should include a state parameter
    And the state parameter should be validated on callback
    And the OAuth flow should use HTTPS throughout
    And access tokens should be stored securely
    And refresh tokens should be encrypted

  @oauth @connection-status
  Scenario: Viewing OAuth connection status
    Given I have connected my Google account
    When I view my dashboard
    Then I should see my Google connection status as "Connected"
    And I should see the connection date and time
    And I should see options to:
      | action      | description                    |
      | Disconnect  | Remove Google connection       |
      | Reconnect   | Refresh connection if needed   |
      | View Scopes | See what permissions granted   |

  @oauth @disconnection
  Scenario: Disconnecting Google account
    Given I have a connected Google account
    When I click the "Disconnect Google Account" button
    And I confirm the disconnection
    Then my Google connection should be removed
    And my connection status should show "Not Connected"
    And I should see the "Connect Google Account" button again
    And my stored Google tokens should be deleted

  @oauth @token-refresh
  Scenario: OAuth token refresh handling
    Given I have a connected Google account with expired access token
    When I perform an action that requires Google API access
    Then the system should automatically refresh the access token
    And the action should complete successfully
    And my connection should remain active

  @oauth @api-integration
  Scenario: OAuth API endpoints functionality
    Given the OAuth API endpoints are available
    When I test the OAuth endpoints:
      | endpoint                           | method | purpose                    |
      | /api/oauth/google                  | GET    | Initiate OAuth flow        |
      | /api/oauth/google/callback         | GET    | Handle OAuth callback      |
    Then the initiation endpoint should redirect to Google
    And the callback endpoint should process authorization codes
    And both endpoints should handle errors gracefully

  @oauth @permissions
  Scenario: OAuth permission scopes validation
    Given I am connecting my Google account
    When I review the permissions requested
    Then I should see requests for:
      | scope                                      | purpose                           |
      | https://www.googleapis.com/auth/userinfo.email    | Access email address     |
      | https://www.googleapis.com/auth/userinfo.profile  | Access basic profile     |
      | https://www.googleapis.com/auth/gmail.readonly     | Read Gmail messages      |
      | https://www.googleapis.com/auth/gmail.modify       | Modify Gmail messages    |
    And the permissions should be clearly explained to the user
    And I should be able to proceed or cancel the authorization

  @oauth @error-scenarios
  Scenario Outline: OAuth error handling scenarios
    Given I am in the OAuth flow
    When an error occurs: "<error_type>"
    Then I should see an appropriate error message: "<error_message>"
    And I should be able to retry the connection
    And the error should be logged for debugging

    Examples:
      | error_type              | error_message                                    |
      | invalid_client          | OAuth configuration error                        |
      | access_denied           | Google authorization was denied                  |
      | invalid_grant           | Authorization code is invalid or expired        |
      | server_error            | Google OAuth service is temporarily unavailable |
      | network_error           | Network connection failed                        |
