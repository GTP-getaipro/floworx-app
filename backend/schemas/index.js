/**
 * Validation Schemas Index
 * Central export point for all validation schemas
 */

const accountRecoverySchemas = require('./accountRecovery');
const authSchemas = require('./auth');
const commonSchemas = require('./common');
const onboardingSchemas = require('./onboarding');
const userSchemas = require('./user');
const workflowSchemas = require('./workflow');

module.exports = {
  // Authentication schemas
  ...authSchemas,

  // User management schemas
  ...userSchemas,

  // Onboarding schemas
  ...onboardingSchemas,

  // Account recovery schemas
  ...accountRecoverySchemas,

  // Workflow schemas
  ...workflowSchemas,

  // Common/shared schemas
  ...commonSchemas
};
