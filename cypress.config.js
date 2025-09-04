const { defineConfig } = require('cypress');
const createBundler = require('@bahmutov/cypress-esbuild-preprocessor');
const { addCucumberPreprocessorPlugin } = require('@badeball/cypress-cucumber-preprocessor');
const { createEsbuildPlugin } = require('@badeball/cypress-cucumber-preprocessor/esbuild');

module.exports = defineConfig({
  e2e: {
    // Base URL for the FloWorx SaaS application
    baseUrl: 'https://app.floworx-iq.com',
    
    // Viewport settings
    viewportWidth: 1280,
    viewportHeight: 720,
    
    // Test settings
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    pageLoadTimeout: 30000,
    
    // Video and screenshot settings
    video: true,
    screenshotOnRunFailure: true,
    
    // Retry settings
    retries: {
      runMode: 2,
      openMode: 0
    },
    
    // Environment variables
    env: {
      API_BASE_URL: 'https://app.floworx-iq.com/api',
      OAUTH_REDIRECT_URI: 'https://app.floworx-iq.com/api/oauth/google/callback',
      TEST_USER_EMAIL: 'cypress-test@floworx.com',
      TEST_USER_PASSWORD: 'CypressTest123!',
      TEST_USER_FIRST_NAME: 'Cypress',
      TEST_USER_LAST_NAME: 'Tester',
      TEST_COMPANY_NAME: 'FloWorx Test Company'
    },
    
    // Cucumber configuration
    specPattern: 'cypress/e2e/features/**/*.feature',
    supportFile: 'cypress/support/e2e.js',
    
    async setupNodeEvents(on, config) {
      // Cucumber preprocessor plugin
      await addCucumberPreprocessorPlugin(on, config);
      
      // Esbuild bundler for faster preprocessing
      on(
        'file:preprocessor',
        createBundler({
          plugins: [createEsbuildPlugin(config)],
        })
      );
      
      // Custom tasks for API testing
      on('task', {
        // Generate unique test user email
        generateTestEmail() {
          return `cypress-test-${Date.now()}@floworx.com`;
        },
        
        // Log messages during tests
        log(message) {
          console.log(message);
          return null;
        },
        
        // Clear test data (if needed)
        clearTestData() {
          // Implementation would depend on your database cleanup needs
          console.log('Clearing test data...');
          return null;
        }
      });
      
      return config;
    },
  },
  
  // Component testing configuration (for future use)
  component: {
    devServer: {
      framework: 'react',
      bundler: 'webpack',
    },
  },
});
