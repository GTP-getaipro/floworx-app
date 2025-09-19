/**
 * FloWorx Production Deep Diagnostic Tool
 * Comprehensive analysis of production deployment issues
 */

const https = require('https');
const http = require('http');
const dns = require('dns').promises;
const net = require('net');

const PRODUCTION_DOMAIN = 'app.floworx-iq.com';
const PRODUCTION_IP = '72.60.121.93';

async function checkHTTPService() {
  console.log('🔍 HTTP Service Check (Port 80)');
  console.log('='.repeat(50));
  
  return new Promise((resolve) => {
    const req = http.request(`http://${PRODUCTION_DOMAIN}/`, {
      method: 'GET',
      timeout: 10000,
      headers: {
        'User-Agent': 'FloWorx-Deep-Diagnostic/1.0',
        'Host': PRODUCTION_DOMAIN
      }
    }, (res) => {
      console.log(`✅ HTTP Response: ${res.statusCode} ${res.statusMessage}`);
      console.log(`   Server: ${res.headers.server || 'Unknown'}`);
      console.log(`   Content-Type: ${res.headers['content-type'] || 'Unknown'}`);
      console.log(`   Location: ${res.headers.location || 'None'}`);
      
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log(`   Body Preview: ${body.substring(0, 200)}${body.length > 200 ? '...' : ''}`);
        resolve({ status: res.statusCode, body, headers: res.headers });
      });
    });
    
    req.on('error', (error) => {
      console.log(`❌ HTTP Request Failed: ${error.message}`);
      resolve(null);
    });
    
    req.on('timeout', () => {
      console.log(`❌ HTTP Request Timeout`);
      req.destroy();
      resolve(null);
    });
    
    req.end();
  });
}

async function checkCoolifyProxy() {
  console.log('\n🔍 Coolify Proxy Analysis');
  console.log('='.repeat(50));
  
  // Check if Coolify proxy is running
  const proxyPorts = [80, 443, 8080, 8443];
  
  for (const port of proxyPorts) {
    const isOpen = await checkPort(PRODUCTION_IP, port);
    console.log(`Port ${port}: ${isOpen ? '✅ Open' : '❌ Closed'}`);
    
    if (isOpen && port === 80) {
      // Try to get more info from HTTP port
      await checkHTTPService();
    }
  }
}

async function checkPort(ip, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(3000);
    
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', () => {
      resolve(false);
    });
    
    socket.connect(port, ip);
  });
}

async function analyzeDockerConfiguration() {
  console.log('\n🔍 Docker Configuration Analysis');
  console.log('='.repeat(50));
  
  console.log('Expected Docker Configuration:');
  console.log('- Container should expose port 5001');
  console.log('- Coolify should proxy 80/443 → container:5001');
  console.log('- SSL should be handled by Coolify proxy');
  console.log('- Health check: /api/health');
  
  console.log('\nPossible Issues:');
  console.log('1. Container not running (check: docker ps)');
  console.log('2. Container not exposing port 5001');
  console.log('3. Coolify proxy not configured correctly');
  console.log('4. SSL certificate not configured');
  console.log('5. Environment variables causing startup failure');
  console.log('6. Application crashing during startup');
}

async function checkEnvironmentIssues() {
  console.log('\n🔍 Environment Variable Analysis');
  console.log('='.repeat(50));
  
  console.log('Required Environment Variables:');
  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY', 
    'SUPABASE_SERVICE_ROLE_KEY',
    'JWT_SECRET',
    'SENDGRID_API_KEY',
    'SENDGRID_FROM_EMAIL',
    'SENDGRID_FROM_NAME',
    'NODE_ENV',
    'PORT'
  ];
  
  requiredVars.forEach(varName => {
    console.log(`- ${varName}: ${varName.includes('KEY') || varName.includes('SECRET') ? '[SENSITIVE]' : 'Required'}`);
  });
  
  console.log('\nCommon Environment Issues:');
  console.log('1. Missing SENDGRID_* variables (you added these)');
  console.log('2. Invalid SUPABASE_URL or keys');
  console.log('3. JWT_SECRET not set or invalid');
  console.log('4. NODE_ENV not set to "production"');
  console.log('5. PORT not set to 5001');
}

