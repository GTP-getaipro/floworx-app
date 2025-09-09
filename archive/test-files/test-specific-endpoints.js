const https = require('https');

console.log('🔍 TESTING SPECIFIC PROBLEMATIC ENDPOINTS');
console.log('=========================================\n');

async function testEndpoint(baseUrl, method, path, headers = {}) {
    try {
        const url = new URL(path, baseUrl);
        
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Origin': baseUrl,
                ...headers
            }
        };

        const response = await new Promise((resolve, reject) => {
            const req = https.request(url, options, (res) => {
                let responseData = '';
                res.on('data', chunk => responseData += chunk);
                res.on('end', () => resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    data: responseData
                }));
            });
            
            req.on('error', reject);
            req.setTimeout(10000, () => reject(new Error('Timeout')));
            req.end();
        });

        console.log(`${method} ${path}:`);
        console.log(`   Status: ${response.status}`);
        console.log(`   Response: ${response.data.substring(0, 300)}${response.data.length > 300 ? '...' : ''}`);
        console.log('');
        
        return response;
        
    } catch (error) {
        console.log(`${method} ${path}:`);
        console.log(`   Error: ${error.message}`);
        console.log('');
        return null;
    }
}

async function testProblematicEndpoints() {
    const baseUrl = 'https://app.floworx-iq.com';
    
    console.log(`📍 Testing on: ${baseUrl}`);
    console.log('─'.repeat(50));
    
    // Test recovery/session endpoint
    console.log('1️⃣ Recovery Session Endpoint:');
    await testEndpoint(baseUrl, 'GET', '/api/recovery/session');
    
    // Test OAuth callback with different variations
    console.log('2️⃣ OAuth Callback Endpoints:');
    await testEndpoint(baseUrl, 'GET', '/api/oauth/google/callback');
    await testEndpoint(baseUrl, 'GET', '/api/oauth/google/callback?code=test123');
    await testEndpoint(baseUrl, 'GET', '/api/oauth/google/callback?code=test123&state=abc');
    
    // Test with authentication header
    console.log('3️⃣ Recovery Session with Auth Token:');
    const testToken = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';
    await testEndpoint(baseUrl, 'GET', '/api/recovery/session', {
        'Authorization': testToken
    });
    
    // Test route variations
    console.log('4️⃣ Route Variations:');
    await testEndpoint(baseUrl, 'GET', '/recovery/session');  // Without /api prefix
    await testEndpoint(baseUrl, 'GET', '/oauth/google/callback'); // Without /api prefix
    
    console.log('5️⃣ Check Available Routes:');
    await testEndpoint(baseUrl, 'GET', '/api/test'); // This should show total routes count
}

testProblematicEndpoints().catch(console.error);
