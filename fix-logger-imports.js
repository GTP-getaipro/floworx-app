#!/usr/bin/env node

/**
 * Fix Logger Import Issues
 * This script fixes all logger import issues across the codebase
 */

const fs = require('fs');
const path = require('path');

const filesToFix = [
  'backend/services/errorTrackingService.js',
  'backend/server.js',
  'backend/services/redis-connection-manager.js',
  'backend/config/config.js',
  'backend/middleware/errorHandler.js',
  'backend/services/cacheService.js',
  'backend/services/emailService.js',
  'backend/services/realTimeMonitoringService.js',
  'backend/services/SecurityService.js',
  'backend/database/unified-connection.js',
  'backend/middleware/standardErrorHandler.js'
];

function fixLoggerImport(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return false;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check if file has logger import issues
    const hasOldImport = content.includes("const logger = require('../utils/logger')") ||
                        content.includes("const logger = require('./utils/logger')");
    
    if (!hasOldImport) {
      console.log(`✅ ${filePath} - Already correct`);
      return false;
    }

    // Fix the import
    let fixedContent = content
      .replace(/const logger = require\('\.\.\/utils\/logger'\);?/g, "const { logger } = require('../utils/logger');")
      .replace(/const logger = require\('\.\/utils\/logger'\);?/g, "const { logger } = require('./utils/logger');");

    // Write the fixed content
    fs.writeFileSync(filePath, fixedContent, 'utf8');
    console.log(`🔧 Fixed logger import in: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🔧 Fixing Logger Import Issues');
  console.log('==============================');

  let fixedCount = 0;
  let totalFiles = 0;

  filesToFix.forEach(filePath => {
    totalFiles++;
    if (fixLoggerImport(filePath)) {
      fixedCount++;
    }
  });

  console.log('\n📊 Summary:');
  console.log(`   Files checked: ${totalFiles}`);
  console.log(`   Files fixed: ${fixedCount}`);
  console.log(`   Files already correct: ${totalFiles - fixedCount}`);

  if (fixedCount > 0) {
    console.log('\n🎉 Logger imports have been fixed!');
    console.log('💡 You may need to restart your server for changes to take effect.');
  } else {
    console.log('\n✅ All logger imports are already correct!');
  }
}

main();
