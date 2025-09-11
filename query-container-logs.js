#!/usr/bin/env node

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

console.log('🔍 QUERYING CONTAINER LOGS');
console.log('==========================');

async function queryContainerLogs() {
  const serverIP = '72.60.121.93';
  
  console.log(`\n🌐 Attempting to connect to server: ${serverIP}`);
  console.log('This will help us see what\'s happening inside the container...\n');
  
  // Try different approaches to get container information
  const commands = [
    {
      name: 'Test SSH Connection',
      cmd: `ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no root@${serverIP} "echo 'SSH connection successful'"`,
      description: 'Test if we can SSH to the server'
    },
    {
      name: 'List Docker Containers',
      cmd: `ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no root@${serverIP} "docker ps -a | grep floworx"`,
      description: 'List FloWorx containers'
    },
    {
      name: 'Get Container Logs',
      cmd: `ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no root@${serverIP} "docker logs --tail 50 \$(docker ps -q --filter name=floworx)"`,
      description: 'Get recent container logs'
    },
    {
      name: 'Check Container Status',
      cmd: `ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no root@${serverIP} "docker inspect \$(docker ps -q --filter name=floworx) | grep -E 'Status|Health|RestartCount'"`,
      description: 'Check container health status'
    }
  ];
  
  for (const command of commands) {
    console.log(`\n📋 ${command.name}`);
    console.log(`Description: ${command.description}`);
    console.log(`Command: ${command.cmd}`);
    console.log('---');
    
    try {
      const { stdout, stderr } = await execAsync(command.cmd);
      
      if (stdout.trim()) {
        console.log('✅ Output:');
        console.log(stdout);
      }
      
      if (stderr.trim()) {
        console.log('⚠️ Stderr:');
        console.log(stderr);
      }
      
      if (!stdout.trim() && !stderr.trim()) {
        console.log('ℹ️ No output returned');
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      
      // If SSH fails, suggest alternative approaches
      if (error.message.includes('Connection refused') || error.message.includes('ssh')) {
        console.log('\n💡 SSH connection failed. Alternative approaches:');
        console.log('1. Check if SSH is enabled on your server');
        console.log('2. Use Coolify dashboard to view logs');
        console.log('3. Check if you have SSH key access');
        console.log('4. Try connecting via your hosting provider\'s console');
        break;
      }
    }
  }
}

async function alternativeLogRetrieval() {
  console.log('\n🔄 ALTERNATIVE LOG RETRIEVAL METHODS');
  console.log('====================================');
  
  console.log('Since direct server access may not be available, here are');
  console.log('the steps to get the container logs through Coolify:');
  console.log('');
  console.log('📋 COOLIFY DASHBOARD STEPS:');
  console.log('1. Open your Coolify dashboard');
  console.log('2. Navigate to your FloWorx application');
  console.log('3. Click on the "Logs" tab');
  console.log('4. Look for recent entries (last 10-15 minutes)');
  console.log('5. Copy any error messages or startup logs');
  console.log('');
  console.log('🔍 WHAT TO LOOK FOR:');
  console.log('- "🚀 Floworx backend server running on port 5001" ← Good');
  console.log('- Database connection errors ← Bad');
  console.log('- Missing environment variables ← Bad');
  console.log('- Port binding errors ← Bad');
  console.log('- Application crashes ← Bad');
  console.log('- Health check failures ← Bad');
  console.log('');
  console.log('📤 SHARE THE LOGS:');
  console.log('Copy the logs from Coolify and share them so we can');
  console.log('identify the exact issue preventing the app from starting.');
}

async function runLogQuery() {
  await queryContainerLogs();
  await alternativeLogRetrieval();
  
  console.log('\n🎯 SUMMARY');
  console.log('==========');
  console.log('The container is running but the Node.js application inside');
  console.log('is failing to start. We need to see the application logs');
  console.log('to identify the specific error.');
  console.log('');
  console.log('🚨 NEXT STEP: Share the Coolify application logs!');
}

runLogQuery().catch(console.error);
