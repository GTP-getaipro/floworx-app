// Debug the deployed Vercel API
const API_BASE_URL = 'https://floworx-mi7fyq42q-floworxdevelopers-projects.vercel.app';

async function debugDeployedAPI() {
    console.log('🔍 Debugging deployed Floworx API...\n');
    
    // Test 1: Check what the root returns
    try {
        console.log('1. Testing root endpoint...');
        const rootResponse = await fetch(`${API_BASE_URL}/`);
        const rootText = await rootResponse.text();
        
        console.log('Status:', rootResponse.status);
        console.log('Content-Type:', rootResponse.headers.get('content-type'));
        console.log('Response (first 500 chars):', rootText.substring(0, 500));
        console.log('---\n');
    } catch (error) {
        console.log('❌ Root endpoint error:', error.message, '\n');
    }
    
    // Test 2: Check health endpoint
    try {
        console.log('2. Testing health endpoint...');
        const healthResponse = await fetch(`${API_BASE_URL}/health`);
        const healthText = await healthResponse.text();
        
        console.log('Status:', healthResponse.status);
        console.log('Content-Type:', healthResponse.headers.get('content-type'));
        console.log('Response (first 500 chars):', healthText.substring(0, 500));
        console.log('---\n');
    } catch (error) {
        console.log('❌ Health endpoint error:', error.message, '\n');
    }
    
    // Test 3: Check API auth endpoint
    try {
        console.log('3. Testing API auth endpoint...');
        const authResponse = await fetch(`${API_BASE_URL}/api/auth/register`, {
            method: 'GET'
        });
        const authText = await authResponse.text();
        
        console.log('Status:', authResponse.status);
        console.log('Content-Type:', authResponse.headers.get('content-type'));
        console.log('Response (first 500 chars):', authText.substring(0, 500));
        console.log('---\n');
    } catch (error) {
        console.log('❌ API auth endpoint error:', error.message, '\n');
    }
}

debugDeployedAPI();
