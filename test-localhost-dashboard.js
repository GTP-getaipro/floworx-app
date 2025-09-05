// Test script to validate localhost:3000/dashboard
console.log('🧪 Testing Dashboard at http://localhost:3000/dashboard\n');

// This script can be run in the browser console to test dashboard elements
const testScript = `
console.log('🔍 DASHBOARD ELEMENT TESTING');
console.log('=' .repeat(50));

// Test 1: Check if dashboard container loads
const dashboardContainer = document.querySelector('[data-testid="dashboard-container"]');
console.log('1. Dashboard Container:', dashboardContainer ? '✅ Found' : '❌ Missing');

// Test 2: Check header elements
const dashboardHeader = document.querySelector('[data-testid="dashboard-header"]');
const dashboardTitle = document.querySelector('[data-testid="dashboard-title"]');
const welcomeMessage = document.querySelector('[data-testid="welcome-message"]');
const signOutButton = document.querySelector('[data-testid="sign-out-button"]');
const refreshButton = document.querySelector('[data-testid="refresh-dashboard-button"]');

console.log('2. Header Elements:');
console.log('   - Header:', dashboardHeader ? '✅ Found' : '❌ Missing');
console.log('   - Title:', dashboardTitle ? '✅ Found' : '❌ Missing');
console.log('   - Welcome:', welcomeMessage ? '✅ Found' : '❌ Missing');
console.log('   - Sign Out:', signOutButton ? '✅ Found' : '❌ Missing');
console.log('   - Refresh:', refreshButton ? '✅ Found' : '❌ Missing');

// Test 3: Check metrics cards
const emailsCard = document.querySelector('[data-testid="emails-processed-card"]');
const workflowsCard = document.querySelector('[data-testid="workflows-active-card"]');
const responseCard = document.querySelector('[data-testid="response-time-card"]');
const savingsCard = document.querySelector('[data-testid="automation-savings-card"]');

console.log('3. Metrics Cards:');
console.log('   - Emails Processed:', emailsCard ? '✅ Found' : '❌ Missing');
console.log('   - Workflows Active:', workflowsCard ? '✅ Found' : '❌ Missing');
console.log('   - Response Time:', responseCard ? '✅ Found' : '❌ Missing');
console.log('   - Automation Savings:', savingsCard ? '✅ Found' : '❌ Missing');

// Test 4: Check metrics values
const emailsCount = document.querySelector('[data-testid="emails-processed-count"]');
const workflowsCount = document.querySelector('[data-testid="workflows-active-count"]');

console.log('4. Metrics Values:');
console.log('   - Emails Count:', emailsCount ? \`✅ Found: \${emailsCount.textContent}\` : '❌ Missing');
console.log('   - Workflows Count:', workflowsCount ? \`✅ Found: \${workflowsCount.textContent}\` : '❌ Missing');

// Test 5: Check activity feed
const activityFeed = document.querySelector('[data-testid="activity-feed"]');
const activityTitle = document.querySelector('[data-testid="activity-feed-title"]');

console.log('5. Activity Feed:');
console.log('   - Feed Container:', activityFeed ? '✅ Found' : '❌ Missing');
console.log('   - Feed Title:', activityTitle ? '✅ Found' : '❌ Missing');

// Test 6: Check for loading states
const loadingSpinner = document.querySelector('[data-testid="loading-spinner"]');
const loadingText = document.querySelector('[data-testid="loading-text"]');

console.log('6. Loading States:');
console.log('   - Loading Spinner:', loadingSpinner ? '⚠️ Still Loading' : '✅ Not Loading');
console.log('   - Loading Text:', loadingText ? '⚠️ Still Loading' : '✅ Not Loading');

// Test 7: Check for error states
const errorAlert = document.querySelector('[data-testid="error-alert"]');
const successAlert = document.querySelector('[data-testid="success-alert"]');

console.log('7. Alert States:');
console.log('   - Error Alert:', errorAlert ? '⚠️ Error Present' : '✅ No Errors');
console.log('   - Success Alert:', successAlert ? '✅ Success Message' : '✅ No Success Message');

// Test 8: Check connection state
const connectedState = document.querySelector('[data-testid="connected-state"]');
const notConnectedState = document.querySelector('[data-testid="not-connected-state"]');

console.log('8. Connection State:');
console.log('   - Connected State:', connectedState ? '✅ Connected' : '❌ Not Connected');
console.log('   - Not Connected State:', notConnectedState ? '⚠️ Not Connected' : '✅ Connected');

// Summary
console.log('\\n📊 SUMMARY');
console.log('=' .repeat(50));
const allElements = [
  dashboardContainer, dashboardHeader, dashboardTitle, welcomeMessage, 
  signOutButton, refreshButton, emailsCard, workflowsCard, responseCard, 
  savingsCard, emailsCount, workflowsCount, activityFeed, activityTitle
];
const foundElements = allElements.filter(el => el !== null).length;
const totalElements = allElements.length;

console.log(\`Elements Found: \${foundElements}/\${totalElements}\`);
console.log(\`Success Rate: \${Math.round((foundElements/totalElements) * 100)}%\`);

if (foundElements === totalElements) {
  console.log('🎉 ALL TESTS PASSED! Dashboard is working correctly.');
} else {
  console.log('⚠️ Some elements are missing. Check the issues above.');
}
`;

console.log('📋 Instructions:');
console.log('1. Open http://localhost:3000/dashboard in your browser');
console.log('2. Open Developer Tools (F12)');
console.log('3. Go to the Console tab');
console.log('4. Copy and paste the following script:');
console.log('');
console.log('// Copy this entire script and paste it in the browser console:');
console.log(testScript);
