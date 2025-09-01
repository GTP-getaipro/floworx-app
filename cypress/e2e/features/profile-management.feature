Feature: Profile Management
  As a logged-in user
  I want to view and update my profile information
  So that I can keep my account details current

  Background:
    Given I am logged in as a registered user

  @smoke @profile
  Scenario: Viewing user profile information
    Given I am on the profile page
    Then I should see my current profile information:
      | field           | type   | editable |
      | firstName       | string | true     |
      | lastName        | string | true     |
      | email           | string | false    |
      | companyName     | string | true     |
      | createdAt       | date   | false    |
      | lastLogin       | date   | false    |
      | emailVerified   | bool   | false    |
    And all read-only fields should be clearly marked
    And all editable fields should have proper form controls

  @profile @update
  Scenario: Successfully updating profile information
    Given I am on the profile page
    When I update my profile with new information:
      | field       | newValue           |
      | firstName   | UpdatedFirstName   |
      | lastName    | UpdatedLastName    |
      | companyName | Updated Company    |
    And I save the changes
    Then I should see a success message "Profile updated successfully"
    And my profile should display the updated information
    And the changes should be persisted in the database

  @profile @validation
  Scenario: Profile form validation
    Given I am on the profile page
    When I try to save the profile with invalid data:
      | field     | invalidValue | expectedError              |
      | firstName | ""           | First name cannot be empty |
      | lastName  | ""           | Last name cannot be empty  |
    Then I should see appropriate validation errors
    And the form should not be submitted
    And my original profile data should remain unchanged

  @profile @api-integration
  Scenario: Profile API integration
    Given I am updating my profile
    When I save changes to my profile
    Then the system should make API calls to:
      | endpoint           | method | purpose              |
      | /api/user/profile  | GET    | Load profile data    |
      | /api/user/profile  | PUT    | Update profile data  |
    And all API calls should include proper authentication
    And the API should return updated profile data

  @profile @error-handling
  Scenario: Profile update error handling
    Given I am on the profile page
    When profile update fails with different scenarios:
      | scenario          | status | expected_behavior                    |
      | Network error     | 0      | Show "Network connection failed"     |
      | Unauthorized      | 401    | Redirect to login                    |
      | Validation error  | 400    | Show specific validation messages    |
      | Server error      | 500    | Show "Something went wrong"          |
    Then I should see appropriate error messages
    And I should be able to retry the update
    And my form data should be preserved

  @profile @security
  Scenario: Profile security measures
    Given I am on the profile page
    Then I should only be able to access my own profile
    And sensitive information should not be editable:
      | field         | reason                    |
      | email         | Requires verification     |
      | createdAt     | Historical data           |
      | lastLogin     | System generated          |
    And all profile updates should be authenticated
    And profile data should be transmitted over HTTPS

  @profile @notifications
  Scenario: Profile notification preferences
    Given I am on the profile page
    When I view notification settings
    Then I should see options to configure:
      | notification_type    | options                    |
      | Email notifications  | enabled/disabled           |
      | Workflow alerts      | enabled/disabled           |
      | System updates       | enabled/disabled           |
      | Marketing emails     | enabled/disabled           |
    And I should be able to update these preferences
    And changes should be saved immediately

  @profile @timezone
  Scenario: Timezone and localization settings
    Given I am on the profile page
    When I view localization settings
    Then I should be able to set my timezone
    And I should see a list of available timezones
    And my selection should affect how dates are displayed
    And the timezone should be saved to my profile

  @profile @data-export
  Scenario: Profile data export functionality
    Given I am on the profile page
    When I request to export my profile data
    Then I should be able to download my data in JSON format
    And the export should include:
      | data_type           | included |
      | Profile information | true     |
      | Account settings    | true     |
      | Connection history  | true     |
      | Workflow data       | true     |
    And sensitive data should be properly handled

  @profile @account-deletion
  Scenario: Account deletion request
    Given I am on the profile page
    When I navigate to account deletion section
    Then I should see clear information about data deletion
    And I should be required to confirm my password
    And I should see a final confirmation dialog
    And the deletion should be scheduled (not immediate)
    And I should receive confirmation via email
