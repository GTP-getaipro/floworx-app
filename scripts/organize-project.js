#!/usr/bin/env node

/**
 * Project Organization Script
 * Cleans up root directory clutter and organizes files properly
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration for file organization
const ORGANIZATION_CONFIG = {
  // Files to move from root to appropriate directories
  moveFiles: {
    'archive/debug-files/': [
      'debug-*.js', 'debug-*.png', 'debug-*.html', 'debug-*.txt',
      'browser-*.js', 'browser-*.html', 'check-*.js', 'check-*.html'
    ],
    'archive/test-files/': [
      'test-*.js', 'test-*.json', 'test-*.spec.js', 'test-*.html',
      'comprehensive-*.js', 'comprehensive-*.json', 'comprehensive-*.md',
      'final-*.js', 'master-*.js', 'run-*.js', 'validate-*.js', 'verify-*.js'
    ],
    'archive/temp-configs/': [
      'package-*.json', '*-ACTUAL.txt', 'oauth-*.txt'
    ],
    'docs/deployment/': [
      '*_DEPLOYMENT_*.md', '*_GUIDE.md', '*_CHECKLIST.md', '*_STATUS.md'
    ],
    'docs/testing/': [
      '*_TEST_*.md', '*_TESTING_*.md', 'CYPRESS_*.md', 'E2E_*.md'
    ],
    'docs/security/': [
      '*_SECURITY_*.md', '*_RECOVERY_*.md', 'RLS_*.md'
    ]
  },

  // Files to keep in root (essential project files)
  keepInRoot: [
    'package.json', 'package-lock.json', 'README.md', 'LICENSE',
    '.gitignore', '.env.example', 'docker-compose.yml', 'Dockerfile',
    'vercel.json', 'babel.config.js', 'jest.config.js', 'playwright.config.js',
    'cypress.config.js', 'start.sh', 'setup.js'
  ],

  // Directories to create if they don't exist
  createDirectories: [
    'archive', 'archive/debug-files', 'archive/test-files', 'archive/temp-configs',
    'docs/deployment', 'docs/testing', 'docs/security', 'docs/analysis'
  ]
};

class ProjectOrganizer {
  constructor() {
    this.rootDir = process.cwd();
    this.movedFiles = [];
    this.errors = [];
  }

  /**
   * Main organization function
   */
  async organize() {
    console.log('🧹 Starting Project Organization...');
    console.log('=====================================');

    try {
      // Create necessary directories
      this.createDirectories();
      
      // Move files to appropriate locations
      await this.moveFiles();
      
      // Generate organization report
      this.generateReport();
      
      console.log('\n✅ Project organization completed successfully!');
      console.log(`📁 Moved ${this.movedFiles.length} files`);
      console.log(`❌ ${this.errors.length} errors encountered`);
      
    } catch (error) {
      console.error('❌ Organization failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Create necessary directories
   */
  createDirectories() {
    console.log('📁 Creating directory structure...');
    
    ORGANIZATION_CONFIG.createDirectories.forEach(dir => {
      const fullPath = path.join(this.rootDir, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`   ✅ Created: ${dir}`);
      }
    });
  }

  /**
   * Move files to appropriate directories
   */
  async moveFiles() {
    console.log('\n📦 Moving files to appropriate locations...');
    
    // Get all files in root directory
    const rootFiles = fs.readdirSync(this.rootDir)
      .filter(file => fs.statSync(path.join(this.rootDir, file)).isFile())
      .filter(file => !ORGANIZATION_CONFIG.keepInRoot.includes(file));

    // Process each move configuration
    for (const [targetDir, patterns] of Object.entries(ORGANIZATION_CONFIG.moveFiles)) {
      for (const pattern of patterns) {
        const matchingFiles = this.matchFiles(rootFiles, pattern);
        
        for (const file of matchingFiles) {
          try {
            await this.moveFile(file, targetDir);
          } catch (error) {
            this.errors.push({ file, error: error.message });
            console.log(`   ❌ Failed to move ${file}: ${error.message}`);
          }
        }
      }
    }
  }

  /**
   * Match files against a pattern
   */
  matchFiles(files, pattern) {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return files.filter(file => regex.test(file));
  }

  /**
   * Move a single file
   */
  async moveFile(filename, targetDir) {
    const sourcePath = path.join(this.rootDir, filename);
    const targetPath = path.join(this.rootDir, targetDir, filename);
    
    // Ensure target directory exists
    const targetDirPath = path.dirname(targetPath);
    if (!fs.existsSync(targetDirPath)) {
      fs.mkdirSync(targetDirPath, { recursive: true });
    }
    
    // Move the file
    fs.renameSync(sourcePath, targetPath);
    this.movedFiles.push({ from: filename, to: path.join(targetDir, filename) });
    console.log(`   📦 Moved: ${filename} → ${targetDir}`);
  }

  /**
   * Generate organization report
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFilesMoved: this.movedFiles.length,
        errorsEncountered: this.errors.length,
        directoriesCreated: ORGANIZATION_CONFIG.createDirectories.length
      },
      movedFiles: this.movedFiles,
      errors: this.errors,
      recommendations: [
        'Review moved files in archive/ directories',
        'Update any hardcoded file paths in scripts',
        'Consider adding the archive/ directory to .gitignore',
        'Update documentation to reflect new file structure'
      ]
    };

    const reportPath = path.join(this.rootDir, 'docs/analysis/organization-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📊 Organization report saved: ${reportPath}`);
  }
}

// Run the organizer if called directly
if (require.main === module) {
  const organizer = new ProjectOrganizer();
  organizer.organize().catch(console.error);
}

module.exports = ProjectOrganizer;