async function generateTroubleshootingSteps() {
  console.log('\n🔧 TROUBLESHOOTING STEPS');
  console.log('='.repeat(50));
  
  console.log('STEP 1: Check Container Status');
  console.log('- Go to Coolify Dashboard');
  console.log('- Navigate to your FloWorx application');
  console.log('- Check "Deployments" tab for latest deployment status');
  console.log('- Look for any failed deployments or error messages');
  
  console.log('\nSTEP 2: Check Container Logs');
  console.log('- In Coolify Dashboard, go to "Logs" tab');
  console.log('- Look for startup errors, especially:');
  console.log('  * "Authentication configuration validation failed"');
  console.log('  * "Database connection failed"');
  console.log('  * "Port already in use"');
  console.log('  * "Permission denied"');
  
  console.log('\nSTEP 3: Verify Environment Variables');
  console.log('- Go to "Environment Variables" section');
  console.log('- Ensure all required variables are set');
  console.log('- Check for typos in variable names');
  console.log('- Verify values are not empty');
  
  console.log('\nSTEP 4: Check Domain Configuration');
  console.log('- Go to "Domains" section');
  console.log('- Verify app.floworx-iq.com is configured');
  console.log('- Check SSL certificate status');
  console.log('- Ensure domain points to correct container');
  
  console.log('\nSTEP 5: Force Rebuild');
  console.log('- Try "Force Rebuild" option');
  console.log('- This will rebuild the Docker image from scratch');
  console.log('- Watch deployment logs for any build errors');
}

async function checkCommonCoolifyIssues() {
  console.log('\n🔍 Common Coolify Issues');
  console.log('='.repeat(50));
  
  console.log('Issue 1: Container Resource Limits');
  console.log('- Container may be running out of memory');
  console.log('- Check resource usage in Coolify dashboard');
  console.log('- Increase memory limits if needed');
  
  console.log('\nIssue 2: Port Mapping Problems');
  console.log('- Container port 5001 not mapped correctly');
  console.log('- Proxy configuration incorrect');
  console.log('- Multiple containers trying to use same port');
  
  console.log('\nIssue 3: SSL Certificate Issues');
  console.log('- SSL certificate not generated');
  console.log('- Certificate expired or invalid');
  console.log('- Domain verification failed');
  
  console.log('\nIssue 4: Network Configuration');
  console.log('- Container not in correct Docker network');
  console.log('- Firewall blocking connections');
  console.log('- DNS propagation issues');
}

async function main() {
  console.log('🚀 FLOWORX PRODUCTION DEEP DIAGNOSTIC');
  console.log('='.repeat(70));
  console.log(`Domain: ${PRODUCTION_DOMAIN}`);
  console.log(`IP: ${PRODUCTION_IP}`);
  console.log(`Time: ${new Date().toISOString()}`);
  
  await checkCoolifyProxy();
  await analyzeDockerConfiguration();
  await checkEnvironmentIssues();
  await checkCommonCoolifyIssues();
  await generateTroubleshootingSteps();
  
  console.log('\n🎯 IMMEDIATE ACTION PLAN');
  console.log('='.repeat(50));
  console.log('1. Check Coolify Dashboard → Logs for container startup errors');
  console.log('2. Verify all environment variables are properly set');
  console.log('3. Check domain and SSL configuration');
  console.log('4. Try force rebuild if configuration looks correct');
  console.log('5. Check server resources (CPU, memory, disk)');
  
  console.log('\n📞 ESCALATION PATH');
  console.log('='.repeat(50));
  console.log('If issues persist after following troubleshooting steps:');
  console.log('1. Export container logs from Coolify');
  console.log('2. Check Coolify system logs');
  console.log('3. Contact Coolify support with logs');
  console.log('4. Consider temporary rollback to previous working version');
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Deep diagnostic failed:', error);
    process.exit(1);
  });
}

module.exports = { checkHTTPService, checkCoolifyProxy, checkPort };
