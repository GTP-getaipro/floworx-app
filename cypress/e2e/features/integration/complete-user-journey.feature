Feature: Complete User Journey Integration
  As a new user of FloWorx
  I want to complete the entire user journey from registration to active use
  So that I can successfully set up email automation

  @smoke @integration @user-journey
  Scenario: Complete new user onboarding journey
    Given I am a new user visiting FloWorx for the first time
    
    # Registration Phase
    When I navigate to the registration page
    And I register with valid information:
      | firstName | lastName | email                      | password       | companyName    |
      | Jane      | Smith    | jane.smith@newcompany.com  | SecurePass123! | New Company    |
    Then I should be successfully registered
    And I should receive a welcome message
    And I should be automatically logged in
    
    # Dashboard Access Phase
    When I am redirected to the dashboard
    Then I should see my dashboard with initial state:
      | element              | status        |
      | Welcome message      | displayed     |
      | User profile info    | populated     |
      | Google connection    | not connected |
      | Quick actions        | available     |
      | Statistics           | zero state    |
    
    # Profile Setup Phase
    When I navigate to my profile settings
    And I complete my profile information
    Then my profile should be fully populated
    And I should see profile completion indicators
    
    # OAuth Connection Phase
    When I return to the dashboard
    And I initiate Google OAuth connection
    Then I should be guided through the OAuth flow
    And upon successful connection, I should see:
      | element                    | status     |
      | Google connection status   | connected  |
      | Connection timestamp       | recent     |
      | Next steps guidance        | displayed  |
    
    # Workflow Creation Readiness
    Then I should see options to create my first workflow
    And I should have access to all platform features
    And my user journey should be complete

  @integration @error-recovery
  Scenario: User journey with error recovery
    Given I am going through the user registration process
    
    # Registration with Error Recovery
    When I attempt to register with an invalid email format
    Then I should see validation errors
    And I should be able to correct the errors
    And successfully complete registration
    
    # Login with Error Recovery
    When I later return and attempt to login with wrong password
    Then I should see an authentication error
    And I should be able to retry with correct credentials
    And successfully access my dashboard
    
    # OAuth with Error Recovery
    When I attempt to connect Google OAuth but deny permissions
    Then I should see an OAuth error message
    And I should be able to retry the OAuth connection
    And successfully complete the connection

  @integration @data-persistence
  Scenario: Data persistence across user sessions
    Given I have completed the full registration and setup process
    And I have connected my Google account
    And I have updated my profile information
    
    When I log out of the application
    And I close my browser
    And I return to the application later
    And I log back in
    
    Then all my data should be persisted:
      | data_type           | status      |
      | Profile information | preserved   |
      | Google connection   | maintained  |
      | Account settings    | unchanged   |
      | Dashboard state     | restored    |
    
    And I should be able to continue where I left off

  @integration @cross-browser
  Scenario: Cross-browser user journey compatibility
    Given I start my user journey on Chrome browser
    When I register and partially complete my setup
    And I switch to Firefox browser
    And I log in to my account
    Then my progress should be maintained across browsers
    And all functionality should work consistently
    And I should be able to complete my setup

  @integration @mobile-responsive
  Scenario: Mobile-responsive user journey
    Given I am using a mobile device
    When I complete the entire user journey on mobile:
      | step                | mobile_experience |
      | Registration        | fully functional  |
      | Login               | fully functional  |
      | Dashboard access    | responsive design |
      | Profile management  | touch-friendly    |
      | OAuth connection    | mobile-optimized  |
    Then all features should work seamlessly on mobile
    And the user experience should be optimized for touch

  @integration @performance
  Scenario: User journey performance requirements
    Given I am completing the user journey
    When I measure performance at each step:
      | step                | max_load_time | max_api_response |
      | Registration page   | 2 seconds     | 1 second         |
      | Login process       | 1 second      | 1 second         |
      | Dashboard load      | 3 seconds     | 2 seconds        |
      | Profile page        | 2 seconds     | 1 second         |
      | OAuth initiation    | 1 second      | 500ms            |
    Then all performance requirements should be met
    And the user experience should be smooth and responsive

  @integration @api-workflow
  Scenario: Complete API workflow integration
    Given I am testing the complete API integration
    When I perform the full user journey via API calls:
      | step              | endpoint              | method | expected_status |
      | Register user     | /api/auth/register    | POST   | 201             |
      | Login user        | /api/auth/login       | POST   | 200             |
      | Get user status   | /api/user/status      | GET    | 200             |
      | Load dashboard    | /api/dashboard        | GET    | 200             |
      | Update profile    | /api/user/profile     | PUT    | 200             |
      | Initiate OAuth    | /api/oauth/google     | GET    | 302             |
    Then all API endpoints should respond correctly
    And data should flow properly between frontend and backend
    And authentication should work seamlessly throughout
