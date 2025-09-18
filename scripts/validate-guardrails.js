#!/usr/bin/env node

/**
 * FloWorx Guardrails Validation Script
 * 
 * This script validates all architectural guardrails to prevent drift issues:
 * - Component structure (no duplicates)
 * - Design system compliance (no external libraries)
 * - Authentication configuration consistency
 * - Email security requirements
 * - Token TTL consistency
 * 
 * Run this script before committing changes to ensure compliance.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🛡️  FLOWORX GUARDRAILS VALIDATION');
console.log('='.repeat(50));

let hasViolations = false;

/**
 * Log validation result
 */
function logResult(check, passed, message, details = null) {
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${check}: ${message}`);
  
  if (!passed) {
    hasViolations = true;
    if (details) {
      console.log(`   ${details}`);
    }
  }
}

/**
 * Check for duplicate authentication components
 */
function validateComponentStructure() {
  console.log('\n🔍 COMPONENT STRUCTURE VALIDATION');
  console.log('-'.repeat(30));

  // Check for forbidden duplicate auth components
  const forbiddenPaths = [
    'frontend/src/pages/Auth/Login.js',
    'frontend/src/pages/Auth/Register.js', 
    'frontend/src/pages/Auth/VerifyEmail.js',
    'frontend/src/components/Login.js',
    'frontend/src/components/Register.js'
  ];

  let duplicatesFound = [];
  forbiddenPaths.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      duplicatesFound.push(filePath);
    }
  });

  logResult(
    'Duplicate Components',
    duplicatesFound.length === 0,
    duplicatesFound.length === 0 ? 'No duplicate components found' : 'Duplicate components detected',
    duplicatesFound.length > 0 ? `Found: ${duplicatesFound.join(', ')}` : null
  );

  // Check that canonical components exist
  const canonicalComponents = [
    'frontend/src/pages/ForgotPasswordPage.jsx',
    'frontend/src/pages/ResetPasswordPage.jsx',
    'frontend/src/pages/LoginPage.jsx',
    'frontend/src/pages/RegisterPage.jsx',
    'frontend/src/pages/VerifyEmailPage.jsx'
  ];

  let missingCanonical = [];
  canonicalComponents.forEach(filePath => {
    if (!fs.existsSync(filePath)) {
      missingCanonical.push(filePath);
    }
  });

  logResult(
    'Canonical Components',
    missingCanonical.length === 0,
    missingCanonical.length === 0 ? 'All canonical components present' : 'Missing canonical components',
    missingCanonical.length > 0 ? `Missing: ${missingCanonical.join(', ')}` : null
  );
}

/**
 * Check for external design library imports
 */
function validateDesignSystem() {
  console.log('\n🎨 DESIGN SYSTEM VALIDATION');
  console.log('-'.repeat(30));

  const forbiddenImports = [
    '@mui/',
    '@material-ui/',
    'bootstrap',
    'react-bootstrap',
    'antd',
    '@ant-design/',
    '@chakra-ui/',
    'semantic-ui-react',
    '@mantine/'
  ];

  let violations = [];

  try {
    // Search for forbidden imports in frontend source files
    const searchCommand = `grep -r "${forbiddenImports.join('\\|')}" frontend/src --include="*.js" --include="*.jsx" || true`;
    const result = execSync(searchCommand, { encoding: 'utf8' });
    
    if (result.trim()) {
      violations = result.trim().split('\n').slice(0, 5); // Show first 5 violations
    }
  } catch (error) {
    // grep returns non-zero exit code when no matches found, which is what we want
  }

  logResult(
    'Design System Compliance',
    violations.length === 0,
    violations.length === 0 ? 'No external design libraries detected' : 'External design libraries found',
    violations.length > 0 ? `Violations: ${violations.join(', ')}` : null
  );
}

/**
 * Check authentication configuration consistency
 */
function validateAuthConfiguration() {
  console.log('\n🔐 AUTHENTICATION CONFIGURATION VALIDATION');
  console.log('-'.repeat(30));

  // Check that authConfig.js exists
  const authConfigExists = fs.existsSync('backend/config/authConfig.js');
  logResult(
    'Auth Config File',
    authConfigExists,
    authConfigExists ? 'Centralized auth configuration found' : 'Missing centralized auth configuration',
    !authConfigExists ? 'Create backend/config/authConfig.js' : null
  );

  if (authConfigExists) {
    try {
      // Load and validate auth configuration
      const { authConfig, validateAuthConfig } = require('../backend/config/authConfig');
      
      // Check token TTL values
      const passwordResetTTL = authConfig.tokens.passwordResetTTL;
      const correctTTL = passwordResetTTL === 15;
      
      logResult(
        'Password Reset TTL',
        correctTTL,
        correctTTL ? `Correct TTL: ${passwordResetTTL} minutes` : `Incorrect TTL: ${passwordResetTTL} minutes`,
        !correctTTL ? 'Password reset TTL must be 15 minutes' : null
      );

      // Test configuration validation
      try {
        validateAuthConfig();
        logResult('Auth Config Validation', true, 'Configuration validation passes');
      } catch (error) {
        logResult('Auth Config Validation', false, 'Configuration validation failed', error.message);
      }

    } catch (error) {
      logResult('Auth Config Loading', false, 'Failed to load auth configuration', error.message);
    }
  }

  // Check for hardcoded token TTLs
  let hardcodedTTLs = [];
  try {
    const searchCommand = `grep -r "15.*60.*1000\\|60.*60.*1000" backend --include="*.js" | grep -v "authConfig.js" || true`;
    const result = execSync(searchCommand, { encoding: 'utf8' });
    
    if (result.trim()) {
      hardcodedTTLs = result.trim().split('\n').slice(0, 3);
    }
  } catch (error) {
    // Ignore grep errors
  }

  logResult(
    'Hardcoded TTLs',
    hardcodedTTLs.length === 0,
    hardcodedTTLs.length === 0 ? 'No hardcoded token TTLs found' : 'Hardcoded token TTLs detected',
    hardcodedTTLs.length > 0 ? `Found: ${hardcodedTTLs.join(', ')}` : null
  );
}

/**
 * Check email security requirements
 */
function validateEmailSecurity() {
  console.log('\n📧 EMAIL SECURITY VALIDATION');
  console.log('-'.repeat(30));

  // Check for email pre-filling in auth components
  let prefillingViolations = [];
  try {
    const searchCommand = `grep -r "defaultValue.*email\\|value.*user.*email\\|localStorage.*email" frontend/src/pages --include="*.jsx" || true`;
    const result = execSync(searchCommand, { encoding: 'utf8' });
    
    if (result.trim()) {
      prefillingViolations = result.trim().split('\n').slice(0, 3);
    }
  } catch (error) {
    // Ignore grep errors
  }

  logResult(
    'Email Pre-filling',
    prefillingViolations.length === 0,
    prefillingViolations.length === 0 ? 'No email pre-filling detected' : 'Email pre-filling violations found',
    prefillingViolations.length > 0 ? `Violations: ${prefillingViolations.join(', ')}` : null
  );

  // Check that server validates email configuration
  const serverValidation = fs.existsSync('backend/server.js') && 
    fs.readFileSync('backend/server.js', 'utf8').includes('validateAuthConfig');

  logResult(
    'Email Service Validation',
    serverValidation,
    serverValidation ? 'Server validates email configuration on startup' : 'Missing email service validation',
    !serverValidation ? 'Add validateAuthConfig() call to backend/server.js' : null
  );
}

/**
 * Run knip to check for unused code
 */
function validateCodeUsage() {
  console.log('\n🔍 CODE USAGE VALIDATION');
  console.log('-'.repeat(30));

  try {
    execSync('npm run audit:unused', { stdio: 'pipe' });
    logResult('Unused Code Check', true, 'No unused code detected');
  } catch (error) {
    logResult('Unused Code Check', false, 'Unused code detected', 'Run: npm run audit:unused');
  }
}

/**
 * Main validation function
 */
function main() {
  try {
    validateComponentStructure();
    validateDesignSystem();
    validateAuthConfiguration();
    validateEmailSecurity();
    validateCodeUsage();

    console.log('\n' + '='.repeat(50));
    
    if (hasViolations) {
      console.log('❌ GUARDRAIL VIOLATIONS DETECTED');
      console.log('   Fix all violations before committing changes.');
      console.log('   See README files in frontend/src/pages/ and frontend/src/components/');
      process.exit(1);
    } else {
      console.log('✅ ALL GUARDRAILS VALIDATED SUCCESSFULLY');
      console.log('   FloWorx architectural integrity maintained.');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Validation script error:', error.message);
    process.exit(1);
  }
}

// Run validation if called directly
if (require.main === module) {
  main();
}

module.exports = {
  validateComponentStructure,
  validateDesignSystem,
  validateAuthConfiguration,
  validateEmailSecurity,
  validateCodeUsage
};
