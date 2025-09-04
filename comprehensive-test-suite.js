const https = require('https');

console.log('🧪 COMPREHENSIVE TEST SUITE FOR FLOWORX');
console.log('=======================================');
console.log('Testing: app.floworx-iq.com');
console.log('Timestamp:', new Date().toISOString());
console.log('=' .repeat(50));

const BASE_URL = 'https://app.floworx-iq.com';
let testResults = {
    passed: 0,
    failed: 0,
    total: 0,
    details: []
};

async function makeRequest(method, path, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Origin': BASE_URL,
                'User-Agent': 'FloworX-Test-Suite/1.0',
                ...headers
            }
        };

        if (data) {
            const postData = JSON.stringify(data);
            options.headers['Content-Length'] = Buffer.byteLength(postData);
        }

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
        req.setTimeout(15000, () => reject(new Error('Request timeout')));
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

function logTest(testName, passed, details = '') {
    testResults.total++;
    if (passed) {
        testResults.passed++;
        console.log(`✅ ${testName}`);
    } else {
        testResults.failed++;
        console.log(`❌ ${testName}`);
    }
    if (details) {
        console.log(`   ${details}`);
    }
    testResults.details.push({ testName, passed, details });
}

async function testHealthEndpoints() {
    console.log('\n🏥 HEALTH & STATUS ENDPOINTS');
    console.log('-'.repeat(30));
    
    try {
        const health = await makeRequest('GET', '/api/health');
        logTest('Health endpoint', health.status === 200, `Status: ${health.status}`);
        
        const healthDb = await makeRequest('GET', '/api/health/db');
        logTest('Database health', healthDb.status === 200, `Status: ${healthDb.status}`);
        
        const apiStatus = await makeRequest('GET', '/api/api/status');
        logTest('API status endpoint', apiStatus.status === 200, `Status: ${apiStatus.status}`);
        
        const test = await makeRequest('GET', '/api/test');
        logTest('Test endpoint', test.status === 200 && test.data?.routes > 0, 
               `Status: ${test.status}, Routes: ${test.data?.routes || 'N/A'}`);
        
    } catch (error) {
        logTest('Health endpoints', false, `Error: ${error.message}`);
    }
}

async function testCORSHeaders() {
    console.log('\n🌐 CORS CONFIGURATION');
    console.log('-'.repeat(30));
    
    try {
        // Test preflight request
        const preflight = await makeRequest('OPTIONS', '/api/user/status', null, {
            'Origin': BASE_URL,
            'Access-Control-Request-Method': 'GET',
            'Access-Control-Request-Headers': 'Content-Type, Authorization'
        });
        
        const corsHeaders = {
            origin: preflight.headers['access-control-allow-origin'],
            methods: preflight.headers['access-control-allow-methods'],
            headers: preflight.headers['access-control-allow-headers'],
            credentials: preflight.headers['access-control-allow-credentials']
        };
        
        logTest('CORS preflight request', preflight.status === 200, `Status: ${preflight.status}`);
        logTest('CORS Allow-Origin header', !!corsHeaders.origin, `Origin: ${corsHeaders.origin}`);
        logTest('CORS Allow-Methods header', !!corsHeaders.methods, `Methods: ${corsHeaders.methods?.substring(0, 50)}...`);
        logTest('CORS Allow-Headers header', !!corsHeaders.headers, `Headers: ${corsHeaders.headers?.substring(0, 50)}...`);
        logTest('CORS Allow-Credentials', corsHeaders.credentials === 'true', `Credentials: ${corsHeaders.credentials}`);
        
    } catch (error) {
        logTest('CORS configuration', false, `Error: ${error.message}`);
    }
}

async function testAuthEndpoints() {
    console.log('\n🔐 AUTHENTICATION ENDPOINTS');
    console.log('-'.repeat(30));
    
    try {
        // Test login endpoint (should return 400/401 for invalid credentials)
        const login = await makeRequest('POST', '/api/auth/login', {
            email: 'test@example.com',
            password: 'invalidpassword'
        });
        logTest('Login endpoint exists', [400, 401].includes(login.status), 
               `Status: ${login.status} (${login.data?.error || 'No error message'})`);
        
        // Test registration endpoint
        const register = await makeRequest('POST', '/api/auth/register', {
            firstName: 'Test',
            lastName: 'User',
            email: 'test' + Date.now() + '@example.com',
            password: 'TestPassword123',
            agreeToTerms: true
        });
        logTest('Registration endpoint', [200, 201, 409].includes(register.status), 
               `Status: ${register.status}`);
        
        // Test logout endpoint
        const logout = await makeRequest('POST', '/api/auth/logout');
        logTest('Logout endpoint', logout.status === 200, `Status: ${logout.status}`);
        
        // Test password requirements
        const pwdReq = await makeRequest('GET', '/api/auth/password-requirements');
        logTest('Password requirements', pwdReq.status === 200, `Status: ${pwdReq.status}`);
        
        // Test token refresh (should return 501 - not implemented)
        const refresh = await makeRequest('POST', '/api/auth/refresh', { refreshToken: 'test' });
        logTest('Token refresh endpoint', refresh.status === 501, `Status: ${refresh.status}`);
        
    } catch (error) {
        logTest('Authentication endpoints', false, `Error: ${error.message}`);
    }
}

