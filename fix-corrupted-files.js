#!/usr/bin/env node

/**
 * Fix Corrupted Files - Emergency Repair
 * 
 * Fixes files that were corrupted by the automated issue fixer
 * Specifically fixes ifAdvanced -> if and catchAdvanced -> catch
 */

const fs = require('fs');
const path = require('path');

class CorruptionFixer {
  constructor() {
    this.projectRoot = process.cwd();
    this.fixedFiles = [];
  }

  async fixAllCorruptions() {
    console.log('🚨 EMERGENCY: Fixing corrupted files...\n');

    // Get all corrupted files
    const corruptedFiles = await this.findCorruptedFiles();
    
    console.log(`Found ${corruptedFiles.length} corrupted files to fix\n`);

    for (const filePath of corruptedFiles) {
      await this.fixFile(filePath);
    }

    console.log('\n✅ All corruptions fixed!');
    console.log(`📊 Fixed ${this.fixedFiles.length} files`);
  }

  async findCorruptedFiles() {
    const files = [];
    const extensions = ['.js', '.jsx', '.ts', '.tsx'];
    
    const scanDirectory = (dir) => {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !['node_modules', '.git', 'dist', 'build'].includes(item)) {
          scanDirectory(fullPath);
        } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
          // Check if file contains corrupted patterns
          const content = fs.readFileSync(fullPath, 'utf8');
          // Check for any corrupted control flow statements
          const suffixes = ['Advanced', 'WithTTL', 'Alternative', 'Enhanced', 'Improved', 'Updated',
                           'Modified', 'Extended', 'Optimized', 'Refined', 'Custom', 'Special',
                           'V2', 'V3', 'New', 'Old', 'Temp', 'Final', 'Beta', 'Alpha'];
          const numbers = Array.from({length: 21}, (_, i) => i.toString());
          const allSuffixes = [...suffixes, ...numbers];

          const hasCorruption = allSuffixes.some(suffix =>
            content.includes(`if${suffix}`) || content.includes(`catch${suffix}`) ||
            content.includes(`for${suffix}`) || content.includes(`while${suffix}`) ||
            content.includes(`switch${suffix}`) || content.includes(`try${suffix}`)
          );

          if (hasCorruption) {
            files.push(fullPath);
          }
        }
      }
    };

    scanDirectory(this.projectRoot);
    return files;
  }

  async fixFile(filePath) {
    try {
      console.log(`🔧 Fixing: ${path.relative(this.projectRoot, filePath)}`);
      
      let content = fs.readFileSync(filePath, 'utf8');
      let originalContent = content;
      
      // Fix all corrupted patterns - comprehensive list
      const patterns = [
        'Advanced', 'WithTTL', 'Alternative', 'Enhanced', 'Improved', 'Updated',
        'Modified', 'Extended', 'Optimized', 'Refined', 'Custom', 'Special',
        'V2', 'V3', 'New', 'Old', 'Temp', 'Final', 'Beta', 'Alpha'
      ];

      patterns.forEach(suffix => {
        content = content.replace(new RegExp(`if${suffix}\\s*\\(`, 'g'), 'if (');
        content = content.replace(new RegExp(`else\\s+if${suffix}\\s*\\(`, 'g'), 'else if (');
        content = content.replace(new RegExp(`catch${suffix}\\s*\\(`, 'g'), 'catch (');
        content = content.replace(new RegExp(`for${suffix}\\s*\\(`, 'g'), 'for (');
        content = content.replace(new RegExp(`while${suffix}\\s*\\(`, 'g'), 'while (');
        content = content.replace(new RegExp(`switch${suffix}\\s*\\(`, 'g'), 'switch (');
        content = content.replace(new RegExp(`try${suffix}\\s*\\{`, 'g'), 'try {');
      });

      // Fix numeric suffixes (if1, if2, etc.)
      for (let i = 0; i <= 20; i++) {
        content = content.replace(new RegExp(`if${i}\\s*\\(`, 'g'), 'if (');
        content = content.replace(new RegExp(`else\\s+if${i}\\s*\\(`, 'g'), 'else if (');
        content = content.replace(new RegExp(`catch${i}\\s*\\(`, 'g'), 'catch (');
        content = content.replace(new RegExp(`for${i}\\s*\\(`, 'g'), 'for (');
        content = content.replace(new RegExp(`while${i}\\s*\\(`, 'g'), 'while (');
        content = content.replace(new RegExp(`switch${i}\\s*\\(`, 'g'), 'switch (');
        content = content.replace(new RegExp(`try${i}\\s*\\{`, 'g'), 'try {');
      }
      
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        this.fixedFiles.push(filePath);
        console.log(`   ✅ Fixed corrupted control flow statements`);
      } else {
        console.log(`   ⚠️  No corruptions found`);
      }
      
    } catch (error) {
      console.error(`   ❌ Error fixing ${filePath}:`, error.message);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const fixer = new CorruptionFixer();
  fixer.fixAllCorruptions().catch(error => {
    console.error('❌ Error during corruption fixing:', error);
    process.exit(1);
  });
}

module.exports = CorruptionFixer;
