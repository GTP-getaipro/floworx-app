#!/usr/bin/env node

/**
 * Fix Missing Imports - Emergency Repair
 * 
 * Fixes missing imports across all route files
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

function fixMissingImports() {
  console.log('🔧 Fixing missing imports across route files...');
  
  const routeFiles = glob.sync('backend/routes/*.js', { cwd: process.cwd() });
  let totalFixes = 0;
  
  routeFiles.forEach(filePath => {
    const fullPath = path.join(process.cwd(), filePath);
    let content = fs.readFileSync(fullPath, 'utf8');
    let fileFixed = false;
    
    // Check if file uses body() but doesn't import it
    if (content.includes('body(') && !content.includes('body,') && !content.includes('{ body }')) {
      console.log(`   Adding body import to ${filePath}`);
      
      // Find express-validator import line or add it
      if (content.includes('express-validator')) {
        content = content.replace(
          /const\s*{\s*([^}]*)\s*}\s*=\s*require\(['"]express-validator['"]\);/,
          (match, imports) => {
            if (!imports.includes('body')) {
              const newImports = imports.trim() ? `${imports.trim()}, body` : 'body';
              return `const { ${newImports} } = require('express-validator');`;
            }
            return match;
          }
        );
      } else {
        // Add new import after express import
        content = content.replace(
          /(const express = require\(['"]express['"]\);)/,
          '$1\nconst { body, validationResult } = require(\'express-validator\');'
        );
      }
      fileFixed = true;
    }
    
    // Check if file uses validationResult() but doesn't import it
    if (content.includes('validationResult(') && !content.includes('validationResult,') && !content.includes('{ validationResult }')) {
      console.log(`   Adding validationResult import to ${filePath}`);
      
      if (content.includes('express-validator')) {
        content = content.replace(
          /const\s*{\s*([^}]*)\s*}\s*=\s*require\(['"]express-validator['"]\);/,
          (match, imports) => {
            if (!imports.includes('validationResult')) {
              const newImports = imports.trim() ? `${imports.trim()}, validationResult` : 'validationResult';
              return `const { ${newImports} } = require('express-validator');`;
            }
            return match;
          }
        );
      } else {
        content = content.replace(
          /(const express = require\(['"]express['"]\);)/,
          '$1\nconst { body, validationResult } = require(\'express-validator\');'
        );
      }
      fileFixed = true;
    }
    
    // Check if file uses asyncHandler() but doesn't import it
    if (content.includes('asyncHandler(') && !content.includes('asyncHandler,') && !content.includes('{ asyncHandler }')) {
      console.log(`   Adding asyncHandler import to ${filePath}`);
      
      if (content.includes('standardErrorHandler')) {
        content = content.replace(
          /const\s*{\s*([^}]*)\s*}\s*=\s*require\(['"][^'"]*standardErrorHandler['"]\);/,
          (match, imports) => {
            if (!imports.includes('asyncHandler')) {
              const newImports = imports.trim() ? `${imports.trim()}, asyncHandler` : 'asyncHandler';
              return match.replace(`{ ${imports.trim()} }`, `{ ${newImports} }`);
            }
            return match;
          }
        );
      } else {
        content = content.replace(
          /(const express = require\(['"]express['"]\);)/,
          '$1\nconst { asyncHandler } = require(\'../middleware/standardErrorHandler\');'
        );
      }
      fileFixed = true;
    }
    
    if (fileFixed) {
      fs.writeFileSync(fullPath, content, 'utf8');
      totalFixes++;
    }
  });
  
  console.log(`✅ Fixed imports in ${totalFixes} files`);
}

if (require.main === module) {
  fixMissingImports();
}

module.exports = fixMissingImports;
