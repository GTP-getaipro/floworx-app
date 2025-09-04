const https = require('https');

console.log('🔍 DEBUGGING NETWORK ERRORS FROM BROWSER');
console.log('========================================\n');

async function testEndpoint(method, path, headers = {}) {
    try {
        const url = new URL(path, 'https://app.floworx-iq.com');
        
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'https://app.floworx-iq.com',
                'User-Agent': 'FloworX-Debug/1.0',
                ...headers
            }
        };

        const response = await new Promise((resolve, reject) => {
            const req = https.request(url, options, (res) => {
                let responseData = '';
                res.on('data', chunk => responseData += chunk);
                res.on('end', () => {
                    try {
                        const jsonData = JSON.parse(responseData);
                        resolve({
                            status: res.statusCode,
                            headers: res.headers,
                            data: jsonData
                        });
                    } catch (e) {
                        resolve({
                            status: res.statusCode,
                            headers: res.headers,
                            data: null,
                            raw: responseData
                        });
                    }
                });
            });
            
            req.on('error', reject);
            req.setTimeout(10000, () => reject(new Error('Timeout')));
            req.end();
        });

        const statusIcon = response.status === 200 ? '✅' : 
                          response.status === 401 ? '🔒' : 
                          response.status === 404 ? '❌' : '⚠️';
        
        console.log(`${statusIcon} ${method} ${path}: ${response.status}`);
        
        if (response.status === 404) {
            console.log(`   ❌ MISSING ENDPOINT - needs to be added`);
        } else if (response.status === 401) {
            console.log(`   🔒 AUTH REQUIRED (expected)`);
        } else if (response.status === 200) {
            console.log(`   ✅ WORKING`);
        } else {
            console.log(`   ⚠️ Status: ${response.status}`);
        }
        
        return response;
        
    } catch (error) {
        console.log(`❌ ${method} ${path}: ERROR - ${error.message}`);
        return null;
    }
}

async function debugNetworkErrors() {
    console.log('📍 Testing All Endpoints That Might Be Called by Frontend');
    console.log('─'.repeat(60));
    
    // Test all possible endpoints that the frontend might be calling
    const endpointsToTest = [
        // Core dashboard endpoints
        { method: 'GET', path: '/api/dashboard' },
        { method: 'GET', path: '/api/user/status' },
        { method: 'GET', path: '/api/onboarding/status' },
        
        // Analytics endpoints (these might be causing 404s)
        { method: 'GET', path: '/api/analytics' },
        { method: 'GET', path: '/api/analytics/dashboard' },
        { method: 'GET', path: '/api/analytics/onboarding' },
        { method: 'GET', path: '/api/analytics/user' },
        { method: 'POST', path: '/api/analytics/track' },
        { method: 'POST', path: '/api/analytics/onboarding/started' },
        { method: 'POST', path: '/api/analytics/onboarding/completed' },
        { method: 'POST', path: '/api/analytics/user/track' },
        
        // User management endpoints
        { method: 'GET', path: '/api/user/profile' },
        { method: 'GET', path: '/api/user/preferences' },
        { method: 'GET', path: '/api/user/settings' },
        
        // Onboarding related endpoints
        { method: 'GET', path: '/api/onboarding' },
        { method: 'GET', path: '/api/onboarding/progress' },
        { method: 'GET', path: '/api/onboarding/steps' },
        { method: 'POST', path: '/api/onboarding/complete' },
        
        // Workflow endpoints
        { method: 'GET', path: '/api/workflows' },
        { method: 'GET', path: '/api/workflows/status' },
        
        // OAuth endpoints
        { method: 'GET', path: '/api/oauth/google' },
        { method: 'GET', path: '/api/oauth/status' },
        
        // Notification endpoints
        { method: 'GET', path: '/api/notifications' },
        { method: 'GET', path: '/api/notifications/unread' },
        
        // Settings endpoints
        { method: 'GET', path: '/api/settings' },
        { method: 'GET', path: '/api/settings/business' },
        
        // Health endpoints (should work)
        { method: 'GET', path: '/api/health' },
        { method: 'GET', path: '/api/test' }
    ];
    
    console.log('Testing endpoints without authentication (expecting 401 for protected endpoints):');
    console.log('');
    
    for (const endpoint of endpointsToTest) {
        await testEndpoint(endpoint.method, endpoint.path);
    }
    
    console.log('\n🎯 SUMMARY:');
    console.log('✅ = Working (200)');
    console.log('🔒 = Auth required (401) - Expected for protected endpoints');
    console.log('❌ = Not found (404) - These endpoints need to be added');
    console.log('⚠️ = Other status - May need investigation');
    
    console.log('\n💡 NEXT STEPS:');
    console.log('1. Add any missing endpoints that show ❌ (404 errors)');
    console.log('2. Ensure frontend is handling 401 errors properly');
    console.log('3. Check that authentication tokens are being sent correctly');
}

debugNetworkErrors().catch(console.error);
