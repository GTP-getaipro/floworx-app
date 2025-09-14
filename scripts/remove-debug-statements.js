#!/usr/bin/env node

/**
 * Script to remove debugging console.log statements from production code
 * This script identifies and removes debugging statements while preserving
 * legitimate logging through the logger utility
 */

const fs = require('fs');
const path = require('path');

// Patterns to identify debugging statements (not legitimate logging)
const DEBUG_PATTERNS = [
  /console\.log\(['"`]🔍.*?\);?/g,  // Debug emoji logs
  /console\.log\(['"`]✅.*?\);?/g,  // Success emoji logs
  /console\.log\(['"`]❌.*?\);?/g,  // Error emoji logs
  /console\.log\(['"`]🔗.*?\);?/g,  // Link emoji logs
  /console\.log\(['"`]📋.*?\);?/g,  // Clipboard emoji logs
  /console\.log\(['"`]⚠️.*?\);?/g,  // Warning emoji logs
  /console\.log\(['"`]🚨.*?\);?/g,  // Alert emoji logs
  /console\.log\(['"`]💡.*?\);?/g,  // Idea emoji logs
  /console\.log\(['"`]🎯.*?\);?/g,  // Target emoji logs
  /console\.log\(['"`]🛠️.*?\);?/g,  // Tools emoji logs
  /console\.log\(['"`]Debug.*?\);?/g, // Debug prefix logs
  /console\.log\(['"`]DEBUG.*?\);?/g, // DEBUG prefix logs
  /console\.log\(['"`]Testing.*?\);?/g, // Testing prefix logs
  /console\.log\(['"`]TESTING.*?\);?/g, // TESTING prefix logs
  /console\.log\(['"`]Available routes.*?\);?/g, // Route debugging
  /console\.log\(['"`]API Request.*?\);?/g, // API debugging
  /console\.log\(['"`]Current connection attempt.*?\);?/g, // Connection debugging
];

// Patterns for console.error debugging (not legitimate error handling)
const DEBUG_ERROR_PATTERNS = [
  /console\.error\(['"`]❌.*?\);?/g,  // Error emoji logs
  /console\.error\(['"`]🚨.*?\);?/g,  // Alert emoji logs
  /console\.error\(['"`]Debug.*?\);?/g, // Debug prefix errors
  /console\.error\(['"`]DEBUG.*?\);?/g, // DEBUG prefix errors
];

// Files to process (backend routes and services)
const TARGET_DIRECTORIES = [
  'backend/routes',
  'backend/services',
  'backend/middleware',
  'backend/utils'
];

// Files to exclude from processing
const EXCLUDE_FILES = [
  'logger.js',
  'errorTrackingService.js',
  'standardErrorHandler.js',
  'ErrorResponse.js'
];

class DebugStatementRemover {
  constructor() {
    this.processedFiles = 0;
    this.removedStatements = 0;
    this.results = [];
  }

  /**
   * Process all target directories
   */
  async processAll() {
    console.log('🧹 Starting debug statement removal...\n');

    for (const dir of TARGET_DIRECTORIES) {
      if (fs.existsSync(dir)) {
        await this.processDirectory(dir);
      }
    }

    this.printSummary();
  }

  /**
   * Process a directory recursively
   */
  async processDirectory(dirPath) {
    const items = fs.readdirSync(dirPath);

    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        await this.processDirectory(fullPath);
      } else if (stat.isFile() && item.endsWith('.js')) {
        if (!EXCLUDE_FILES.includes(item)) {
          await this.processFile(fullPath);
        }
      }
    }
  }

  /**
   * Process a single file
   */
  async processFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;
      let modifiedContent = content;
      let removedCount = 0;

      // Remove debug console.log statements
      for (const pattern of DEBUG_PATTERNS) {
        const matches = modifiedContent.match(pattern);
        if (matches) {
          removedCount += matches.length;
          modifiedContent = modifiedContent.replace(pattern, '');
        }
      }

      // Remove debug console.error statements
      for (const pattern of DEBUG_ERROR_PATTERNS) {
        const matches = modifiedContent.match(pattern);
        if (matches) {
          removedCount += matches.length;
          modifiedContent = modifiedContent.replace(pattern, '');
        }
      }

      // Clean up empty lines left by removed statements
      modifiedContent = modifiedContent.replace(/\n\s*\n\s*\n/g, '\n\n');

      // Only write if changes were made
      if (modifiedContent !== originalContent) {
        fs.writeFileSync(filePath, modifiedContent);
        this.processedFiles++;
        this.removedStatements += removedCount;
        
        this.results.push({
          file: filePath,
          removed: removedCount
        });

        console.log(`✅ ${filePath}: Removed ${removedCount} debug statements`);
      }

    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error.message);
    }
  }

  /**
   * Print summary of changes
   */
  printSummary() {
    console.log('\n📊 Debug Statement Removal Summary:');
    console.log('=====================================');
    console.log(`Files processed: ${this.processedFiles}`);
    console.log(`Debug statements removed: ${this.removedStatements}`);
    
    if (this.results.length > 0) {
      console.log('\nDetailed Results:');
      this.results.forEach(result => {
        console.log(`  ${result.file}: ${result.removed} statements`);
      });
    }

    console.log('\n✨ Debug statement cleanup complete!');
    
    if (this.removedStatements > 0) {
      console.log('\n⚠️  Remember to:');
      console.log('   1. Test the application to ensure functionality is preserved');
      console.log('   2. Commit these changes with a descriptive message');
      console.log('   3. Verify that legitimate error handling still works');
    }
  }

  /**
   * Dry run - show what would be removed without making changes
   */
  async dryRun() {
    console.log('🔍 Dry run - showing debug statements that would be removed...\n');

    for (const dir of TARGET_DIRECTORIES) {
      if (fs.existsSync(dir)) {
        await this.scanDirectory(dir);
      }
    }

    console.log(`\n📊 Dry run complete: Found ${this.removedStatements} debug statements in ${this.processedFiles} files`);
  }

  /**
   * Scan directory for debug statements without removing them
   */
  async scanDirectory(dirPath) {
    const items = fs.readdirSync(dirPath);

    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        await this.scanDirectory(fullPath);
      } else if (stat.isFile() && item.endsWith('.js')) {
        if (!EXCLUDE_FILES.includes(item)) {
          await this.scanFile(fullPath);
        }
      }
    }
  }

  /**
   * Scan a file for debug statements without removing them
   */
  async scanFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      let foundCount = 0;
      const foundStatements = [];

      // Check for debug console.log statements
      for (const pattern of DEBUG_PATTERNS) {
        const matches = content.match(pattern);
        if (matches) {
          foundCount += matches.length;
          foundStatements.push(...matches);
        }
      }

      // Check for debug console.error statements
      for (const pattern of DEBUG_ERROR_PATTERNS) {
        const matches = content.match(pattern);
        if (matches) {
          foundCount += matches.length;
          foundStatements.push(...matches);
        }
      }

      if (foundCount > 0) {
        this.processedFiles++;
        this.removedStatements += foundCount;
        
        console.log(`📁 ${filePath}: ${foundCount} debug statements found`);
        foundStatements.forEach(stmt => {
          console.log(`   - ${stmt.substring(0, 80)}${stmt.length > 80 ? '...' : ''}`);
        });
        console.log('');
      }

    } catch (error) {
      console.error(`❌ Error scanning ${filePath}:`, error.message);
    }
  }
}

// Main execution
async function main() {
  const remover = new DebugStatementRemover();
  
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run') || args.includes('-d');

  if (isDryRun) {
    await remover.dryRun();
  } else {
    await remover.processAll();
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = DebugStatementRemover;
