// LIVE BROWSER DEBUG SCRIPT FOR DASHBOARD LOADING ISSUE
// Copy and paste this entire script into the browser console while on the dashboard page

console.log('🔍 FLOWORX DASHBOARD DEBUG SCRIPT');
console.log('================================');

// 1. Check current page state
console.log('\n📍 CURRENT PAGE STATE:');
console.log('URL:', window.location.href);
console.log('Title:', document.title);
console.log('Loading elements:', document.querySelectorAll('[class*="loading"], [class*="spinner"]').length);

// 2. Check for authentication (correct token key)
console.log('\n🔐 AUTHENTICATION CHECK:');
const token = localStorage.getItem('floworx_token') || sessionStorage.getItem('floworx_token');
console.log('Floworx token exists:', !!token);
if (token) {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('Token payload:', payload);
        console.log('Token expired:', payload.exp < Date.now() / 1000);
        console.log('Token user ID:', payload.userId);
        console.log('Token email:', payload.email);
    } catch (e) {
        console.log('Token parse error:', e.message);
    }
} else {
    console.log('❌ NO TOKEN FOUND - This is likely the issue!');
}

// 3. Check React/app state
console.log('\n⚛️ REACT STATE CHECK:');
const reactRoot = document.querySelector('#root');
console.log('React root exists:', !!reactRoot);
console.log('React root content length:', reactRoot?.innerHTML?.length || 0);

// 4. Check for JavaScript errors
console.log('\n❌ ERROR MONITORING:');
let errorCount = 0;
const originalError = console.error;
console.error = function(...args) {
    errorCount++;
    console.log(`🚨 Error #${errorCount}:`, ...args);
    originalError.apply(console, args);
};

// 5. Monitor network requests
console.log('\n🌐 NETWORK MONITORING:');
let requestCount = 0;
const originalFetch = window.fetch;
window.fetch = function(...args) {
    requestCount++;
    const url = args[0];
    console.log(`📡 Request #${requestCount}:`, url);
    
    return originalFetch.apply(this, args)
        .then(response => {
            console.log(`✅ Response #${requestCount}:`, response.status, url);
            return response;
        })
        .catch(error => {
            console.log(`❌ Request failed #${requestCount}:`, error.message, url);
            throw error;
        });
};

// 6. Check for infinite loops or stuck promises
console.log('\n🔄 ASYNC OPERATION MONITORING:');
let promiseCount = 0;
const originalThen = Promise.prototype.then;
Promise.prototype.then = function(...args) {
    promiseCount++;
    if (promiseCount % 10 === 0) {
        console.log(`🔄 Promise operations: ${promiseCount}`);
    }
    return originalThen.apply(this, args);
};

// 7. Check specific dashboard elements
console.log('\n🎛️ DASHBOARD ELEMENTS CHECK:');
setTimeout(() => {
    console.log('Dashboard container:', document.querySelector('[class*="dashboard"]'));
    console.log('Loading spinner:', document.querySelector('[class*="loading"], [class*="spinner"]'));
    console.log('Error messages:', document.querySelectorAll('[class*="error"]').length);
    console.log('Main content:', document.querySelector('main, [role="main"]'));
}, 1000);

// 8. Check for stuck API calls
console.log('\n⏱️ API CALL TIMEOUT CHECK:');
setTimeout(() => {
    console.log(`Total requests made: ${requestCount}`);
    console.log(`Total promise operations: ${promiseCount}`);
    console.log(`Total errors: ${errorCount}`);
    
    // Check if still loading
    const stillLoading = document.querySelector('[class*="loading"], [class*="spinner"]');
    if (stillLoading) {
        console.log('🚨 STILL LOADING AFTER 5 SECONDS - POTENTIAL ISSUE');
        console.log('Loading element:', stillLoading);
        console.log('Loading element text:', stillLoading.textContent);
    }
}, 5000);

// 9. Manual API test
console.log('\n🧪 MANUAL API TEST:');
async function testDashboardAPI() {
    try {
        const headers = {};
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        console.log('Testing /api/auth/verify...');
        const verifyResponse = await fetch('/api/auth/verify', { headers });
        const verifyData = await verifyResponse.json();
        console.log('Auth verify response:', verifyResponse.status, verifyData);

        console.log('Testing /api/user/status...');
        const userResponse = await fetch('/api/user/status', { headers });
        const userData = await userResponse.json();
        console.log('User status response:', userResponse.status, userData);

        console.log('Testing /api/onboarding/status...');
        const onboardingResponse = await fetch('/api/onboarding/status', { headers });
        const onboardingData = await onboardingResponse.json();
        console.log('Onboarding status response:', onboardingResponse.status, onboardingData);

        if (verifyResponse.status === 401 || userResponse.status === 401) {
            console.log('🚨 AUTHENTICATION REQUIRED - User needs to log in');
            console.log('💡 Try logging in again or clearing localStorage and re-authenticating');
        }

    } catch (error) {
        console.log('API test error:', error);
    }
}

testDashboardAPI();

// 10. Check for React errors
console.log('\n⚛️ REACT ERROR BOUNDARY CHECK:');
setTimeout(() => {
    const errorBoundary = document.querySelector('[class*="error-boundary"], [class*="error-fallback"]');
    if (errorBoundary) {
        console.log('🚨 REACT ERROR BOUNDARY DETECTED:', errorBoundary.textContent);
    }
}, 2000);

console.log('\n✅ Debug script loaded! Watch the console for real-time updates...');
console.log('💡 If you see continuous loading, check the network tab for failed requests.');
console.log('💡 If authentication is required, you may need to log in first.');
