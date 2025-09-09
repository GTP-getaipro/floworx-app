// SPECIFIC TEST FOR ONBOARDING ENDPOINT
// Copy and paste this into browser console to test the hanging onboarding call

console.log('🔍 TESTING ONBOARDING ENDPOINT SPECIFICALLY');

const token = localStorage.getItem('floworx_token');

if (!token) {
    console.log('❌ No token found');
} else {
    console.log('✅ Token found, testing onboarding endpoint with timeout...');
    
    async function testOnboardingWithTimeout() {
        try {
            const headers = { Authorization: `Bearer ${token}` };
            
            console.log('🔍 Starting onboarding status call...');
            console.time('onboarding-call');
            
            // Add a timeout to the fetch call
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            const onboardingRes = await fetch('/api/onboarding/status', { 
                headers,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            console.timeEnd('onboarding-call');
            
            if (onboardingRes.ok) {
                const onboardingData = await onboardingRes.json();
                console.log('✅ Onboarding status SUCCESS:', onboardingRes.status, onboardingData);
                
                // Check if this would cause the dashboard to show onboarding
                if (!onboardingData.user.onboardingCompleted) {
                    console.log('🎯 FOUND THE ISSUE: User onboarding not completed');
                    console.log('📋 Next step:', onboardingData.nextStep);
                    console.log('💡 Dashboard should show onboarding wizard, not loading screen');
                } else {
                    console.log('✅ User onboarding is completed');
                }
            } else {
                const errorData = await onboardingRes.json();
                console.log('❌ Onboarding status FAILED:', onboardingRes.status, errorData);
            }
            
        } catch (error) {
            console.timeEnd('onboarding-call');
            if (error.name === 'AbortError') {
                console.log('❌ ONBOARDING CALL TIMED OUT after 10 seconds');
                console.log('💡 This is likely causing the infinite loading');
                console.log('🔧 The endpoint is probably hanging due to database issues');
            } else {
                console.log('❌ Onboarding call error:', error);
            }
        }
    }
    
    testOnboardingWithTimeout();
}

// Also check what the Dashboard component is actually doing
setTimeout(() => {
    console.log('🔍 Checking Dashboard component state...');
    
    // Look for loading indicators
    const loadingSpinners = document.querySelectorAll('[data-testid="loading-spinner"], .animate-spin');
    const loadingText = document.querySelectorAll('[data-testid="loading-text"]');
    
    console.log('Loading spinners found:', loadingSpinners.length);
    console.log('Loading text found:', loadingText.length);
    
    if (loadingText.length > 0) {
        console.log('Loading text content:', Array.from(loadingText).map(el => el.textContent));
    }
    
    // Check if onboarding wizard should be showing
    const onboardingElements = document.querySelectorAll('[class*="onboarding"], [class*="wizard"]');
    console.log('Onboarding elements found:', onboardingElements.length);
    
}, 3000);
