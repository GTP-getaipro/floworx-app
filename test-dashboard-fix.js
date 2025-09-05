// TEST SCRIPT TO VERIFY DASHBOARD LOADING FIX
// Copy and paste this into browser console on the dashboard page

console.log('🔧 TESTING DASHBOARD LOADING FIX');
console.log('================================');

// Check if we have a token
const token = localStorage.getItem('floworx_token');
console.log('Token exists:', !!token);

if (!token) {
    console.log('❌ No token - redirecting to login');
    window.location.href = '/login';
} else {
    console.log('✅ Token found - testing improved dashboard loading...');
    
    // Monitor the dashboard loading process
    let loadingStartTime = Date.now();
    
    // Check loading state every second
    const checkLoadingInterval = setInterval(() => {
        const loadingElements = document.querySelectorAll('[data-testid="loading-spinner"], .animate-spin');
        const loadingTime = (Date.now() - loadingStartTime) / 1000;
        
        console.log(`⏱️ Loading time: ${loadingTime.toFixed(1)}s - Loading elements: ${loadingElements.length}`);
        
        if (loadingElements.length === 0) {
            console.log('✅ Dashboard loaded successfully!');
            clearInterval(checkLoadingInterval);
            
            // Check what's showing
            const onboardingElements = document.querySelectorAll('[class*="onboarding"], [class*="wizard"]');
            const dashboardElements = document.querySelectorAll('[data-testid="dashboard-content"]');
            const errorElements = document.querySelectorAll('[data-testid="error-alert"]');
            
            if (onboardingElements.length > 0) {
                console.log('🎯 Onboarding wizard is showing (correct behavior)');
            } else if (dashboardElements.length > 0) {
                console.log('🎯 Dashboard content is showing (correct behavior)');
            } else if (errorElements.length > 0) {
                console.log('⚠️ Error message is showing');
                console.log('Error content:', Array.from(errorElements).map(el => el.textContent));
            } else {
                console.log('❓ Unknown state - check page content');
            }
        }
        
        // Stop checking after 15 seconds
        if (loadingTime > 15) {
            console.log('❌ Loading took too long - there may still be an issue');
            clearInterval(checkLoadingInterval);
        }
    }, 1000);
    
    // Also test the API endpoints directly
    setTimeout(async () => {
        console.log('\n🧪 Testing API endpoints directly...');
        
        try {
            const headers = { Authorization: `Bearer ${token}` };
            
            // Test user status
            console.log('Testing /api/user/status...');
            const userRes = await fetch('/api/user/status', { headers });
            console.log('User status:', userRes.status, userRes.ok ? '✅' : '❌');
            
            // Test onboarding status with timeout
            console.log('Testing /api/onboarding/status...');
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            const onboardingRes = await fetch('/api/onboarding/status', { 
                headers,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            console.log('Onboarding status:', onboardingRes.status, onboardingRes.ok ? '✅' : '❌');
            
            if (onboardingRes.ok) {
                const data = await onboardingRes.json();
                console.log('Onboarding completed:', data.user?.onboardingCompleted);
                console.log('Next step:', data.nextStep);
            }
            
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('❌ Onboarding API still timing out');
            } else {
                console.log('❌ API test error:', error.message);
            }
        }
    }, 2000);
}

console.log('\n💡 If loading still hangs, try:');
console.log('1. Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R)');
console.log('2. Clear cache and reload');
console.log('3. Check browser console for errors');
