const https = require('https');

console.log('🔍 CHECKING AVAILABLE ROUTES');
console.log('============================\n');

async function checkRoutes() {
    try {
        const url = new URL('/api/test', 'https://app.floworx-iq.com');
        
        const options = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'https://app.floworx-iq.com'
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
                            data: jsonData
                        });
                    } catch (e) {
                        resolve({
                            status: res.statusCode,
                            raw: responseData
                        });
                    }
                });
            });
            
            req.on('error', reject);
            req.setTimeout(10000, () => reject(new Error('Timeout')));
            req.end();
        });

        console.log('📍 API Test Endpoint Response:');
        console.log(`Status: ${response.status}`);
        console.log(`Data:`, JSON.stringify(response.data, null, 2));
        
        if (response.data && response.data.routes) {
            console.log(`\n📊 Total Routes Available: ${response.data.routes}`);
        }
        
        return response;
        
    } catch (error) {
        console.log(`❌ Error checking routes: ${error.message}`);
        return null;
    }
}

async function testSpecificRoute() {
    console.log('\n🔍 Testing a specific new route to see debug info:');
    
    try {
        const url = new URL('/api/analytics/dashboard', 'https://app.floworx-iq.com');
        
        const options = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'https://app.floworx-iq.com'
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
                            data: jsonData
                        });
                    } catch (e) {
                        resolve({
                            status: res.statusCode,
                            raw: responseData
                        });
                    }
                });
            });
            
            req.on('error', reject);
            req.setTimeout(10000, () => reject(new Error('Timeout')));
            req.end();
        });

        console.log(`Status: ${response.status}`);
        console.log(`Response:`, JSON.stringify(response.data, null, 2));
        
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }
}

async function main() {
    await checkRoutes();
    await testSpecificRoute();
    
    console.log('\n💡 ANALYSIS:');
    console.log('If the routes count is the same as before, the changes may not be deployed yet.');
    console.log('Vercel deployments can take a few minutes to propagate.');
    console.log('');
    console.log('🚀 NEXT STEPS:');
    console.log('1. Wait a few minutes for Vercel deployment');
    console.log('2. Or manually trigger a new deployment');
    console.log('3. Check if the routes are now available');
}

main().catch(console.error);
