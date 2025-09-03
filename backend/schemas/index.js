/**
 * Validation Schemas Index
 * Central export point for all validation schemas
 */

const authSchemas = require('./auth');
const userSchemas = require('./user');
const onboardingSchemas = require('./onboarding');
const accountRecoverySchemas = require('./accountRecovery');
const workflowSchemas = require('./workflow');
const commonSchemas = require('./common');

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
