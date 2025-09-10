#!/usr/bin/env node

/**
 * Convert Mocha test files to Jest syntax
 * Handles common patterns like function() -> arrow functions, chai assertions -> Jest assertions
 */

const fs = require('fs');
const path = require('path');

class MochaToJestConverter {
  constructor() {
    this.conversions = [
      // Function declarations
      { pattern: /describe\s*\(\s*(['"`][^'"`]*['"`])\s*,\s*function\s*\(\s*\)\s*{/g, replacement: 'describe($1, () => {' },
      { pattern: /it\s*\(\s*(['"`][^'"`]*['"`])\s*,\s*async\s+function\s*\(\s*\)\s*{/g, replacement: 'it($1, async () => {' },
      { pattern: /it\s*\(\s*(['"`][^'"`]*['"`])\s*,\s*function\s*\(\s*\)\s*{/g, replacement: 'it($1, () => {' },
      
      // Lifecycle hooks
      { pattern: /before\s*\(\s*async\s+function\s*\(\s*\)\s*{/g, replacement: 'beforeAll(async () => {' },
      { pattern: /before\s*\(\s*function\s*\(\s*\)\s*{/g, replacement: 'beforeAll(() => {' },
      { pattern: /after\s*\(\s*async\s+function\s*\(\s*\)\s*{/g, replacement: 'afterAll(async () => {' },
      { pattern: /after\s*\(\s*function\s*\(\s*\)\s*{/g, replacement: 'afterAll(() => {' },
      { pattern: /beforeEach\s*\(\s*async\s+function\s*\(\s*\)\s*{/g, replacement: 'beforeEach(async () => {' },
      { pattern: /beforeEach\s*\(\s*function\s*\(\s*\)\s*{/g, replacement: 'beforeEach(() => {' },
      { pattern: /afterEach\s*\(\s*async\s+function\s*\(\s*\)\s*{/g, replacement: 'afterEach(async () => {' },
      { pattern: /afterEach\s*\(\s*function\s*\(\s*\)\s*{/g, replacement: 'afterEach(() => {' },
      
      // Chai assertions to Jest assertions
      { pattern: /expect\(([^)]+)\)\.to\.equal\(([^)]+)\)/g, replacement: 'expect($1).toBe($2)' },
      { pattern: /expect\(([^)]+)\)\.to\.be\.true/g, replacement: 'expect($1).toBe(true)' },
      { pattern: /expect\(([^)]+)\)\.to\.be\.false/g, replacement: 'expect($1).toBe(false)' },
      { pattern: /expect\(([^)]+)\)\.to\.be\.null/g, replacement: 'expect($1).toBeNull()' },
      { pattern: /expect\(([^)]+)\)\.to\.be\.undefined/g, replacement: 'expect($1).toBeUndefined()' },
      { pattern: /expect\(([^)]+)\)\.to\.have\.property\(([^)]+)\)/g, replacement: 'expect($1).toHaveProperty($2)' },
      { pattern: /expect\(([^)]+)\)\.to\.have\.property\(([^,]+),\s*([^)]+)\)/g, replacement: 'expect($1).toHaveProperty($2, $3)' },
      { pattern: /expect\(([^)]+)\)\.to\.not\.have\.property\(([^)]+)\)/g, replacement: 'expect($1).not.toHaveProperty($2)' },
      { pattern: /expect\(([^)]+)\)\.to\.be\.an\((['"`][^'"`]*['"`])\)/g, replacement: 'expect(Array.isArray($1) ? "array" : typeof $1).toBe($2)' },
      { pattern: /expect\(([^)]+)\)\.to\.be\.greaterThan\(([^)]+)\)/g, replacement: 'expect($1).toBeGreaterThan($2)' },
      { pattern: /expect\(([^)]+)\)\.to\.be\.lessThan\(([^)]+)\)/g, replacement: 'expect($1).toBeLessThan($2)' },
      { pattern: /expect\(([^)]+)\)\.to\.include\(([^)]+)\)/g, replacement: 'expect($1).toContain($2)' },
      { pattern: /expect\(([^)]+)\)\.to\.not\.include\(([^)]+)\)/g, replacement: 'expect($1).not.toContain($2)' },
      { pattern: /expect\(([^)]+)\)\.to\.have\.length\(([^)]+)\)/g, replacement: 'expect($1).toHaveLength($2)' },
      
      // Remove chai import
      { pattern: /const\s+{\s*expect\s*}\s*=\s*require\(['"`]chai['"`]\);\s*\n/g, replacement: '' },
      { pattern: /const\s+chai\s*=\s*require\(['"`]chai['"`]\);\s*\n/g, replacement: '' },
      
      // Remove this.timeout() calls
      { pattern: /this\.timeout\([^)]*\);\s*\n/g, replacement: '' }
    ];
  }

  convertFile(filePath) {
    console.log(`Converting ${filePath}...`);
    
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    
    // Apply all conversions
    for (const conversion of this.conversions) {
      content = content.replace(conversion.pattern, conversion.replacement);
    }
    
    // Handle timeout in beforeAll/afterAll
    content = content.replace(
      /(beforeAll\(async \(\) => \{[\s\S]*?\}\))/g,
      (match) => match + ', 90000'
    );
    
    // Write back if changed
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Converted ${filePath}`);
      return true;
    } else {
      console.log(`⏭️  No changes needed for ${filePath}`);
      return false;
    }
  }

  convertDirectory(dirPath) {
    const files = fs.readdirSync(dirPath);
    let convertedCount = 0;
    
    for (const file of files) {
      const fullPath = path.join(dirPath, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
        convertedCount += this.convertDirectory(fullPath);
      } else if (stat.isFile() && (file.endsWith('.test.js') || file.endsWith('.spec.js'))) {
        if (this.convertFile(fullPath)) {
          convertedCount++;
        }
      }
    }
    
    return convertedCount;
  }
}

// Main execution
if (require.main === module) {
  const converter = new MochaToJestConverter();
  
  console.log('🔄 Converting Mocha tests to Jest syntax...\n');
  
  const testDirectories = [
    './tests/e2e/suites',
    './tests/integration'
  ];
  
  let totalConverted = 0;
  
  for (const dir of testDirectories) {
    if (fs.existsSync(dir)) {
      console.log(`\n📁 Processing ${dir}...`);
      totalConverted += converter.convertDirectory(dir);
    }
  }
  
  console.log(`\n🎉 Conversion complete! ${totalConverted} files converted.`);
}

module.exports = MochaToJestConverter;
