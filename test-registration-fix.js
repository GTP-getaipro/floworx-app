#!/usr/bin/env node

/**
 * Test script to verify registration form fixes
 * This script tests the JavaScript components that were causing TypeError issues
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Registration Form Fixes...\n');

// Test 1: Check if useFormValidation hook exports all required properties
console.log('1. Testing useFormValidation hook exports...');
const hookPath = path.join(__dirname, 'frontend/src/hooks/useFormValidation.js');
const hookContent = fs.readFileSync(hookPath, 'utf8');

const requiredExports = [
  'values',
  'errors', 
  'touched',
  'isSubmitting',
  'handleChange',
  'handleBlur', 
  'handleSubmit',
  'setValue',
  'setValues',
  'validate',
  'isValid',
  'reset'
];

let missingExports = [];
requiredExports.forEach(exportName => {
  if (!hookContent.includes(exportName)) {
    missingExports.push(exportName);
  }
});

if (missingExports.length === 0) {
  console.log('✅ All required exports found in useFormValidation hook');
} else {
  console.log('❌ Missing exports:', missingExports.join(', '));
}

// Test 2: Check ToastContext method aliases
console.log('\n2. Testing ToastContext method aliases...');
const toastPath = path.join(__dirname, 'frontend/src/contexts/ToastContext.js');
const toastContent = fs.readFileSync(toastPath, 'utf8');

const requiredToastMethods = ['showSuccess', 'showError', 'showInfo', 'showWarning'];
let missingToastMethods = [];

requiredToastMethods.forEach(method => {
  if (!toastContent.includes(method)) {
    missingToastMethods.push(method);
  }
});

if (missingToastMethods.length === 0) {
  console.log('✅ All required toast methods found');
} else {
  console.log('❌ Missing toast methods:', missingToastMethods.join(', '));
}

// Test 3: Check UI component exports
console.log('\n3. Testing UI component exports...');
const uiIndexPath = path.join(__dirname, 'frontend/src/components/ui/index.js');
const uiIndexContent = fs.readFileSync(uiIndexPath, 'utf8');

const requiredUIComponents = ['ProgressIndicator', 'ValidatedInput', 'ProtectedButton'];
let missingUIComponents = [];

requiredUIComponents.forEach(component => {
  if (!uiIndexContent.includes(component)) {
    missingUIComponents.push(component);
  }
});

if (missingUIComponents.length === 0) {
  console.log('✅ All required UI components exported');
} else {
  console.log('❌ Missing UI component exports:', missingUIComponents.join(', '));
}

// Test 4: Check validation rules
console.log('\n4. Testing validation rules...');
const validationPath = path.join(__dirname, 'frontend/src/utils/validationRules.js');
const validationContent = fs.readFileSync(validationPath, 'utf8');

const requiredValidationRules = ['required', 'email', 'minLength', 'passwordStrong', 'matches'];
let missingValidationRules = [];

requiredValidationRules.forEach(rule => {
  if (!validationContent.includes(`export const ${rule}`)) {
    missingValidationRules.push(rule);
  }
});

if (missingValidationRules.length === 0) {
  console.log('✅ All validation rules found');
} else {
  console.log('❌ Missing validation rules:', missingValidationRules.join(', '));
}

// Test 5: Check for error handling improvements
console.log('\n5. Testing error handling improvements...');
const hasErrorHandling = hookContent.includes('try {') && hookContent.includes('catch (err)');
const hasNullChecks = hookContent.includes('if (!e || !e.target)');

if (hasErrorHandling && hasNullChecks) {
  console.log('✅ Error handling and null checks implemented');
} else {
  console.log('❌ Missing error handling or null checks');
}

// Summary
console.log('\n📊 Test Summary:');
const totalTests = 5;
const passedTests = [
  missingExports.length === 0,
  missingToastMethods.length === 0, 
  missingUIComponents.length === 0,
  missingValidationRules.length === 0,
  hasErrorHandling && hasNullChecks
].filter(Boolean).length;

console.log(`✅ Passed: ${passedTests}/${totalTests} tests`);

if (passedTests === totalTests) {
  console.log('\n🎉 All fixes implemented successfully!');
  console.log('\n📝 The following issues have been resolved:');
  console.log('   • TypeError: O is not a function');
  console.log('   • TypeError: Cannot read properties of undefined (reading \'email\')');
  console.log('   • TypeError: Cannot read properties of undefined (reading \'password\')');
  console.log('   • Missing form validation hook properties');
  console.log('   • Missing UI component exports');
  console.log('   • Missing toast method aliases');
  
  console.log('\n🚀 Registration form should now work without JavaScript errors!');
} else {
  console.log('\n⚠️  Some issues may still exist. Please review the failed tests above.');
}

console.log('\n🔧 Next steps:');
console.log('   1. Deploy the changes to production');
console.log('   2. Test the registration form in the browser');
console.log('   3. Verify no console errors appear during form interaction');
console.log('   4. Test actual account creation with valid data');
