/**
 * Gmail OAuth Scopes Configuration for FloWorx
 * Required scopes for email automation functionality
 */

const GMAIL_OAUTH_SCOPES = {
  // Core email access
  GMAIL_READONLY: 'https://www.googleapis.com/auth/gmail.readonly',
  GMAIL_MODIFY: 'https://www.googleapis.com/auth/gmail.modify',
  GMAIL_COMPOSE: 'https://www.googleapis.com/auth/gmail.compose',
  
  // Label management
  GMAIL_LABELS: 'https://www.googleapis.com/auth/gmail.labels',
  
  // Google Business Profile (for review responses)
  BUSINESS_PROFILE: 'https://www.googleapis.com/auth/business.manage',
  
  // User profile info
  PROFILE: 'https://www.googleapis.com/auth/userinfo.profile',
  EMAIL: 'https://www.googleapis.com/auth/userinfo.email'
};

const REQUIRED_SCOPES_ARRAY = [
  GMAIL_OAUTH_SCOPES.GMAIL_READONLY,
  GMAIL_OAUTH_SCOPES.GMAIL_MODIFY,
  GMAIL_OAUTH_SCOPES.GMAIL_COMPOSE,
  GMAIL_OAUTH_SCOPES.GMAIL_LABELS,
  GMAIL_OAUTH_SCOPES.BUSINESS_PROFILE,
  GMAIL_OAUTH_SCOPES.PROFILE,
  GMAIL_OAUTH_SCOPES.EMAIL
];

const SCOPE_DESCRIPTIONS = {
  [GMAIL_OAUTH_SCOPES.GMAIL_READONLY]: 'Read your emails to categorize and analyze them',
  [GMAIL_OAUTH_SCOPES.GMAIL_MODIFY]: 'Apply labels and organize your emails automatically',
  [GMAIL_OAUTH_SCOPES.GMAIL_COMPOSE]: 'Create draft responses for your review',
  [GMAIL_OAUTH_SCOPES.GMAIL_LABELS]: 'Create and manage email labels/folders',
  [GMAIL_OAUTH_SCOPES.BUSINESS_PROFILE]: 'Respond to Google Business reviews automatically',
  [GMAIL_OAUTH_SCOPES.PROFILE]: 'Access your basic profile information',
  [GMAIL_OAUTH_SCOPES.EMAIL]: 'Verify your email address'
};

const GMAIL_OAUTH_CONFIG = {
  scopes: REQUIRED_SCOPES_ARRAY,
  access_type: 'offline',
  prompt: 'consent',
  include_granted_scopes: true
};

module.exports = {
  GMAIL_OAUTH_SCOPES,
  REQUIRED_SCOPES_ARRAY,
  SCOPE_DESCRIPTIONS,
  GMAIL_OAUTH_CONFIG
};