async function testProtectedEndpoints() {
    console.log('\n🔒 PROTECTED ENDPOINTS (Should require auth)');
    console.log('-'.repeat(30));
    
    const protectedEndpoints = [
        { method: 'GET', path: '/api/user/status', name: 'User status' },
        { method: 'GET', path: '/api/user/profile', name: 'User profile' },
        { method: 'GET', path: '/api/user/preferences', name: 'User preferences' },
        { method: 'GET', path: '/api/onboarding/status', name: 'Onboarding status' },
        { method: 'GET', path: '/api/dashboard', name: 'Dashboard' },
        { method: 'GET', path: '/api/analytics', name: 'Analytics' },
        { method: 'GET', path: '/api/workflows', name: 'Workflows' },
        { method: 'GET', path: '/api/notifications', name: 'Notifications' }
    ];
    
    for (const endpoint of protectedEndpoints) {
        try {
            const response = await makeRequest(endpoint.method, endpoint.path);
            logTest(`${endpoint.name} requires auth`, response.status === 401, 
                   `Status: ${response.status} (should be 401)`);
        } catch (error) {
            logTest(`${endpoint.name}`, false, `Error: ${error.message}`);
        }
    }
}

async function testAnalyticsEndpoints() {
    console.log('\n📊 ANALYTICS ENDPOINTS');
    console.log('-'.repeat(30));
    
    try {
        const onboardingStart = await makeRequest('POST', '/api/analytics/onboarding/started', {
            timestamp: new Date().toISOString(),
            source: 'test-suite'
        });
        logTest('Analytics onboarding start', onboardingStart.status === 200, 
               `Status: ${onboardingStart.status}`);
        
        const onboardingComplete = await makeRequest('POST', '/api/analytics/onboarding/completed', {
            timestamp: new Date().toISOString(),
            source: 'test-suite'
        });
        logTest('Analytics onboarding complete', onboardingComplete.status === 200, 
               `Status: ${onboardingComplete.status}`);
        
        const userTrack = await makeRequest('POST', '/api/analytics/user/track', {
            action: 'test_action',
            timestamp: new Date().toISOString()
        });
        logTest('Analytics user tracking', userTrack.status === 200, 
               `Status: ${userTrack.status}`);
        
    } catch (error) {
        logTest('Analytics endpoints', false, `Error: ${error.message}`);
    }
}

async function testOAuthEndpoints() {
    console.log('\n🔗 OAUTH ENDPOINTS');
    console.log('-'.repeat(30));
    
    try {
        const googleOAuth = await makeRequest('GET', '/api/oauth/google');
        logTest('Google OAuth initiation', [302, 200].includes(googleOAuth.status), 
               `Status: ${googleOAuth.status}`);
        
        const oauthCallback = await makeRequest('GET', '/api/oauth/google/callback?code=test123&state=abc456');
        logTest('OAuth callback with query params', [400, 401].includes(oauthCallback.status), 
               `Status: ${oauthCallback.status} (400/401 expected with test data)`);
        
    } catch (error) {
        logTest('OAuth endpoints', false, `Error: ${error.message}`);
    }
}

async function testSupportEndpoints() {
    console.log('\n🆘 SUPPORT ENDPOINTS');
    console.log('-'.repeat(30));
    
    try {
        const contact = await makeRequest('POST', '/api/support/contact', {
            name: 'Test User',
            email: 'test@example.com',
            subject: 'Test Support Request',
            message: 'This is a test message from the test suite.'
        });
        logTest('Support contact form', contact.status === 200, 
               `Status: ${contact.status}, Ticket: ${contact.data?.ticketId || 'N/A'}`);
        
    } catch (error) {
        logTest('Support endpoints', false, `Error: ${error.message}`);
    }
}

async function testRecoveryEndpoints() {
    console.log('\n🔄 RECOVERY ENDPOINTS');
    console.log('-'.repeat(30));
    
    try {
        const recovery = await makeRequest('GET', '/api/recovery/session');
        logTest('Session recovery endpoint', [200, 404].includes(recovery.status), 
               `Status: ${recovery.status} (404 expected when no session)`);
        
    } catch (error) {
        logTest('Recovery endpoints', false, `Error: ${error.message}`);
    }
}

async function runComprehensiveTests() {
    console.log('🚀 Starting comprehensive test suite...\n');
    
    await testHealthEndpoints();
    await testCORSHeaders();
    await testAuthEndpoints();
    await testProtectedEndpoints();
    await testAnalyticsEndpoints();
    await testOAuthEndpoints();
    await testSupportEndpoints();
    await testRecoveryEndpoints();
    
    console.log('\n' + '='.repeat(50));
    console.log('📋 TEST SUITE SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📊 Total:  ${testResults.total}`);
    console.log(`📈 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
    
    if (testResults.failed === 0) {
        console.log('\n🎉 ALL TESTS PASSED! FloworX is fully functional!');
    } else {
        console.log('\n⚠️  Some tests failed. Check the details above.');
    }
    
    console.log('\n🔗 Application URL: https://app.floworx-iq.com');
    console.log('📅 Test completed:', new Date().toISOString());
}

runComprehensiveTests().catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
});
