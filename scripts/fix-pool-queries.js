#!/usr/bin/env node

/**
 * Fix pool.query usages in backend services
 * Replace with proper query function from unified-connection
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 FIXING POOL.QUERY USAGES');
console.log('===========================\n');

const filesToFix = [
  'backend/services/onboardingSessionService.js',
];

filesToFix.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }

  console.log(`📝 Processing: ${filePath}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Fix pool.query usages
  const poolQueryRegex = /await pool\.query\(/g;
  if (poolQueryRegex.test(content)) {
    content = content.replace(/await pool\.query\(/g, 'await query(');
    modified = true;
    console.log('   ✅ Fixed pool.query usages');
  }

  // Fix variable name conflicts where 'query' is used as both variable and function
  const lines = content.split('\n');
  const fixedLines = [];
  let inFunction = false;
  let functionBraceCount = 0;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Detect function start
    if (line.includes('async ') && line.includes('(')) {
      inFunction = true;
      functionBraceCount = 0;
    }
    
    // Count braces to track function scope
    if (inFunction) {
      functionBraceCount += (line.match(/\{/g) || []).length;
      functionBraceCount -= (line.match(/\}/g) || []).length;
      
      if (functionBraceCount <= 0 && line.includes('}')) {
        inFunction = false;
      }
    }

    // Fix variable name conflicts in function scope
    if (inFunction && line.includes('const query = `')) {
      // Determine appropriate variable name based on SQL operation
      if (line.includes('SELECT') || lines[i+1]?.includes('SELECT')) {
        line = line.replace('const query = `', 'const selectQuery = `');
        modified = true;
      } else if (line.includes('INSERT') || lines[i+1]?.includes('INSERT')) {
        line = line.replace('const query = `', 'const insertQuery = `');
        modified = true;
      } else if (line.includes('UPDATE') || lines[i+1]?.includes('UPDATE')) {
        line = line.replace('const query = `', 'const updateQuery = `');
        modified = true;
      } else if (line.includes('DELETE') || lines[i+1]?.includes('DELETE')) {
        line = line.replace('const query = `', 'const deleteQuery = `');
        modified = true;
      } else {
        line = line.replace('const query = `', 'const sqlQuery = `');
        modified = true;
      }
    }

    fixedLines.push(line);
  }

  if (modified) {
    content = fixedLines.join('\n');
    
    // Fix any remaining references to the old variable names
    content = content.replace(/await query\(query,/g, 'await query(selectQuery,');
    content = content.replace(/await query\(insertQuery,/g, 'await query(insertQuery,');
    content = content.replace(/await query\(updateQuery,/g, 'await query(updateQuery,');
    content = content.replace(/await query\(deleteQuery,/g, 'await query(deleteQuery,');
    content = content.replace(/await query\(sqlQuery,/g, 'await query(sqlQuery,');

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`   ✅ Fixed variable name conflicts`);
  }

  if (modified) {
    console.log(`   ✅ ${filePath} updated successfully\n`);
  } else {
    console.log(`   ℹ️  No changes needed for ${filePath}\n`);
  }
});

console.log('🎉 Pool query fixes completed!');
