const https = require('https');

console.log('🔐 TESTING COMPLETE LOGIN FLOW');
console.log('==============================\n');

async function makeRequest(method, path, data = null, headers = {}) {
    try {
        const url = new URL(path, 'https://app.floworx-iq.com');
        
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'https://app.floworx-iq.com',
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
            req.setTimeout(15000, () => reject(new Error('Timeout')));
            
            if (data) {
                req.write(JSON.stringify(data));
            }
            req.end();
        });

        return response;
        
    } catch (error) {
        console.log(`   Error: ${error.message}`);
        return null;
    }
}

async function testCompleteLoginFlow() {
    console.log('📍 Testing Complete Authentication Flow');
    console.log('─'.repeat(50));
    
    // Step 1: Create a test user
    const testEmail = `test-login-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    
    console.log('1️⃣ Creating test user account:');
    console.log(`   Email: ${testEmail}`);
    console.log(`   Password: ${testPassword}`);
    
    const registerResponse = await makeRequest('POST', '/api/auth/register', {
        firstName: 'Test',
        lastName: 'User',
        email: testEmail,
        password: testPassword,
        companyName: 'Test Company',
        agreeToTerms: true
    });
    
    if (registerResponse) {
        console.log(`   Registration Status: ${registerResponse.status}`);
        console.log(`   Registration Response: ${JSON.stringify(registerResponse.data, null, 2)}`);
        
        if (registerResponse.status === 201 && registerResponse.data.token) {
            console.log('   ✅ Registration successful with token!');
            
            // Step 2: Test authenticated endpoints with the token
            const authToken = registerResponse.data.token;
            console.log(`   Token: ${authToken.substring(0, 20)}...`);
            
            console.log('\n2️⃣ Testing authenticated endpoints:');
            
            // Test user status
            const userStatusResponse = await makeRequest('GET', '/api/user/status', null, {
                'Authorization': `Bearer ${authToken}`
            });
            
            if (userStatusResponse) {
                console.log(`   User Status: ${userStatusResponse.status}`);
                console.log(`   User Data: ${JSON.stringify(userStatusResponse.data, null, 2)}`);
            }
            
            // Test onboarding status
            const onboardingResponse = await makeRequest('GET', '/api/onboarding/status', null, {
                'Authorization': `Bearer ${authToken}`
            });
            
            if (onboardingResponse) {
                console.log(`   Onboarding Status: ${onboardingResponse.status}`);
                console.log(`   Onboarding Data: ${JSON.stringify(onboardingResponse.data, null, 2)}`);
            }
            
            // Test dashboard
            const dashboardResponse = await makeRequest('GET', '/api/dashboard', null, {
                'Authorization': `Bearer ${authToken}`
            });
            
            if (dashboardResponse) {
                console.log(`   Dashboard Status: ${dashboardResponse.status}`);
                console.log(`   Dashboard Data: ${JSON.stringify(dashboardResponse.data, null, 2)}`);
            }
            
        } else if (registerResponse.status === 409) {
            console.log('   ℹ️ User already exists, trying to login...');
            
            // Step 3: Try to login with existing user
            console.log('\n3️⃣ Testing login with existing credentials:');
            
            const loginResponse = await makeRequest('POST', '/api/auth/login', {
                email: testEmail,
                password: testPassword
            });
            
            if (loginResponse) {
                console.log(`   Login Status: ${loginResponse.status}`);
                console.log(`   Login Response: ${JSON.stringify(loginResponse.data, null, 2)}`);
                
                if (loginResponse.status === 200 && loginResponse.data.token) {
                    console.log('   ✅ Login successful with token!');
                    
                    const authToken = loginResponse.data.token;
                    console.log(`   Token: ${authToken.substring(0, 20)}...`);
                    
                    // Test authenticated endpoints
                    console.log('\n4️⃣ Testing authenticated endpoints after login:');
                    
                    const userStatusResponse = await makeRequest('GET', '/api/user/status', null, {
                        'Authorization': `Bearer ${authToken}`
                    });
                    
                    if (userStatusResponse) {
                        console.log(`   User Status: ${userStatusResponse.status}`);
                        if (userStatusResponse.status === 200) {
                            console.log('   ✅ User status endpoint working!');
                        }
                    }
                    
                    const dashboardResponse = await makeRequest('GET', '/api/dashboard', null, {
                        'Authorization': `Bearer ${authToken}`
                    });
                    
                    if (dashboardResponse) {
                        console.log(`   Dashboard Status: ${dashboardResponse.status}`);
                        if (dashboardResponse.status === 200) {
                            console.log('   ✅ Dashboard endpoint working!');
                        }
                    }
                }
            }
        }
    }
    
    console.log('\n🎯 FLOW TEST COMPLETE');
    console.log('');
    console.log('💡 NEXT STEPS FOR USER:');
    console.log('1. Go to https://app.floworx-iq.com');
    console.log('2. Create an account or log in');
    console.log('3. The dashboard should load properly after authentication');
    console.log('');
    console.log('🔧 IF STILL HAVING ISSUES:');
    console.log('- Clear browser cache and cookies');
    console.log('- Check browser console for JavaScript errors');
    console.log('- Ensure JavaScript is enabled');
}

testCompleteLoginFlow().catch(console.error);
