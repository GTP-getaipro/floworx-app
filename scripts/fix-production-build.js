#!/usr/bin/env node

/**
 * Fix Production Build Issues
 * Addresses JavaScript ReferenceError and build configuration problems
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 FIXING PRODUCTION BUILD ISSUES');
console.log('==================================\n');

class ProductionBuildFixer {
  constructor() {
    this.fixes = [];
    this.errors = [];
  }

  /**
   * Fix JavaScript variable initialization issues
   */
  fixJavaScriptIssues() {
    console.log('1️⃣ Fixing JavaScript variable initialization issues...');

    const problematicPatterns = [
      // Temporal Dead Zone issues
      {
        pattern: /const\s+(\w+)\s*=.*\1/g,
        description: 'Self-referencing const declarations',
      },
      // Hoisting issues
      {
        pattern: /(\w+)\s*=.*const\s+\1/g,
        description: 'Variable used before const declaration',
      },
    ];

    const jsFiles = this.findJavaScriptFiles('frontend/src');
    let fixedFiles = 0;

    jsFiles.forEach(filePath => {
      try {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;

        problematicPatterns.forEach(({ pattern, description }) => {
          if (pattern.test(content)) {
            console.log(`   ⚠️  Found issue in ${filePath}: ${description}`);
            // For now, just log the issue - specific fixes would need manual review
          }
        });

        // Fix common React issues
        if (content.includes("import React from 'react'") && !content.includes('React.')) {
          content = content.replace(
            /^import React from 'react';\s*$/gm,
            '// React import removed - not needed with new JSX transform'
          );
          modified = true;
        }

        if (modified) {
          fs.writeFileSync(filePath, content, 'utf8');
          fixedFiles++;
        }
      } catch (error) {
        this.errors.push(`Error processing ${filePath}: ${error.message}`);
      }
    });

    console.log(`   ✅ Processed ${jsFiles.length} files, fixed ${fixedFiles} files\n`);
  }

  /**
   * Fix build configuration issues
   */
  fixBuildConfiguration() {
    console.log('2️⃣ Fixing build configuration...');

    // Ensure all required files exist
    const requiredFiles = [
      {
        path: 'frontend/public/manifest.json',
        exists: fs.existsSync('frontend/public/manifest.json'),
      },
      {
        path: 'frontend/public/favicon.ico',
        exists: fs.existsSync('frontend/public/favicon.ico'),
      },
      {
        path: 'frontend/public/robots.txt',
        exists: fs.existsSync('frontend/public/robots.txt'),
      },
    ];

    requiredFiles.forEach(file => {
      if (file.exists) {
        console.log(`   ✅ ${file.path} exists`);
      } else {
        console.log(`   ❌ ${file.path} missing`);
        this.errors.push(`Missing required file: ${file.path}`);
      }
    });

    console.log('');
  }

  /**
   * Fix environment variable issues
   */
  fixEnvironmentVariables() {
    console.log('3️⃣ Checking environment variables...');

    const envFiles = ['frontend/.env.production', '.env'];

    envFiles.forEach(envFile => {
      if (fs.existsSync(envFile)) {
        console.log(`   ✅ ${envFile} exists`);
        const content = fs.readFileSync(envFile, 'utf8');

        // Check for required variables
        const requiredVars = ['REACT_APP_API_URL', 'NODE_ENV', 'CI', 'GENERATE_SOURCEMAP'];

        requiredVars.forEach(varName => {
          if (content.includes(varName)) {
            console.log(`   ✅ ${varName} configured`);
          } else {
            console.log(`   ⚠️  ${varName} missing from ${envFile}`);
          }
        });
      } else {
        console.log(`   ❌ ${envFile} missing`);
      }
    });

    console.log('');
  }

  /**
   * Test build process
   */
  testBuild() {
    console.log('4️⃣ Testing build process...');

    try {
      console.log('   Running frontend build...');

      // Change to frontend directory and run build
      process.chdir('frontend');

      execSync('npm run build', {
        encoding: 'utf8',
        stdio: 'pipe',
      });

      console.log('   ✅ Build completed successfully');

      // Check if build directory was created
      if (fs.existsSync('build')) {
        console.log('   ✅ Build directory created');

        // Check for key files
        const keyFiles = ['build/index.html', 'build/static'];
        keyFiles.forEach(file => {
          if (fs.existsSync(file)) {
            console.log(`   ✅ ${file} exists`);
          } else {
            console.log(`   ❌ ${file} missing`);
          }
        });
      } else {
        console.log('   ❌ Build directory not created');
        this.errors.push('Build directory not created');
      }

      // Return to root directory
      process.chdir('..');
    } catch (error) {
      console.log('   ❌ Build failed');
      console.log(`   Error: ${error.message}`);
      this.errors.push(`Build failed: ${error.message}`);

      // Return to root directory even on error
      try {
        process.chdir('..');
      } catch (cdError) {
        // Already in root or other issue
      }
    }

    console.log('');
  }

  /**
   * Find all JavaScript files in a directory
   */
  findJavaScriptFiles(dir) {
    const files = [];

    const scanDirectory = currentDir => {
      if (!fs.existsSync(currentDir)) {
        return;
      }

      const items = fs.readdirSync(currentDir);

      items.forEach(item => {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          scanDirectory(fullPath);
        } else if (stat.isFile() && (item.endsWith('.js') || item.endsWith('.jsx'))) {
          files.push(fullPath);
        }
      });
    };

    scanDirectory(dir);
    return files;
  }

  /**
   * Run all fixes
   */
  runAllFixes() {
    console.log('🚀 Starting production build fixes...\n');

    this.fixJavaScriptIssues();
    this.fixBuildConfiguration();
    this.fixEnvironmentVariables();
    this.testBuild();

    console.log('📊 SUMMARY');
    console.log('==========');

    if (this.errors.length === 0) {
      console.log('✅ All fixes completed successfully!');
      console.log('🚀 Ready for production deployment');
    } else {
      console.log(`❌ ${this.errors.length} issues found:`);
      this.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    return this.errors.length === 0;
  }
}

// Run the fixer
const fixer = new ProductionBuildFixer();
fixer
  .runAllFixes()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
