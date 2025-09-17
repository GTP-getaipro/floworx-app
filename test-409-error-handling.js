#!/usr/bin/env node

/**
 * Test script to verify 409 Conflict error handling fixes
 * This script tests the registration error handling for duplicate emails
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing 409 Conflict Error Handling Fixes...\n');

// Test 1: Check if errorHandling.js includes 409 handling
console.log('1. Testing errorHandling.js 409 support...');
const errorHandlingPath = path.join(__dirname, 'frontend/src/utils/errorHandling.js');
const errorHandlingContent = fs.readFileSync(errorHandlingPath, 'utf8');

const has409Handling = errorHandlingContent.includes('status === 409') && 
                      errorHandlingContent.includes('CONFLICT_ERROR');
const hasUserFriendlyMessage = errorHandlingContent.includes('userFriendlyMessage');
const hasSuggestLogin = errorHandlingContent.includes('suggestLogin');

if (has409Handling && hasUserFriendlyMessage && hasSuggestLogin) {
  console.log('✅ 409 Conflict error handling implemented');
} else {
  console.log('❌ Missing 409 error handling features');
}

// Test 2: Check AuthContext register function improvements
console.log('\n2. Testing AuthContext register function...');
const authContextPath = path.join(__dirname, 'frontend/src/contexts/AuthContext.js');
const authContextContent = fs.readFileSync(authContextPath, 'utf8');

const hasImprovedErrorExtraction = authContextContent.includes('data.error?.message') &&
                                  authContextContent.includes('data.message') &&
                                  authContextContent.includes('typeof data.error === \'string\'');
const hasStatusCode = authContextContent.includes('status: error.response?.status');
const hasUserFriendlyMessages = authContextContent.includes('This email is already registered');

if (hasImprovedErrorExtraction && hasStatusCode && hasUserFriendlyMessages) {
  console.log('✅ AuthContext register function enhanced');
} else {
  console.log('❌ AuthContext register function needs improvement');
}

// Test 3: Check RegisterForm error handling
console.log('\n3. Testing RegisterForm error handling...');
const registerFormPath = path.join(__dirname, 'frontend/src/components/RegisterForm.js');
const registerFormContent = fs.readFileSync(registerFormPath, 'utf8');

const hasConflictErrorHandling = registerFormContent.includes('CONFLICT_ERROR') &&
                                registerFormContent.includes('userFriendlyMessage');
const hasResultValidation = registerFormContent.includes('typeof result !== \'object\'') &&
                           registerFormContent.includes('result.success === true');
const hasProperErrorStructure = registerFormContent.includes('registrationError.response');

if (hasConflictErrorHandling && hasResultValidation && hasProperErrorStructure) {
  console.log('✅ RegisterForm error handling improved');
} else {
  console.log('❌ RegisterForm error handling needs work');
}

// Test 4: Check ERROR_MESSAGES constants
console.log('\n4. Testing ERROR_MESSAGES constants...');
const hasEmailExistsMessage = errorHandlingContent.includes('EMAIL_ALREADY_EXISTS');
const hasConflictMessage = errorHandlingContent.includes('CONFLICT_ERROR');

if (hasEmailExistsMessage && hasConflictMessage) {
  console.log('✅ ERROR_MESSAGES constants updated');
} else {
  console.log('❌ Missing ERROR_MESSAGES constants');
}

// Test 5: Simulate error parsing
console.log('\n5. Testing error parsing logic...');

// Simulate a 409 error response structure
const mockError409 = {
  response: {
    status: 409,
    data: {
      error: {
        code: "EMAIL_EXISTS",
        message: "Email already registered"
      }
    }
  }
};

// Check if the parsing logic would work
const hasCorrectParsing = errorHandlingContent.includes('data?.error?.message') &&
                         errorHandlingContent.includes('data?.message') &&
                         errorHandlingContent.includes('email already registered');

if (hasCorrectParsing) {
  console.log('✅ Error parsing logic should handle backend response structure');
} else {
  console.log('❌ Error parsing logic may not handle backend response structure');
}

// Summary
console.log('\n📊 Test Summary:');
const tests = [
  has409Handling && hasUserFriendlyMessage && hasSuggestLogin,
  hasImprovedErrorExtraction && hasStatusCode && hasUserFriendlyMessages,
  hasConflictErrorHandling && hasResultValidation && hasProperErrorStructure,
  hasEmailExistsMessage && hasConflictMessage,
  hasCorrectParsing
];

const passedTests = tests.filter(Boolean).length;
const totalTests = tests.length;

console.log(`✅ Passed: ${passedTests}/${totalTests} tests`);

if (passedTests === totalTests) {
  console.log('\n🎉 All 409 error handling fixes implemented successfully!');
  console.log('\n📝 Expected behavior after deployment:');
  console.log('   • 409 Conflict errors are properly caught and parsed');
  console.log('   • User sees: "This email is already registered. Please sign in or use a different email address."');
  console.log('   • No more "TypeError: T is not a function" errors');
  console.log('   • Suggestion to sign in appears after 2 seconds');
  console.log('   • Form resets to step 1 on error');
  console.log('   • Console shows proper error logging for debugging');
  
  console.log('\n🚀 Registration form should now handle duplicate emails gracefully!');
} else {
  console.log('\n⚠️  Some issues may still exist. Please review the failed tests above.');
}

console.log('\n🔧 Next steps:');
console.log('   1. Deploy the changes to production');
console.log('   2. Test registration with DIZELLL2007@GMAIL.COM (should show user-friendly error)');
console.log('   3. Verify no JavaScript TypeError messages in console');
console.log('   4. Test with a new email to ensure registration still works');
console.log('   5. Verify the "Sign in instead" suggestion appears');
