#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 VALIDATING PRODUCTION DEPENDENCIES');
console.log('=====================================');

// Read package.json
const packageJsonPath = path.join(__dirname, 'backend', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

console.log('✅ Backend package.json loaded');
console.log(`📦 Dependencies: ${Object.keys(packageJson.dependencies).length}`);
console.log(`🛠️ DevDependencies: ${Object.keys(packageJson.devDependencies).length}`);

// Check for common missing dependencies
const requiredDependencies = [
  'express',
  'cors', 
  'morgan',
  'dotenv',
  'helmet',
  'bcryptjs',
  'jsonwebtoken',
  'nodemailer',
  'pg',
  'axios',
  'compression',
  'express-rate-limit',
  'express-validator',
  'winston',
  'validator'
];

console.log('\n🔍 Checking required dependencies...');

let missingDeps = [];
requiredDependencies.forEach(dep => {
  if (packageJson.dependencies[dep]) {
    console.log(`✅ ${dep}: ${packageJson.dependencies[dep]}`);
  } else {
    console.log(`❌ ${dep}: MISSING`);
    missingDeps.push(dep);
  }
});

if (missingDeps.length > 0) {
  console.log('\n🚨 MISSING DEPENDENCIES FOUND:');
  missingDeps.forEach(dep => console.log(`  - ${dep}`));
  console.log('\n💡 Add these to backend/package.json dependencies section');
  process.exit(1);
} else {
  console.log('\n🎉 ALL REQUIRED DEPENDENCIES PRESENT!');
}

// Check for potential issues
console.log('\n🔍 Checking for potential issues...');

// Check for deprecated crypto dependency
if (packageJson.dependencies.crypto) {
  console.log('⚠️ WARNING: crypto dependency is deprecated (built into Node.js)');
}

// Check Node version compatibility
console.log(`\n📋 Node.js compatibility:`);
console.log(`Current Node: ${process.version}`);
console.log(`Package engines: ${JSON.stringify(packageJson.engines || 'Not specified')}`);

console.log('\n✅ DEPENDENCY VALIDATION COMPLETE');
console.log('🚀 Ready for production deployment!');
