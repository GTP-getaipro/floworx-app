#!/usr/bin/env node

/**
 * Script to remove debugging console.log statements from production code
 * This script identifies and removes debugging statements while preserving
 * legitimate logging through the logger utility
 */

const fs = require('fs');
const path = require('path');

const DEBUG_ERROR_PATTERNS = [
  /console\.error\(['"`]❌.*?\);?/g,  // Error emoji logs
  /console\.error\(['"`]🚨.*?\);?/g,  // Alert emoji logs
  /console\.error\(['"`]Debug.*?\);?/g,       for (const pattern of DEBUG_PATTERNS) {
        const matches = modifiedContent.match(pattern);
        if (matches) {
          removedCount += matches.length;
          modifiedContent = modifiedContent.replace(pattern, '');
        }
      }

          }
  }

  /**
   * Print summary of changes
   */
  printSummary() {
    );
    console.log('=====================================');
    console.log(`Files processed: ${this.processedFiles}`);
    );

    if (this.results.length > 0) {
      console.log('\nDetailed Results:');
      this.results.forEach(result => {
        console.log(`  ${result.file}: ${result.removed} statements`);
      });
    }

    );

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
    );

    for (const dir of TARGET_DIRECTORIES) {
      if (fs.existsSync(dir)) {
        await this.scanDirectory(dir);
      }
    }

    );
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

        );
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
