#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🔍 TESTING NIXPACKS START COMMAND');
console.log('=================================');

async function testNixpacksCommand() {
  console.log('\n📋 PACKAGE.JSON START SCRIPT CHECK');
  console.log('===================================');
  
  // Check if package.json has correct start script
  try {
    const packageJson = require('./backend/package.json');
    console.log('✅ backend/package.json found');
    console.log(`   Name: ${packageJson.name}`);
    console.log(`   Version: ${packageJson.version}`);
    console.log(`   Main: ${packageJson.main}`);
    
    if (packageJson.scripts && packageJson.scripts.start) {
      console.log(`✅ Start script: "${packageJson.scripts.start}"`);
    } else {
      console.log('❌ No start script found in package.json!');
      return false;
    }
    
    // Check Node.js version requirement
    if (packageJson.engines && packageJson.engines.node) {
      console.log(`   Node requirement: ${packageJson.engines.node}`);
      console.log(`   Current Node: ${process.version}`);
    }
    
  } catch (error) {
    console.log('❌ Error reading backend/package.json:', error.message);
    return false;
  }
  
  console.log('\n🚀 TESTING NIXPACKS COMMAND');
  console.log('===========================');
  
  // Test the exact command Nixpacks uses
  const command = 'npm';
  const args = ['start', '--prefix', 'backend'];
  
  console.log(`Command: ${command} ${args.join(' ')}`);
  console.log('Working directory:', process.cwd());
  console.log('');
  
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: '5001'
      }
    });
    
    let stdout = '';
    let stderr = '';
    let hasOutput = false;
    
    child.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      console.log('📤 STDOUT:', output.trim());
      hasOutput = true;
      
      // Check for successful startup messages
      if (output.includes('Floworx backend server running')) {
        console.log('🎉 SUCCESS: Application started successfully!');
      }
      if (output.includes('Server accessible on: 0.0.0.0:5001')) {
        console.log('🌐 SUCCESS: Server bound to correct address!');
      }
    });
    
    child.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      console.log('📥 STDERR:', output.trim());
      hasOutput = true;
      
      // Check for common error patterns
      if (output.includes('ECONNREFUSED')) {
        console.log('❌ DATABASE CONNECTION ERROR detected');
      }
      if (output.includes('Missing environment variable')) {
        console.log('❌ ENVIRONMENT VARIABLE ERROR detected');
      }
      if (output.includes('Port 5001')) {
        console.log('❌ PORT BINDING ERROR detected');
      }
    });
    
    child.on('error', (error) => {
      console.log('❌ SPAWN ERROR:', error.message);
      resolve(false);
    });
    
    child.on('close', (code, signal) => {
      console.log(`\n📊 PROCESS RESULT`);
      console.log(`   Exit code: ${code}`);
      console.log(`   Signal: ${signal}`);
      console.log(`   Had output: ${hasOutput}`);
      
      if (code === 0) {
        console.log('✅ Process completed successfully');
      } else {
        console.log('❌ Process failed with exit code:', code);
      }
      
      resolve(code === 0);
    });
    
    // Kill the process after 15 seconds to prevent hanging
    setTimeout(() => {
      if (!child.killed) {
        console.log('\n⏰ Killing process after 15 seconds...');
        child.kill('SIGTERM');
        setTimeout(() => {
          if (!child.killed) {
            child.kill('SIGKILL');
          }
        }, 2000);
      }
    }, 15000);
  });
}

async function testDirectNodeCommand() {
  console.log('\n🎯 TESTING DIRECT NODE COMMAND');
  console.log('==============================');
  
  const command = 'node';
  const args = ['backend/server.js'];
  
  console.log(`Command: ${command} ${args.join(' ')}`);
  console.log('Working directory:', process.cwd());
  console.log('');
  
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: '5001'
      }
    });
    
    let hasOutput = false;
    
    child.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('📤 STDOUT:', output.trim());
      hasOutput = true;
    });
    
    child.stderr.on('data', (data) => {
      const output = data.toString();
      console.log('📥 STDERR:', output.trim());
      hasOutput = true;
    });
    
    child.on('error', (error) => {
      console.log('❌ SPAWN ERROR:', error.message);
      resolve(false);
    });
    
    child.on('close', (code, signal) => {
      console.log(`\n📊 DIRECT NODE RESULT`);
      console.log(`   Exit code: ${code}`);
      console.log(`   Signal: ${signal}`);
      console.log(`   Had output: ${hasOutput}`);
      
      resolve(code === 0);
    });
    
    // Kill after 10 seconds
    setTimeout(() => {
      if (!child.killed) {
        console.log('\n⏰ Killing direct node process after 10 seconds...');
        child.kill('SIGTERM');
      }
    }, 10000);
  });
}

async function runTests() {
  console.log('Starting comprehensive start command tests...\n');
  
  const nixpacksSuccess = await testNixpacksCommand();
  const directSuccess = await testDirectNodeCommand();
  
  console.log('\n🎯 TEST SUMMARY');
  console.log('===============');
  console.log(`Nixpacks command (npm start --prefix backend): ${nixpacksSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`Direct command (node backend/server.js): ${directSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
  
  if (!nixpacksSuccess && !directSuccess) {
    console.log('\n🚨 BOTH COMMANDS FAILED');
    console.log('This explains why your container starts but the app doesn\'t!');
    console.log('The issue is in your application code or environment setup.');
  } else if (!nixpacksSuccess && directSuccess) {
    console.log('\n🔍 NPM START ISSUE');
    console.log('Direct node works but npm start fails.');
    console.log('This could be an npm configuration or package.json issue.');
  } else if (nixpacksSuccess) {
    console.log('\n✅ COMMANDS WORK LOCALLY');
    console.log('The issue must be in the container environment:');
    console.log('- Missing environment variables');
    console.log('- Different Node.js version');
    console.log('- Missing dependencies');
    console.log('- Network/database connectivity');
  }
}

runTests().catch(console.error);
