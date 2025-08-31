// Test the deployed Vercel API
const API_BASE_URL = 'https://floworx-mi7fyq42q-floworxdevelopers-projects.vercel.app';

async function testDeployedAPI() {
    console.log('🧪 Testing deployed Floworx API...\n');
    
    // Test 1: Health Check
    try {
        console.log('1. Testing health endpoint...');
        const healthResponse = await fetch(`${API_BASE_URL}/health`);
        const healthData = await healthResponse.json();
        
        console.log('Status:', healthResponse.status);
        console.log('Response:', JSON.stringify(healthData, null, 2));
        
        if (healthResponse.ok) {
            console.log('✅ Health check passed!\n');
        } else {
            console.log('❌ Health check failed!\n');
        }
    } catch (error) {
        console.log('❌ Health check error:', error.message, '\n');
    }
    
    // Test 2: Registration
    try {
        console.log('2. Testing registration endpoint...');
        const registerResponse = await fetch(`${API_BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: 'deployed-test@example.com',
                password: 'TestPassword123!',
                firstName: 'Deployed',
                lastName: 'Test'
            })
        });
        
        const registerData = await registerResponse.json();
        
        console.log('Status:', registerResponse.status);
        console.log('Response:', JSON.stringify(registerData, null, 2));
        
        if (registerResponse.ok) {
            console.log('✅ Registration test passed!\n');
        } else {
            console.log('❌ Registration test failed!\n');
        }
    } catch (error) {
        console.log('❌ Registration error:', error.message, '\n');
    }
    
    // Test 3: Login
    try {
        console.log('3. Testing login endpoint...');
        const loginResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: 'deployed-test@example.com',
                password: 'TestPassword123!'
            })
        });
        
        const loginData = await loginResponse.json();
        
        console.log('Status:', loginResponse.status);
        console.log('Response:', JSON.stringify(loginData, null, 2));
        
        if (loginResponse.ok) {
            console.log('✅ Login test passed!\n');
        } else {
            console.log('❌ Login test failed!\n');
        }
    } catch (error) {
        console.log('❌ Login error:', error.message, '\n');
    }
}

testDeployedAPI();
