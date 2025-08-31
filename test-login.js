// Using Node.js built-in fetch (Node 18+)

async function testLogin() {
    try {
        console.log('Testing login API...');
        
        const response = await fetch('http://localhost:5001/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: 'test@example.com',
                password: 'TestPassword123!'
            })
        });

        const data = await response.json();
        
        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(data, null, 2));
        
        if (response.ok) {
            console.log('✅ Login test successful!');
            console.log('🔑 JWT Token received:', data.token ? 'Yes' : 'No');
        } else {
            console.log('❌ Login test failed');
        }
        
    } catch (error) {
        console.error('Error testing login:', error.message);
    }
}

testLogin();
