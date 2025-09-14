#!/usr/bin/env node

/**
 * Remove Debug Environment Output Script
 * Systematically removes debugging environment variable output from production code
 */

const fs = require('fs');
const path = require('path');

class DebugEnvironmentRemover {
  constructor() {
    this.processedFiles = 0;
    this.removedStatements = 0;
    this.modifiedFiles = [];
    this.errors = [];
    
    // Patterns to identify debug environment output
    this.debugPatterns = [
      // Console statements with environment debug
      /console\.(log|info|warn|error)\s*\(\s*['"`].*(?:DEBUG|ENVIRONMENT|ENV|COOLIFY).*['"`]/gi,
      
      // Environment variable logging patterns
      /console\.(log|info|warn|error)\s*\(\s*['"`].*process\.env.*['"`]/gi,
      
      // Debug environment blocks
      /\/\/.*(?:DEBUG|TEMPORARY|REMOVE).*\n[\s\S]*?console\.(log|info|warn|error)[\s\S]*?(?:\n|$)/gi,
      
      // Coolify-specific debug statements
      /console\.(log|info|warn|error)\s*\(\s*['"`].*COOLIFY.*['"`]/gi,
      
      // Environment variable display patterns
      /console\.(log|info|warn|error)\s*\(\s*['"`][^'"`]*['"`]\s*,\s*process\.env\./gi,
      
      // Multi-line environment debug blocks
      /console\.(log|info|warn|error)\s*\(\s*['"`]={3,}['"`]\s*\);?\s*\n[\s\S]*?console\.(log|info|warn|error)[\s\S]*?['"`]={3,}['"`]/gi,
      
      // Environment loading debug messages
      /console\.(log|info|warn|error)\s*\(\s*['"`].*Environment loaded.*['"`]/gi,
      
      // Database connection debug with environment
      /console\.(log|info|warn|error)\s*\(\s*['"`].*(?:DB_|DATABASE_|REDIS_|SUPABASE_).*['"`]/gi
    ];
    
    // Files to process
    this.targetDirectories = [
      'backend',
      'scripts'
    ];
    
    // Files to exclude
    this.excludePatterns = [
      /node_modules/,
      /\.git/,
      /coverage/,
      /logs/,
      /\.log$/,
      /\.md$/,
      /\.json$/,
      /\.txt$/,
      /\.env/,
      /package-lock\.json/,
      /remove-debug-environment\.js$/ // Don't process this script itself
    ];
  }

  /**
   * Main execution method
   */
  async run(dryRun = false) {
    console.log('🧹 Debug Environment Output Removal Tool');
    console.log('========================================\n');
    
    if (dryRun) {
      console.log('🔍 DRY RUN MODE - No files will be modified\n');
    }

    try {
      // Process target directories
      for (const dir of this.targetDirectories) {
        if (fs.existsSync(dir)) {
          await this.processDirectory(dir, dryRun);
        }
      }

      // Process root-level debug files
      await this.processRootDebugFiles(dryRun);

      // Display results
      this.displayResults(dryRun);

    } catch (error) {
      console.error('❌ Error during processing:', error.message);
      process.exit(1);
    }
  }

  /**
   * Process a directory recursively
   */
  async processDirectory(dirPath, dryRun) {
    const items = fs.readdirSync(dirPath);

    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        // Skip excluded directories
        if (!this.shouldExclude(fullPath)) {
          await this.processDirectory(fullPath, dryRun);
        }
      } else if (stat.isFile()) {
        // Process JavaScript files
        if (this.shouldProcessFile(fullPath)) {
          await this.processFile(fullPath, dryRun);
        }
      }
    }
  }

  /**
   * Process root-level debug files
   */
  async processRootDebugFiles(dryRun) {
    const debugFiles = [
      'coolify-debug.js',
      'debug-coolify-env.js',
      'diagnose-coolify-env.js',
      'db-connection-fix.js',
      'fix-coolify-deployment.js'
    ];

    for (const file of debugFiles) {
      if (fs.existsSync(file)) {
        console.log(`🗑️  Removing debug file: ${file}`);
        if (!dryRun) {
          fs.unlinkSync(file);
          this.modifiedFiles.push({ file, action: 'deleted', changes: 1 });
        }
      }
    }
  }

  /**
   * Check if file should be excluded
   */
  shouldExclude(filePath) {
    return this.excludePatterns.some(pattern => pattern.test(filePath));
  }

  /**
   * Check if file should be processed
   */
  shouldProcessFile(filePath) {
    return filePath.endsWith('.js') && !this.shouldExclude(filePath);
  }

  /**
   * Process a single file
   */
  async processFile(filePath, dryRun) {
    try {
      this.processedFiles++;
      
      const content = fs.readFileSync(filePath, 'utf8');
      let modifiedContent = content;
      let fileChanges = 0;

      // Apply each debug pattern
      for (const pattern of this.debugPatterns) {
        const matches = modifiedContent.match(pattern);
        if (matches) {
          fileChanges += matches.length;
          modifiedContent = modifiedContent.replace(pattern, '');
        }
      }

      // Clean up empty lines and fix formatting
      if (fileChanges > 0) {
        modifiedContent = this.cleanupFormatting(modifiedContent);
        
        this.removedStatements += fileChanges;
        this.modifiedFiles.push({
          file: filePath,
          action: 'modified',
          changes: fileChanges
        });

        if (!dryRun) {
          fs.writeFileSync(filePath, modifiedContent, 'utf8');
        }

        console.log(`✅ ${filePath}: ${fileChanges} debug statements removed`);
      }

    } catch (error) {
      this.errors.push({
        file: filePath,
        error: error.message
      });
      console.error(`❌ Error processing ${filePath}: ${error.message}`);
    }
  }

  /**
   * Clean up formatting after removing debug statements
   */
  cleanupFormatting(content) {
    return content
      // Remove multiple consecutive empty lines
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      // Remove trailing whitespace
      .replace(/[ \t]+$/gm, '')
      // Ensure file ends with single newline
      .replace(/\n*$/, '\n');
  }

  /**
   * Display processing results
   */
  displayResults(dryRun) {
    console.log('\n📊 PROCESSING RESULTS:');
    console.log('======================');
    console.log(`📁 Files processed: ${this.processedFiles}`);
    console.log(`🧹 Debug statements removed: ${this.removedStatements}`);
    console.log(`📝 Files modified: ${this.modifiedFiles.length}`);
    console.log(`❌ Errors encountered: ${this.errors.length}`);

    if (this.modifiedFiles.length > 0) {
      console.log('\n📋 MODIFIED FILES:');
      console.log('==================');
      this.modifiedFiles.forEach(({ file, action, changes }) => {
        const actionIcon = action === 'deleted' ? '🗑️' : '✏️';
        console.log(`${actionIcon} ${file}: ${changes} ${action === 'deleted' ? 'file deleted' : 'changes'}`);
      });
    }

    if (this.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      console.log('===========');
      this.errors.forEach(({ file, error }) => {
        console.log(`❌ ${file}: ${error}`);
      });
    }

    if (dryRun) {
      console.log('\n🔍 DRY RUN COMPLETE - No files were actually modified');
      console.log('Run without --dry-run to apply changes');
    } else {
      console.log('\n✅ DEBUG ENVIRONMENT CLEANUP COMPLETE!');
      
      if (this.removedStatements > 0) {
        console.log(`\n🎯 Successfully removed ${this.removedStatements} debug environment statements`);
        console.log('Production code is now clean of debugging environment output!');
      } else {
        console.log('\n✨ No debug environment statements found - code is already clean!');
      }
    }
  }
}

// Main execution
if (require.main === module) {
  const dryRun = process.argv.includes('--dry-run');
  const remover = new DebugEnvironmentRemover();
  remover.run(dryRun);
}

module.exports = DebugEnvironmentRemover;
