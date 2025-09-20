#!/usr/bin/env node

/**
 * FloWorx Verification System Launcher
 * 
 * Easy-to-use launcher for the comprehensive verification system
 * 
 * Usage:
 *   node verify-floworx.js [options]
 *   npm run verify [options]
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {};

args.forEach(arg => {
  if (arg.startsWith('--')) {
    const [key, value] = arg.substring(2).split('=');
    options[key] = value || true;
  }
});

// Default options
const mode = options.mode || 'full';
const fix = options.fix || false;
const report = options.report || 'console';
const help = options.help || options.h || false;

if (help) {
  console.log(`
🎯 FloWorx Verification System

USAGE:
  node verify-floworx.js [options]

OPTIONS:
  --mode=MODE        Verification mode: full, quick, monitor (default: full)
  --fix              Enable automatic fixes
  --report=FORMAT    Report format: console, json, html (default: console)
  --help, -h         Show this help message

EXAMPLES:
  node verify-floworx.js                    # Full verification
  node verify-floworx.js --mode=quick       # Quick health check
  node verify-floworx.js --fix              # Full verification with auto-fix
  node verify-floworx.js --report=html      # Generate HTML report
  node verify-floworx.js --mode=monitor     # Continuous monitoring

WHAT IT CHECKS:
  ✅ Static Code Analysis    - Method conflicts, parameter mismatches
  ✅ Integration Testing     - End-to-end user flows, API connectivity
  ✅ Health Monitoring       - System health, performance, availability
  ✅ Auto Resolution         - Automatic fixes for common issues

RECENT FIXES:
  🔧 Email service method conflicts resolved
  🔧 Parameter mismatch issues fixed
  🔧 Frontend compilation errors resolved
  🔧 Database connectivity verified

For more information, see verification-system/README.md
`);
  process.exit(0);
}

// Check if verification system exists
const verificationSystemPath = path.join(__dirname, 'verification-system');
if (!fs.existsSync(verificationSystemPath)) {
  console.error('❌ Verification system not found. Please ensure verification-system/ directory exists.');
  process.exit(1);
}

// Check if dependencies are installed
const packageJsonPath = path.join(verificationSystemPath, 'package.json');
const nodeModulesPath = path.join(verificationSystemPath, 'node_modules');

if (!fs.existsSync(nodeModulesPath)) {
  console.log('📦 Installing verification system dependencies...');
  
  const installProcess = spawn('npm', ['install'], {
    cwd: verificationSystemPath,
    stdio: 'inherit',
    shell: true
  });

  installProcess.on('close', (code) => {
    if (code !== 0) {
      console.error('❌ Failed to install dependencies');
      process.exit(1);
    }
    runVerification();
  });
} else {
  runVerification();
}

function runVerification() {
  console.log('🚀 Starting FloWorx Verification System...\n');

  // Build command arguments
  const verificationArgs = [];
  
  if (mode !== 'full') {
    verificationArgs.push(`--mode=${mode}`);
  }
  
  if (fix) {
    verificationArgs.push('--fix');
  }
  
  if (report !== 'console') {
    verificationArgs.push(`--report=${report}`);
  }

  // Run the verification system
  const verificationProcess = spawn('node', ['index.js', ...verificationArgs], {
    cwd: verificationSystemPath,
    stdio: 'inherit',
    shell: true
  });

  verificationProcess.on('close', (code) => {
    if (code === 0) {
      console.log('\n✅ Verification completed successfully!');
      
      if (mode === 'full' && !fix) {
        console.log('\n💡 TIP: Run with --fix flag to automatically resolve issues');
      }
      
      if (report === 'console') {
        console.log('💡 TIP: Use --report=html for detailed web-based report');
      }
    } else {
      console.log('\n⚠️  Verification completed with issues detected');
      console.log('🔧 Run with --fix flag to attempt automatic resolution');
    }
    
    process.exit(code);
  });

  verificationProcess.on('error', (error) => {
    console.error('❌ Failed to run verification system:', error.message);
    process.exit(1);
  });
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Verification interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Verification terminated');
  process.exit(0);
});
