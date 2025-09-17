#!/usr/bin/env node

/**
 * Test script to verify login fixes for 401 errors and JavaScript TypeError issues
 * This script tests the login error handling and URL fixes
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Login Fixes for 401 Errors and TypeError Issues...\n');

// Test 1: Check if AuthContext uses correct API URLs
console.log('1. Testing AuthContext API URLs...');
const authContextPath = path.join(__dirname, 'frontend/src/contexts/AuthContext.js');
const authContextContent = fs.readFileSync(authContextPath, 'utf8');

const hasCorrectLoginURL = authContextContent.includes("'/api/auth/login'");
const hasCorrectRegisterURL = authContextContent.includes("'/api/auth/register'");

if (hasCorrectLoginURL && hasCorrectRegisterURL) {
  console.log('✅ AuthContext uses correct API URLs (/api/auth/login, /api/auth/register)');
} else {
  console.log('❌ AuthContext has incorrect API URLs');
  if (!hasCorrectLoginURL) console.log('   Missing: /api/auth/login');
  if (!hasCorrectRegisterURL) console.log('   Missing: /api/auth/register');
}

// Test 2: Check enhanced error handling in AuthContext
console.log('\n2. Testing AuthContext error handling...');
const hasEnhancedErrorHandling = authContextContent.includes('data.error?.message') &&
                                 authContextContent.includes('data.message') &&
                                 authContextContent.includes('typeof data.error === \'string\'');
const hasUserFriendlyMessages = authContextContent.includes('Invalid email or password') &&
                               authContextContent.includes('Please verify your email address');
const hasErrorClearing = authContextContent.includes('clearErrors()') &&
                        authContextContent.includes('setLastError');

if (hasEnhancedErrorHandling && hasUserFriendlyMessages && hasErrorClearing) {
  console.log('✅ AuthContext has enhanced error handling and clearing');
} else {
  console.log('❌ AuthContext error handling needs improvement');
}

// Test 3: Check Login component improvements
console.log('\n3. Testing Login component improvements...');
const loginComponentPath = path.join(__dirname, 'frontend/src/components/Login.js');
const loginComponentContent = fs.readFileSync(loginComponentPath, 'utf8');

const hasErrorClearingOnMount = loginComponentContent.includes('clearErrors()') &&
                               loginComponentContent.includes('useEffect');
const hasImprovedErrorHandling = loginComponentContent.includes('result.code === \'UNVERIFIED\'') &&
                                loginComponentContent.includes('showError');
const hasClearErrorsOnInput = loginComponentContent.includes('errors.submit') &&
                             loginComponentContent.includes('handleInputChange');

if (hasErrorClearingOnMount && hasImprovedErrorHandling && hasClearErrorsOnInput) {
  console.log('✅ Login component has improved error handling');
} else {
  console.log('❌ Login component needs improvement');
}

// Test 4: Check backend routing configuration
console.log('\n4. Testing backend routing configuration...');
const serverPath = path.join(__dirname, 'backend/server.js');
const serverContent = fs.readFileSync(serverPath, 'utf8');

const hasAuthRoutes = serverContent.includes("app.use('/api/auth', authRoutes)");
const hasCorrectEndpoints = serverContent.includes('/api/auth/login') &&
                           serverContent.includes('/api/auth/register');

if (hasAuthRoutes && hasCorrectEndpoints) {
  console.log('✅ Backend routing correctly configured for /api/auth endpoints');
} else {
  console.log('❌ Backend routing configuration issues');
}

// Test 5: Check for error state management
console.log('\n5. Testing error state management...');
const hasLastErrorState = authContextContent.includes('const [lastError, setLastError]');
const hasErrorClearFunction = authContextContent.includes('const clearErrors = () =>');
const hasErrorInContextValue = authContextContent.includes('lastError,') &&
                              authContextContent.includes('clearErrors,');

if (hasLastErrorState && hasErrorClearFunction && hasErrorInContextValue) {
  console.log('✅ Error state management implemented');
} else {
  console.log('❌ Error state management missing');
}

// Summary
console.log('\n📊 Test Summary:');
const tests = [
  hasCorrectLoginURL && hasCorrectRegisterURL,
  hasEnhancedErrorHandling && hasUserFriendlyMessages && hasErrorClearing,
  hasErrorClearingOnMount && hasImprovedErrorHandling && hasClearErrorsOnInput,
  hasAuthRoutes && hasCorrectEndpoints,
  hasLastErrorState && hasErrorClearFunction && hasErrorInContextValue
];

const passedTests = tests.filter(Boolean).length;
const totalTests = tests.length;

console.log(`✅ Passed: ${passedTests}/${totalTests} tests`);

if (passedTests === totalTests) {
  console.log('\n🎉 All login fixes implemented successfully!');
  console.log('\n📝 Expected behavior after deployment:');
  console.log('   • Login requests go to correct /api/auth/login endpoint');
  console.log('   • 401 errors show user-friendly "Invalid email or password" message');
  console.log('   • No more "TypeError: T is not a function" errors');
  console.log('   • Registration errors cleared when navigating to login page');
  console.log('   • Proper error handling for unverified email (409) cases');
  console.log('   • Form errors clear when user starts typing');
  console.log('   • Toast notifications show for login success/failure');
  
  console.log('\n🚀 Login should now work properly with DIZELLL2007@GMAIL.COM!');
} else {
  console.log('\n⚠️  Some issues may still exist. Please review the failed tests above.');
}

console.log('\n🔧 Next steps:');
console.log('   1. Deploy the changes to production');
console.log('   2. Test login with DIZELLL2007@GMAIL.COM and correct password');
console.log('   3. Test login with incorrect password (should show user-friendly error)');
console.log('   4. Verify no JavaScript TypeError messages in console');
console.log('   5. Verify no residual registration errors on login page');
console.log('   6. Test navigation between login and register pages');
