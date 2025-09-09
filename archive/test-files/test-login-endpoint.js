const https = require('https');

console.log('🔍 TESTING LOGIN ENDPOINT SPECIFICALLY');
console.log('=====================================\n');

async function testLoginEndpoint(baseUrl) {
    console.log(`📍 Testing login at: ${baseUrl}`);
    console.log('─'.repeat(50));
    
    // Test 1: OPTIONS request (preflight)
    try {
        console.log('1️⃣ Testing OPTIONS (preflight) request...');
        
        const optionsResponse = await new Promise((resolve, reject) => {
            const url = new URL('/api/auth/login', baseUrl);
            
            const req = https.request(url, {
                method: 'OPTIONS',
                headers: {
                    'Origin': baseUrl,
                    'Access-Control-Request-Method': 'POST',
                    'Access-Control-Request-Headers': 'Content-Type, Authorization'
                }
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    data
                }));
            });
            
            req.on('error', reject);
            req.setTimeout(10000, () => reject(new Error('Timeout')));
            req.end();
        });
        
        console.log(`   OPTIONS /api/auth/login: ${optionsResponse.status} ${optionsResponse.status === 200 ? '✅' : '❌'}`);
        
        if (optionsResponse.status === 200) {
            console.log('   CORS Headers:');
            console.log(`      Access-Control-Allow-Origin: ${optionsResponse.headers['access-control-allow-origin']}`);
            console.log(`      Access-Control-Allow-Methods: ${optionsResponse.headers['access-control-allow-methods']}`);
            console.log(`      Access-Control-Allow-Headers: ${optionsResponse.headers['access-control-allow-headers']}`);
        }
        
    } catch (error) {
        console.log(`   OPTIONS /api/auth/login: ❌ ${error.message}`);
    }
    
    // Test 2: POST request (actual login attempt)
    try {
        console.log('\n2️⃣ Testing POST request (login attempt)...');
        
        const postData = JSON.stringify({
            email: 'test@example.com',
            password: 'testpassword'
        });
        
        const postResponse = await new Promise((resolve, reject) => {
            const url = new URL('/api/auth/login', baseUrl);
            
            const req = https.request(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Origin': baseUrl,
                    'Content-Length': Buffer.byteLength(postData)
                }
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    data: data.substring(0, 300) + (data.length > 300 ? '...' : '')
                }));
            });
            
            req.on('error', reject);
            req.setTimeout(10000, () => reject(new Error('Timeout')));
            req.write(postData);
            req.end();
        });
        
        console.log(`   POST /api/auth/login: ${postResponse.status} ${postResponse.status < 500 ? '✅' : '❌'}`);
        
        if (postResponse.status === 400 || postResponse.status === 401) {
            console.log('   ✅ Endpoint exists and responds (400/401 expected for invalid credentials)');
        } else if (postResponse.status === 404) {
            console.log('   ❌ Endpoint not found (404)');
        } else if (postResponse.status === 200) {
            console.log('   ✅ Login successful (unexpected with test credentials)');
        }
        
        console.log(`   Response preview: ${postResponse.data}`);
        
    } catch (error) {
        console.log(`   POST /api/auth/login: ❌ ${error.message}`);
    }
}

async function runTests() {
    const urls = [
        'https://app.floworx-iq.com',
        'https://floworx-2chgrxedy-floworxdevelopers-projects.vercel.app'
    ];
    
    for (const url of urls) {
        await testLoginEndpoint(url);
        console.log('\n');
    }
    
    console.log('🎯 SUMMARY:');
    console.log('- If OPTIONS returns 200, CORS preflight is working');
    console.log('- If POST returns 400/401, the endpoint exists and is working');
    console.log('- If POST returns 404, the endpoint routing is broken');
    console.log('- The CORS error should be resolved if both tests pass');
}

runTests().catch(console.error);
