// Using Node.js built-in fetch (Node 18+)

async function testRegistration() {
    try {
        console.log('Testing registration API...');
        
        const response = await fetch('http://localhost:5001/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: 'test@example.com',
                password: 'TestPassword123!',
                firstName: 'Test',
                lastName: 'User'
            })
        });

        const data = await response.json();
        
        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(data, null, 2));
        
        if (response.ok) {
            console.log('✅ Registration test successful!');
        } else {
            console.log('❌ Registration test failed');
        }
        
    } catch (error) {
        console.error('Error testing registration:', error.message);
    }
}

testRegistration();
