const https = require('https');

console.log('🔍 TESTING PREVIOUSLY MISSING ENDPOINTS');
console.log('=======================================\n');

async function testEndpoint(baseUrl, method, path, data = null) {
    try {
        const url = new URL(path, baseUrl);
        
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Origin': baseUrl
            }
        };

        if (data) {
            const postData = JSON.stringify(data);
            options.headers['Content-Length'] = Buffer.byteLength(postData);
        }

        const response = await new Promise((resolve, reject) => {
            const req = https.request(url, options, (res) => {
                let responseData = '';
                res.on('data', chunk => responseData += chunk);
                res.on('end', () => resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    data: responseData.substring(0, 200) + (responseData.length > 200 ? '...' : '')
                }));
            });
            
            req.on('error', reject);
            req.setTimeout(10000, () => reject(new Error('Timeout')));
            
            if (data) {
                req.write(JSON.stringify(data));
            }
            req.end();
        });

        const statusIcon = response.status === 200 ? '✅' : 
                          response.status === 401 ? '🔒' : 
                          response.status === 404 ? '❌' : '⚠️';
        
        console.log(`   ${method} ${path}: ${response.status} ${statusIcon}`);
        
        if (response.status === 404) {
            console.log(`      ❌ ENDPOINT NOT FOUND`);
        } else if (response.status === 200) {
            console.log(`      ✅ SUCCESS: ${response.data}`);
        } else if (response.status === 401) {
            console.log(`      🔒 AUTH REQUIRED (expected)`);
        }
        
        return response;
        
    } catch (error) {
        console.log(`   ${method} ${path}: ❌ ${error.message}`);
        return null;
    }
}

async function testAllEndpoints() {
    const baseUrl = 'https://app.floworx-iq.com';
    
    console.log(`📍 Testing endpoints on: ${baseUrl}`);
    console.log('─'.repeat(60));
    
    // Test the endpoints that were failing in the browser console
    console.log('\n1️⃣ Analytics Endpoints:');
    await testEndpoint(baseUrl, 'POST', '/api/analytics/onboarding/started', { 
        timestamp: new Date().toISOString(),
        source: 'test'
    });
    
    await testEndpoint(baseUrl, 'POST', '/api/analytics/onboarding/completed', { 
        timestamp: new Date().toISOString(),
        source: 'test'
    });
    
    await testEndpoint(baseUrl, 'POST', '/api/analytics/user/track', { 
        action: 'test_action',
        timestamp: new Date().toISOString()
    });
    
    console.log('\n2️⃣ Recovery/Session Endpoints:');
    await testEndpoint(baseUrl, 'GET', '/api/recovery/session');
    
    console.log('\n3️⃣ Core Authentication Endpoints:');
    await testEndpoint(baseUrl, 'POST', '/api/auth/login', {
        email: 'test@example.com',
        password: 'testpassword'
    });
    
    await testEndpoint(baseUrl, 'POST', '/api/auth/register', {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'TestPassword123',
        agreeToTerms: true
    });
    
    await testEndpoint(baseUrl, 'POST', '/api/auth/logout');
    
    console.log('\n4️⃣ User Management Endpoints:');
    await testEndpoint(baseUrl, 'GET', '/api/user/status');
    await testEndpoint(baseUrl, 'GET', '/api/user/profile');
    await testEndpoint(baseUrl, 'PUT', '/api/user/profile', {
        firstName: 'Updated',
        lastName: 'Name'
    });
    
    console.log('\n5️⃣ Onboarding Endpoints:');
    await testEndpoint(baseUrl, 'GET', '/api/onboarding/status');
    
    console.log('\n6️⃣ Dashboard & Analytics:');
    await testEndpoint(baseUrl, 'GET', '/api/dashboard');
    await testEndpoint(baseUrl, 'GET', '/api/analytics');
    
    console.log('\n7️⃣ OAuth Endpoints:');
    await testEndpoint(baseUrl, 'GET', '/api/oauth/google');
    await testEndpoint(baseUrl, 'GET', '/api/oauth/google/callback?code=test&state=test');
    
    console.log('\n8️⃣ Workflow Endpoints:');
    await testEndpoint(baseUrl, 'GET', '/api/workflows');
    
    console.log('\n9️⃣ Health & Test Endpoints:');
    await testEndpoint(baseUrl, 'GET', '/api/health');
    await testEndpoint(baseUrl, 'GET', '/api/health/db');
    await testEndpoint(baseUrl, 'GET', '/api/test');
    
    console.log('\n🎯 SUMMARY:');
    console.log('✅ = Working correctly');
    console.log('🔒 = Requires authentication (expected)');
    console.log('❌ = Not found (404) - needs to be implemented');
    console.log('⚠️ = Other error - needs investigation');
    console.log('\nIf all endpoints return 200/401 instead of 404, the API is complete!');
}

testAllEndpoints().catch(console.error);
