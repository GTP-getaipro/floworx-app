const https = require('https');

console.log('🔍 TESTING FORGOT PASSWORD API RESPONSES');
console.log('========================================\n');

async function testEndpoint(method, path, data = null) {
    try {
        const url = new URL(path, 'https://app.floworx-iq.com');
        
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'https://app.floworx-iq.com'
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
            
            if (data) {
                req.write(JSON.stringify(data));
            }
            req.end();
        });

        console.log(`${method} ${path}:`);
        console.log(`   Status: ${response.status}`);
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

async function testForgotPasswordAPI() {
    console.log('📍 Testing Forgot Password API Endpoints');
    console.log('─'.repeat(50));
    
    // Test 1: Valid email
    console.log('1️⃣ Testing with valid email:');
    await testEndpoint('POST', '/api/auth/forgot-password', {
        email: 'test@example.com'
    });
    
    // Test 2: Missing email
    console.log('2️⃣ Testing with missing email:');
    await testEndpoint('POST', '/api/auth/forgot-password', {});
    
    // Test 3: Invalid email format
    console.log('3️⃣ Testing with invalid email format:');
    await testEndpoint('POST', '/api/auth/forgot-password', {
        email: 'invalid-email'
    });
    
    // Test 4: Token verification endpoints
    console.log('4️⃣ Testing token verification endpoints:');
    await testEndpoint('POST', '/api/auth/verify-reset-token', {});
    await testEndpoint('POST', '/api/auth/verify-reset-token', {
        token: 'invalid-token'
    });
    
    // Test 5: Password reset endpoints
    console.log('5️⃣ Testing password reset endpoints:');
    await testEndpoint('POST', '/api/auth/reset-password', {});
    await testEndpoint('POST', '/api/auth/reset-password', {
        token: 'invalid-token',
        newPassword: 'TestPassword123!'
    });
    
    // Test 6: Password requirements
    console.log('6️⃣ Testing password requirements:');
    await testEndpoint('GET', '/api/auth/password-requirements');
    
    console.log('🎯 ANALYSIS COMPLETE');
    console.log('Check the actual response formats above to fix the Cypress tests.');
}

testForgotPasswordAPI().catch(console.error);
