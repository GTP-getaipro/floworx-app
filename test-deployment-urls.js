const https = require('https');

console.log('🔍 TESTING LATEST DEPLOYMENT URLS');
console.log('=================================\n');

const urls = [
    'https://app.floworx-iq.com',
    'https://floworx-q76fig8qk-floworxdevelopers-projects.vercel.app'
];

async function testURL(baseUrl) {
    console.log(`\n📍 Testing: ${baseUrl}`);
    console.log('─'.repeat(50));
    
    const endpoints = [
        '/api/health',
        '/api/user/status',
        '/api/onboarding/status'
    ];
    
    for (const endpoint of endpoints) {
        try {
            const url = new URL(endpoint, baseUrl);
            
            const response = await new Promise((resolve, reject) => {
                const req = https.request(url, { method: 'GET' }, (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => resolve({ 
                        status: res.statusCode, 
                        headers: res.headers, 
                        data: data.substring(0, 200) + (data.length > 200 ? '...' : '')
                    }));
                });
                req.on('error', reject);
                req.setTimeout(10000, () => reject(new Error('Timeout')));
                req.end();
            });
            
            console.log(`   ${endpoint}: ${response.status} ${response.status === 200 ? '✅' : response.status === 401 ? '🔒' : '❌'}`);
            
            // Check CORS headers
            const corsHeaders = [
                'access-control-allow-origin',
                'access-control-allow-methods',
                'access-control-allow-headers'
            ];
            
            const hasCors = corsHeaders.some(header => response.headers[header]);
            if (hasCors) {
                console.log(`      CORS: ✅ Headers present`);
            } else {
                console.log(`      CORS: ❌ No CORS headers`);
            }
            
        } catch (error) {
            console.log(`   ${endpoint}: ❌ ${error.message}`);
        }
    }
}

async function testCORSSpecifically(baseUrl) {
    console.log(`\n🔍 CORS Preflight Test: ${baseUrl}`);
    console.log('─'.repeat(50));
    
    try {
        const url = new URL('/api/user/status', baseUrl);
        
        const response = await new Promise((resolve, reject) => {
            const req = https.request(url, { 
                method: 'OPTIONS',
                headers: {
                    'Origin': 'https://app.floworx-iq.com',
                    'Access-Control-Request-Method': 'GET',
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
        
        console.log(`   OPTIONS request: ${response.status} ${response.status === 200 ? '✅' : '❌'}`);
        
        const corsHeaders = {
            'Access-Control-Allow-Origin': response.headers['access-control-allow-origin'],
            'Access-Control-Allow-Methods': response.headers['access-control-allow-methods'],
            'Access-Control-Allow-Headers': response.headers['access-control-allow-headers'],
            'Access-Control-Allow-Credentials': response.headers['access-control-allow-credentials']
        };
        
        console.log('   CORS Headers:');
        Object.entries(corsHeaders).forEach(([key, value]) => {
            console.log(`      ${key}: ${value || 'NOT SET'}`);
        });
        
    } catch (error) {
        console.log(`   OPTIONS request: ❌ ${error.message}`);
    }
}

async function runTests() {
    for (const url of urls) {
        await testURL(url);
        await testCORSSpecifically(url);
    }
    
    console.log('\n🎯 SUMMARY:');
    console.log('If both URLs show the same results, the custom domain is working correctly.');
    console.log('If CORS headers are present, the browser CORS issue should be resolved.');
    console.log('If you still see CORS errors in browser, there may be a caching issue.');
}

runTests().catch(console.error);
