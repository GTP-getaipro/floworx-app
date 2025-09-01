Feature: User Authentication
  As a registered user
  I want to login to my FloWorx account
  So that I can access my dashboard and manage email automations

  Background:
    Given I have a registered account with email "test@floworx.com" and password "TestPass123!"

  @smoke @authentication
  Scenario: Successful login with valid credentials
    Given I am on the login page
    When I enter my valid credentials:
      | email              | password      |
      | test@floworx.com   | TestPass123!  |
    And I click the login button
    Then I should be successfully logged in
    And I should be redirected to the dashboard
    And my authentication token should be stored securely
    And I should see my user information displayed

  @authentication @validation
  Scenario: Login form validation for empty fields
    Given I am on the login page
    When I try to login without entering credentials
    Then I should see validation errors:
      | field    | error                 |
      | email    | Email is required     |
      | password | Password is required  |
    And the login form should not be submitted

  @authentication @error-handling
  Scenario: Login with invalid email address
    Given I am on the login page
    When I enter invalid credentials:
      | email                    | password      |
      | nonexistent@floworx.com  | TestPass123!  |
    And I click the login button
    Then I should see an error message "Invalid email or password"
    And I should remain on the login page
    And no authentication token should be stored

  @authentication @error-handling
  Scenario: Login with incorrect password
    Given I am on the login page
    When I enter credentials with wrong password:
      | email              | password        |
      | test@floworx.com   | WrongPassword   |
    And I click the login button
    Then I should see an error message "Invalid email or password"
    And I should remain on the login page
    And no authentication token should be stored

  @authentication @security
  Scenario: Password masking and security
    Given I am on the login page
    When I enter my password in the password field
    Then the password should be masked with asterisks or dots
    And the password should not be visible in the browser developer tools
    And the form should be submitted over HTTPS

  @authentication @token-management
  Scenario: Authentication token handling
    Given I have successfully logged in
    When I check my browser storage
    Then I should have a valid JWT token stored
    And the token should contain my user information
    And the token should have an appropriate expiration time

  @authentication @remember-me
  Scenario: Remember me functionality
    Given I am on the login page
    When I login with valid credentials and check "Remember me"
    Then my session should persist for 7 days
    And I should remain logged in after closing the browser

  @authentication @logout
  Scenario: User logout functionality
    Given I am logged in to my account
    When I click the logout button
    Then I should be logged out successfully
    And my authentication token should be removed
    And I should be redirected to the login page
    And I should not be able to access protected pages

  @authentication @session-expiry
  Scenario: Handling expired authentication tokens
    Given I am logged in with an expired token
    When I try to access a protected page
    Then I should be redirected to the login page
    And I should see a message "Your session has expired. Please log in again."
    And the expired token should be removed from storage

  @authentication @api
  Scenario: Login API integration
    Given the login API endpoint is available
    When I send valid login credentials to the API
    Then the API should return a 200 status code
    And the response should contain:
      | field     | type   | required |
      | token     | string | true     |
      | user      | object | true     |
      | expiresIn | string | true     |
    And the user object should contain my profile information
