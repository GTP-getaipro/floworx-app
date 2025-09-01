Feature: User Registration
  As a new user
  I want to register for a FloWorx account
  So that I can access the email automation platform

  Background:
    Given I am on the FloWorx registration page

  @smoke @registration
  Scenario: Successful user registration with valid information
    Given I am a new user who wants to create an account
    When I fill in the registration form with valid information:
      | firstName | lastName | email                    | password        | companyName        |
      | John      | Doe      | john.doe@testcompany.com | SecurePass123!  | Test Company Inc   |
    And I submit the registration form
    Then I should see a successful registration message
    And I should be redirected to the dashboard
    And I should have a valid authentication token stored
    And my user profile should be created in the system

  @registration @validation
  Scenario: Registration form validation for required fields
    Given I am on the registration form
    When I try to submit the form without filling required fields
    Then I should see validation errors for:
      | field     | error                        |
      | firstName | First name is required       |
      | lastName  | Last name is required        |
      | email     | Email is required            |
      | password  | Password is required         |

  @registration @validation
  Scenario: Email format validation during registration
    Given I am on the registration form
    When I enter an invalid email format "invalid-email"
    And I submit the registration form
    Then I should see an email format validation error
    And the form should not be submitted

  @registration @validation
  Scenario: Password strength validation
    Given I am on the registration form
    When I enter a weak password "123"
    And I submit the registration form
    Then I should see a password strength validation error
    And the form should not be submitted

  @registration @error-handling
  Scenario: Registration with existing email address
    Given a user already exists with email "existing@testcompany.com"
    When I try to register with the same email "existing@testcompany.com"
    And I submit the registration form
    Then I should see an error message "An account with this email already exists"
    And I should remain on the registration page

  @registration @api
  Scenario: Registration API integration
    Given the registration API is available
    When I submit valid registration data
    Then the API should return a 201 status code
    And the response should contain:
      | field   | type   |
      | token   | string |
      | user    | object |
      | message | string |
    And the user should be created in the database

  @registration @security
  Scenario: Registration form security measures
    Given I am on the registration form
    Then the form should be served over HTTPS
    And the password field should be masked
    And the form should have CSRF protection
    And sensitive data should not be logged in browser console

  @registration @accessibility
  Scenario: Registration form accessibility
    Given I am on the registration form
    Then all form fields should have proper labels
    And the form should be keyboard navigable
    And error messages should be announced to screen readers
    And the form should have proper ARIA attributes
