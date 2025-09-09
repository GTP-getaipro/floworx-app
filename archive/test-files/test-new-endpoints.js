const https = require('https');

console.log('🔍 TESTING NEWLY ADDED ENDPOINTS');
console.log('================================\n');

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
            console.log(`   ❌ STILL MISSING - endpoint not found`);
        } else if (response.status === 401) {
            console.log(`   🔒 AUTH REQUIRED (good - endpoint exists)`);
        } else if (response.status === 200) {
            console.log(`   ✅ WORKING PERFECTLY`);
        } else {
            console.log(`   ⚠️ Status: ${response.status}`);
        }
        
        return response;
        
    } catch (error) {
        console.log(`❌ ${method} ${path}: ERROR - ${error.message}`);
        return null;
    }
}

async function testNewEndpoints() {
    console.log('📍 Testing Newly Added Endpoints (Should Now Return 401 Instead of 404)');
    console.log('─'.repeat(70));
    
    // Test the endpoints that were previously returning 404
    const newEndpoints = [
        // Analytics endpoints
        { method: 'GET', path: '/api/analytics/dashboard' },
        { method: 'GET', path: '/api/analytics/onboarding' },
        { method: 'GET', path: '/api/analytics/user' },
        { method: 'POST', path: '/api/analytics/track' },
        
        // Onboarding endpoints
        { method: 'GET', path: '/api/onboarding' },
        { method: 'GET', path: '/api/onboarding/progress' },
        { method: 'GET', path: '/api/onboarding/steps' },
        { method: 'POST', path: '/api/onboarding/complete' },
        
        // User settings
        { method: 'GET', path: '/api/user/settings' },
        
        // Workflow status
        { method: 'GET', path: '/api/workflows/status' },
        
        // OAuth status
        { method: 'GET', path: '/api/oauth/status' },
        
        // Notifications
        { method: 'GET', path: '/api/notifications/unread' },
        
        // Settings
        { method: 'GET', path: '/api/settings' },
        { method: 'GET', path: '/api/settings/business' }
    ];
    
    console.log('Testing endpoints without authentication:');
    console.log('(Should return 401 for protected endpoints, not 404)');
    console.log('');
    
    for (const endpoint of newEndpoints) {
        await testEndpoint(endpoint.method, endpoint.path);
    }
    
    console.log('\n🎯 EXPECTED RESULTS:');
    console.log('✅ = Working (200) - For non-protected endpoints');
    console.log('🔒 = Auth required (401) - GOOD! Endpoint exists but needs auth');
    console.log('❌ = Not found (404) - BAD! Endpoint still missing');
    console.log('⚠️ = Other status - May need investigation');
    
    console.log('\n💡 SUCCESS CRITERIA:');
    console.log('- All endpoints should return 401 (not 404)');
    console.log('- This means the endpoints exist and are properly protected');
    console.log('- The dashboard loading issue should be resolved');
}

testNewEndpoints().catch(console.error);
