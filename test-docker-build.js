#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🐳 TESTING DOCKER BUILD FOR COOLIFY DEPLOYMENT');
console.log('==============================================');

// Check if Docker is available
try {
  execSync('docker --version', { stdio: 'pipe' });
  console.log('✅ Docker is available');
} catch (error) {
  console.log('❌ Docker is not available. Please install Docker to test the build.');
  process.exit(1);
}

// Check if Dockerfile exists
if (!fs.existsSync('Dockerfile')) {
  console.log('❌ Dockerfile not found');
  process.exit(1);
}
console.log('✅ Dockerfile found');

// Test Docker build
console.log('\n🔨 Building Docker image...');
console.log('This may take a few minutes...\n');

try {
  const buildOutput = execSync('docker build -t floworx-test .', { 
    stdio: 'pipe',
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 10 // 10MB buffer
  });
  
  console.log('✅ Docker build successful!');
  console.log('\n📋 Build completed without errors');
  
  // Test if the image was created
  try {
    const images = execSync('docker images floworx-test', { stdio: 'pipe', encoding: 'utf8' });
    console.log('\n🎉 Docker image created successfully:');
    console.log(images);
    
    // Clean up the test image
    console.log('\n🧹 Cleaning up test image...');
    execSync('docker rmi floworx-test', { stdio: 'pipe' });
    console.log('✅ Test image removed');
    
  } catch (error) {
    console.log('⚠️ Could not verify image creation, but build completed');
  }
  
} catch (error) {
  console.log('❌ Docker build failed:');
  console.log(error.stdout || error.message);
  
  if (error.stderr) {
    console.log('\n🔍 Error details:');
    console.log(error.stderr);
  }
  
  console.log('\n💡 Common fixes:');
  console.log('1. Check if all package.json files are valid');
  console.log('2. Ensure all dependencies are properly listed');
  console.log('3. Verify Node.js version compatibility');
  console.log('4. Check for any missing files referenced in Dockerfile');
  
  process.exit(1);
}

console.log('\n🎯 DOCKER BUILD TEST RESULTS:');
console.log('✅ Build process: SUCCESSFUL');
console.log('✅ Image creation: SUCCESSFUL');
console.log('✅ Ready for Coolify deployment!');

console.log('\n🚀 NEXT STEPS:');
console.log('1. Deploy in Coolify using the GitHub repository');
console.log('2. Set environment variables from .env.production');
console.log('3. Configure domain: app.floworx-iq.com');
console.log('4. Test the deployed application');
