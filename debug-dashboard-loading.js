const https = require('https');

console.log('🔍 DEBUGGING DASHBOARD LOADING ISSUE');
console.log('===================================\n');

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
                            data: jsonData,
                            raw: responseData
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

        console.log(`${method} ${path}:`);
        console.log(`   Status: ${response.status}`);
        console.log(`   Headers: ${JSON.stringify({
            'content-type': response.headers['content-type'],
            'access-control-allow-origin': response.headers['access-control-allow-origin']
        }, null, 2)}`);
        console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
        console.log('');
        
        return response;
        
    } catch (error) {
        console.log(`${method} ${path}:`);
        console.log(`   Error: ${error.message}`);
        console.log('');
        return null;
    }
}

async function debugDashboardLoading() {
    console.log('📍 Testing Dashboard-Related Endpoints');
    console.log('─'.repeat(50));
    
    // Test 1: Check if onboarding status endpoint exists
    console.log('1️⃣ Testing onboarding status endpoint (without auth):');
    await testEndpoint('GET', '/api/onboarding/status');
    
    // Test 2: Check dashboard endpoint
    console.log('2️⃣ Testing dashboard endpoint (without auth):');
    await testEndpoint('GET', '/api/dashboard');
    
    // Test 3: Check user status endpoint
    console.log('3️⃣ Testing user status endpoint (without auth):');
    await testEndpoint('GET', '/api/user/status');
    
    // Test 4: Check if there are any other onboarding-related endpoints
    console.log('4️⃣ Testing other potential onboarding endpoints:');
    await testEndpoint('GET', '/api/onboarding');
    await testEndpoint('GET', '/api/onboarding/progress');
    await testEndpoint('GET', '/api/user/onboarding');
    
    // Test 5: Check health endpoints to ensure API is working
    console.log('5️⃣ Testing health endpoints:');
    await testEndpoint('GET', '/api/health');
    await testEndpoint('GET', '/api/test');
    
    // Test 6: Test with a mock auth token
    console.log('6️⃣ Testing with mock authorization header:');
    const mockToken = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';
    await testEndpoint('GET', '/api/onboarding/status', {
        'Authorization': mockToken
    });
    
    await testEndpoint('GET', '/api/dashboard', {
        'Authorization': mockToken
    });
    
    console.log('🎯 DEBUGGING COMPLETE');
    console.log('Check the responses above to identify the issue.');
    console.log('');
    console.log('💡 COMMON ISSUES:');
    console.log('- 401 errors = Authentication required (expected)');
    console.log('- 404 errors = Endpoint missing');
    console.log('- 500 errors = Server error');
    console.log('- Timeout = Network/server issue');
}

debugDashboardLoading().catch(console.error);
