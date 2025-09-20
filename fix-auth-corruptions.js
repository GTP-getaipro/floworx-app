#!/usr/bin/env node

/**
 * Fix Auth File Corruptions - Emergency Repair
 * 
 * Fixes the auth.js file that has many corrupted catch statements
 */

const fs = require('fs');
const path = require('path');

function fixAuthFile() {
  const filePath = path.join(process.cwd(), 'backend/routes/auth.js');
  
  console.log('🔧 Fixing auth.js corruptions...');
  
  let content = fs.readFileSync(filePath, 'utf8');
  let fixCount = 0;
  
  // Fix all numeric catch corruptions
  for (let i = 0; i <= 50; i++) {
    const pattern = new RegExp(`catch${i}\\s*\\(`, 'g');
    const matches = content.match(pattern);
    if (matches) {
      content = content.replace(pattern, 'catch (');
      fixCount += matches.length;
      console.log(`   Fixed catch${i} -> catch (${matches.length} occurrences)`);
    }
  }
  
  // Fix other potential corruptions
  const otherPatterns = [
    { from: /try(\d+)\s*\{/g, to: 'try {' },
    { from: /if(\d+)\s*\(/g, to: 'if (' },
    { from: /for(\d+)\s*\(/g, to: 'for (' },
    { from: /while(\d+)\s*\(/g, to: 'while (' },
    { from: /switch(\d+)\s*\(/g, to: 'switch (' }
  ];
  
  otherPatterns.forEach(({ from, to }) => {
    const matches = content.match(from);
    if (matches) {
      content = content.replace(from, to);
      fixCount += matches.length;
      console.log(`   Fixed ${matches.length} other corruptions`);
    }
  });
  
  fs.writeFileSync(filePath, content, 'utf8');
  
  console.log(`✅ Fixed ${fixCount} total corruptions in auth.js`);
}

if (require.main === module) {
  fixAuthFile();
}

module.exports = fixAuthFile;
