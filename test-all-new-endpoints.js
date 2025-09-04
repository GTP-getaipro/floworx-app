const https = require('https');

console.log('🔍 TESTING ALL NEW ENDPOINTS');
console.log('============================\n');

async function testEndpoint(baseUrl, method, path, data = null, headers = {}) {
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
                    data: responseData
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
                          response.status === 201 ? '✅' : 
                          response.status === 401 ? '🔒' : 
                          response.status === 404 ? '❌' : 
                          response.status === 501 ? '🚧' : '⚠️';
        
        console.log(`   ${method} ${path}: ${response.status} ${statusIcon}`);
        
        if (response.status === 200 || response.status === 201) {
            const preview = response.data.substring(0, 150);
            console.log(`      ✅ ${preview}${response.data.length > 150 ? '...' : ''}`);
        } else if (response.status === 401) {
            console.log(`      🔒 Authentication required (expected)`);
        } else if (response.status === 404) {
            console.log(`      ❌ Not found: ${response.data.substring(0, 100)}`);
        } else if (response.status === 501) {
            console.log(`      🚧 Not implemented: ${response.data.substring(0, 100)}`);
        } else {
            console.log(`      ⚠️ ${response.data.substring(0, 100)}`);
        }
        
        return response;
        
    } catch (error) {
        console.log(`   ${method} ${path}: ❌ ${error.message}`);
        return null;
    }
}

async function testAllNewEndpoints() {
    const baseUrl = 'https://app.floworx-iq.com';
    
    console.log(`📍 Testing all endpoints on: ${baseUrl}`);
    console.log('─'.repeat(60));
    
    console.log('\n1️⃣ New Analytics Endpoints:');
    await testEndpoint(baseUrl, 'POST', '/api/analytics/onboarding/started', { source: 'test' });
    await testEndpoint(baseUrl, 'POST', '/api/analytics/onboarding/completed', { source: 'test' });
    await testEndpoint(baseUrl, 'POST', '/api/analytics/user/track', { action: 'test' });
    
    console.log('\n2️⃣ Recovery/Session Endpoints:');
    await testEndpoint(baseUrl, 'GET', '/api/recovery/session');
    
    console.log('\n3️⃣ New API Status & Support:');
    await testEndpoint(baseUrl, 'GET', '/api/api/status');
    await testEndpoint(baseUrl, 'POST', '/api/support/contact', {
        name: 'Test User',
        email: 'test@example.com',
        subject: 'Test Subject',
        message: 'Test message'
    });
    
    console.log('\n4️⃣ User Preferences:');
    await testEndpoint(baseUrl, 'GET', '/api/user/preferences');
    await testEndpoint(baseUrl, 'PUT', '/api/user/preferences', {
        preferences: { theme: 'dark', notifications: { email: true } }
    });
    
    console.log('\n5️⃣ Notifications:');
    await testEndpoint(baseUrl, 'GET', '/api/notifications');
    
    console.log('\n6️⃣ Auth Refresh:');
    await testEndpoint(baseUrl, 'POST', '/api/auth/refresh', { refreshToken: 'test-token' });
    
    console.log('\n7️⃣ OAuth with Query Parameters (Fixed):');
    await testEndpoint(baseUrl, 'GET', '/api/oauth/google/callback?code=test123&state=abc456');
    
    console.log('\n8️⃣ Core Endpoints (Verification):');
    await testEndpoint(baseUrl, 'GET', '/api/health');
    await testEndpoint(baseUrl, 'GET', '/api/test');
    await testEndpoint(baseUrl, 'POST', '/api/auth/login', { 
        email: 'test@example.com', 
        password: 'testpass' 
    });
    
    console.log('\n🎯 ENDPOINT SUMMARY:');
    console.log('✅ = Working correctly (200/201)');
    console.log('🔒 = Requires authentication (401) - Expected');
    console.log('🚧 = Not implemented (501) - Placeholder');
    console.log('⚠️ = Other status - May need attention');
    console.log('❌ = Error or not found');
    console.log('\n🚀 All endpoints should now be available for the frontend!');
}

testAllNewEndpoints().catch(console.error);
