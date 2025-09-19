/**
 * FloWorx Production Status Check
 * Quick diagnostic tool to check production service status
 */

const https = require('https');
const dns = require('dns').promises;

const PRODUCTION_DOMAIN = 'app.floworx-iq.com';
const PRODUCTION_URL = `https://${PRODUCTION_DOMAIN}`;

async function checkDNS() {
  console.log('🔍 DNS Resolution Check');
  console.log('='.repeat(40));
  
  try {
    const addresses = await dns.resolve4(PRODUCTION_DOMAIN);
    console.log(`✅ DNS Resolution: ${PRODUCTION_DOMAIN} → ${addresses.join(', ')}`);
    return addresses[0];
  } catch (error) {
    console.log(`❌ DNS Resolution Failed: ${error.message}`);
    return null;
  }
}

async function checkTCPConnection(ip, port = 443) {
  console.log('\n🔍 TCP Connection Check');
  console.log('='.repeat(40));
  
  return new Promise((resolve) => {
    const net = require('net');
    const socket = new net.Socket();
    
    socket.setTimeout(5000);
    
    socket.on('connect', () => {
      console.log(`✅ TCP Connection: ${ip}:${port} is reachable`);
      socket.destroy();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      console.log(`❌ TCP Connection: ${ip}:${port} timeout`);
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', (error) => {
      console.log(`❌ TCP Connection: ${ip}:${port} error - ${error.message}`);
      resolve(false);
    });
    
    socket.connect(port, ip);
  });
}

async function checkHTTPS() {
  console.log('\n🔍 HTTPS Service Check');
  console.log('='.repeat(40));
  
  return new Promise((resolve) => {
    const req = https.request(`${PRODUCTION_URL}/api/health`, {
      method: 'GET',
      timeout: 10000,
      headers: {
        'User-Agent': 'FloWorx-Status-Check/1.0'
      }
    }, (res) => {
      console.log(`✅ HTTPS Response: ${res.statusCode} ${res.statusMessage}`);
      console.log(`   Headers: ${JSON.stringify(res.headers, null, 2)}`);
      
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log(`   Body: ${body.substring(0, 200)}${body.length > 200 ? '...' : ''}`);
        resolve({ status: res.statusCode, body, headers: res.headers });
      });
    });
    
    req.on('error', (error) => {
      console.log(`❌ HTTPS Request Failed: ${error.message}`);
      console.log(`   Error Code: ${error.code}`);
      console.log(`   Error Details: ${JSON.stringify(error, null, 2)}`);
      resolve(null);
    });
    
    req.on('timeout', () => {
      console.log(`❌ HTTPS Request Timeout`);
      req.destroy();
      resolve(null);
    });
    
    req.end();
  });
}

async function checkAlternativePorts() {
  console.log('\n🔍 Alternative Port Check');
  console.log('='.repeat(40));
  
  const ports = [80, 443, 5001, 8080, 3000];
  const ip = await dns.resolve4(PRODUCTION_DOMAIN).then(addrs => addrs[0]).catch(() => null);
  
  if (!ip) {
    console.log('❌ Cannot check ports - DNS resolution failed');
    return;
  }
  
  for (const port of ports) {
    const isOpen = await checkTCPConnection(ip, port);
    console.log(`Port ${port}: ${isOpen ? '✅ Open' : '❌ Closed'}`);
  }
}

async function checkServiceStatus() {
  console.log('\n🔍 Service Status Analysis');
  console.log('='.repeat(40));
  
  // Check if it's a DNS issue
  const ip = await checkDNS();
  if (!ip) {
    console.log('🚨 ISSUE: DNS resolution failed');
    console.log('   - Domain may not be configured correctly');
    console.log('   - Check domain registrar settings');
    return;
  }
  
  // Check if it's a network connectivity issue
  const tcpConnectable = await checkTCPConnection(ip, 443);
  if (!tcpConnectable) {
    console.log('🚨 ISSUE: TCP connection failed');
    console.log('   - Server may be down');
    console.log('   - Firewall may be blocking connections');
    console.log('   - Service may not be listening on port 443');
    
    await checkAlternativePorts();
    return;
  }
  
  // Check HTTPS service
  const httpsResponse = await checkHTTPS();
  if (!httpsResponse) {
    console.log('🚨 ISSUE: HTTPS service not responding');
    console.log('   - Web server may be down');
    console.log('   - SSL certificate issues');
    console.log('   - Application not started');
    return;
  }
  
  if (httpsResponse.status === 200) {
    console.log('✅ SERVICE STATUS: Healthy');
  } else {
    console.log(`⚠️  SERVICE STATUS: Responding but with status ${httpsResponse.status}`);
  }
}

async function main() {
  console.log('🚀 FLOWORX PRODUCTION STATUS CHECK');
  console.log('='.repeat(60));
  console.log(`Target: ${PRODUCTION_URL}`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log('');
  
  await checkServiceStatus();
  
  console.log('\n📋 NEXT STEPS:');
  console.log('='.repeat(40));
  console.log('1. Check Coolify dashboard for container status');
  console.log('2. Review container logs for startup errors');
  console.log('3. Verify environment variables are set');
  console.log('4. Check domain DNS configuration');
  console.log('5. Verify SSL certificate status');
  
  console.log('\n🔧 DIAGNOSTIC COMMANDS:');
  console.log('='.repeat(40));
  console.log('# Check container status:');
  console.log('docker ps | grep floworx');
  console.log('');
  console.log('# Check container logs:');
  console.log('docker logs <container-id>');
  console.log('');
  console.log('# Test local connectivity:');
  console.log('curl -v https://app.floworx-iq.com/api/health');
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Status check failed:', error);
    process.exit(1);
  });
}

module.exports = { checkServiceStatus, checkDNS, checkTCPConnection, checkHTTPS };
