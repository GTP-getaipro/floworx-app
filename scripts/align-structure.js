#!/usr/bin/env node

/**
 * Directory Structure Alignment Script for FloWorx SaaS
 * Ensures consistent file naming and directory structure across frontend and backend
 */

const fs = require('fs');
const path = require('path');

/**
 * Desired directory structure for both frontend and backend
 */
const DESIRED_STRUCTURE = {
  // Core directories
  components: {
    description: 'Reusable UI components (frontend) / Business logic components (backend)',
    subdirs: ['common', 'forms', 'layout', 'ui']
  },
  
  services: {
    description: 'Business logic and external service integrations',
    subdirs: ['api', 'auth', 'email', 'cache', 'analytics']
  },
  
  utils: {
    description: 'Utility functions and helpers',
    subdirs: ['validation', 'formatting', 'security']
  },
  
  hooks: {
    description: 'Custom React hooks (frontend) / Event hooks (backend)',
    subdirs: ['auth', 'api', 'form', 'ui']
  },
  
  types: {
    description: 'TypeScript type definitions and interfaces',
    subdirs: ['api', 'auth', 'business', 'ui']
  },
  
  constants: {
    description: 'Application constants and configuration',
    subdirs: ['api', 'business', 'ui', 'validation']
  },
  
  middleware: {
    description: 'Request/response middleware (backend) / Route guards (frontend)',
    subdirs: ['auth', 'validation', 'security', 'performance']
  },
  
  routes: {
    description: 'API routes (backend) / Page routes (frontend)',
    subdirs: ['auth', 'api', 'admin', 'user']
  },
  
  schemas: {
    description: 'Validation schemas and data models',
    subdirs: ['auth', 'user', 'business', 'workflow']
  },
  
  tests: {
    description: 'Test files and test utilities',
    subdirs: ['unit', 'integration', 'e2e', 'fixtures']
  }
};

/**
 * File naming conventions
 */
const NAMING_CONVENTIONS = {
  // Component files
  components: {
    pattern: /^[A-Z][a-zA-Z0-9]*\.(js|jsx|ts|tsx)$/,
    example: 'UserProfile.jsx',
    description: 'PascalCase for component files'
  },
  
  // Service files
  services: {
    pattern: /^[a-z][a-zA-Z0-9]*Service\.(js|ts)$/,
    example: 'authService.js',
    description: 'camelCase ending with "Service"'
  },
  
  // Utility files
  utils: {
    pattern: /^[a-z][a-zA-Z0-9]*\.(js|ts)$/,
    example: 'dateUtils.js',
    description: 'camelCase for utility files'
  },
  
  // Hook files
  hooks: {
    pattern: /^use[A-Z][a-zA-Z0-9]*\.(js|jsx|ts|tsx)$/,
    example: 'useAuth.js',
    description: 'camelCase starting with "use" for hooks'
  },
  
  // Type files
  types: {
    pattern: /^[a-z][a-zA-Z0-9]*\.(d\.ts|types\.ts)$/,
    example: 'auth.types.ts',
    description: 'camelCase ending with ".types.ts" or ".d.ts"'
  },
  
  // Constant files
  constants: {
    pattern: /^[a-z][a-zA-Z0-9]*Constants\.(js|ts)$/,
    example: 'apiConstants.js',
    description: 'camelCase ending with "Constants"'
  },
  
  // Route files
  routes: {
    pattern: /^[a-z][a-zA-Z0-9]*\.(js|ts)$/,
    example: 'authRoutes.js',
    description: 'camelCase for route files'
  },
  
  // Schema files
  schemas: {
    pattern: /^[a-z][a-zA-Z0-9]*Schema\.(js|ts)$/,
    example: 'userSchema.js',
    description: 'camelCase ending with "Schema"'
  },
  
  // Test files
  tests: {
    pattern: /^[a-z][a-zA-Z0-9]*\.(test|spec)\.(js|jsx|ts|tsx)$/,
    example: 'authService.test.js',
    description: 'camelCase ending with ".test.js" or ".spec.js"'
  }
};

/**
 * Analyze directory structure
 */
function analyzeStructure(basePath) {
  const analysis = {
    existing: {},
    missing: [],
    misnamed: [],
    suggestions: []
  };

  // Check existing directories
  if (fs.existsSync(basePath)) {
    const items = fs.readdirSync(basePath, { withFileTypes: true });
    
    items.forEach(item => {
      if (item.isDirectory()) {
        analysis.existing[item.name] = {
          path: path.join(basePath, item.name),
          files: getFilesRecursively(path.join(basePath, item.name))
        };
      }
    });
  }

  // Check for missing directories
  Object.keys(DESIRED_STRUCTURE).forEach(dirName => {
    if (!analysis.existing[dirName]) {
      analysis.missing.push({
        name: dirName,
        description: DESIRED_STRUCTURE[dirName].description,
        suggestedPath: path.join(basePath, dirName)
      });
    }
  });

  // Check file naming conventions
  Object.entries(analysis.existing).forEach(([dirName, dirInfo]) => {
    if (NAMING_CONVENTIONS[dirName]) {
      const convention = NAMING_CONVENTIONS[dirName];
      
      dirInfo.files.forEach(filePath => {
        const fileName = path.basename(filePath);
        if (!convention.pattern.test(fileName)) {
          analysis.misnamed.push({
            currentPath: filePath,
            currentName: fileName,
            expectedPattern: convention.description,
            example: convention.example
          });
        }
      });
    }
  });

  return analysis;
}

/**
 * Get all files recursively
 */
function getFilesRecursively(dirPath) {
  const files = [];
  
  if (!fs.existsSync(dirPath)) return files;
  
  const items = fs.readdirSync(dirPath, { withFileTypes: true });
  
  items.forEach(item => {
    const fullPath = path.join(dirPath, item.name);
    
    if (item.isDirectory()) {
      files.push(...getFilesRecursively(fullPath));
    } else {
      files.push(fullPath);
    }
  });
  
  return files;
}

/**
 * Generate structure report
 */
function generateReport(frontendAnalysis, backendAnalysis) {
  const report = {
    timestamp: new Date().toISOString(),
    frontend: frontendAnalysis,
    backend: backendAnalysis,
    recommendations: []
  };

  // Generate recommendations
  const allMissing = [...frontendAnalysis.missing, ...backendAnalysis.missing];
  const allMisnamed = [...frontendAnalysis.misnamed, ...backendAnalysis.misnamed];

  if (allMissing.length > 0) {
    report.recommendations.push({
      type: 'missing_directories',
      priority: 'medium',
      count: allMissing.length,
      message: 'Create missing directories to improve code organization',
      items: allMissing
    });
  }

  if (allMisnamed.length > 0) {
    report.recommendations.push({
      type: 'naming_conventions',
      priority: 'low',
      count: allMisnamed.length,
      message: 'Rename files to follow naming conventions',
      items: allMisnamed
    });
  }

  // Check for structure alignment between frontend and backend
  const frontendDirs = Object.keys(frontendAnalysis.existing);
  const backendDirs = Object.keys(backendAnalysis.existing);
  const commonDirs = frontendDirs.filter(dir => backendDirs.includes(dir));
  const frontendOnlyDirs = frontendDirs.filter(dir => !backendDirs.includes(dir));
  const backendOnlyDirs = backendDirs.filter(dir => !frontendDirs.includes(dir));

  if (frontendOnlyDirs.length > 0 || backendOnlyDirs.length > 0) {
    report.recommendations.push({
      type: 'structure_alignment',
      priority: 'medium',
      message: 'Align directory structure between frontend and backend',
      details: {
        common: commonDirs,
        frontendOnly: frontendOnlyDirs,
        backendOnly: backendOnlyDirs
      }
    });
  }

  return report;
}

/**
 * Create missing directories
 */
function createMissingDirectories(analysis, basePath, dryRun = true) {
  const created = [];
  
  analysis.missing.forEach(missing => {
    const dirPath = missing.suggestedPath;
    
    if (!dryRun) {
      try {
        fs.mkdirSync(dirPath, { recursive: true });
        
        // Create subdirectories if specified
        const structure = DESIRED_STRUCTURE[missing.name];
        if (structure && structure.subdirs) {
          structure.subdirs.forEach(subdir => {
            const subdirPath = path.join(dirPath, subdir);
            fs.mkdirSync(subdirPath, { recursive: true });
          });
        }
        
        // Create index file
        const indexPath = path.join(dirPath, 'index.js');
        const indexContent = `/**\n * ${missing.description}\n */\n\nmodule.exports = {};\n`;
        fs.writeFileSync(indexPath, indexContent);
        
        created.push(dirPath);
      } catch (error) {
        console.error(`Failed to create directory ${dirPath}:`, error.message);
      }
    } else {
      created.push(dirPath);
    }
  });
  
  return created;
}

/**
 * Main execution function
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--execute');
  const createDirs = args.includes('--create-dirs');
  
  console.log('🔧 FloWorx Directory Structure Alignment');
  console.log('========================================');
  
  // Analyze frontend structure
  console.log('📁 Analyzing frontend structure...');
  const frontendPath = path.join(process.cwd(), 'frontend', 'src');
  const frontendAnalysis = analyzeStructure(frontendPath);
  
  // Analyze backend structure
  console.log('📁 Analyzing backend structure...');
  const backendPath = path.join(process.cwd(), 'backend');
  const backendAnalysis = analyzeStructure(backendPath);
  
  // Generate report
  const report = generateReport(frontendAnalysis, backendAnalysis);
  
  // Display summary
  console.log('\n📊 Structure Analysis Summary:');
  console.log('==============================');
  console.log(`Frontend directories: ${Object.keys(frontendAnalysis.existing).length}`);
  console.log(`Backend directories: ${Object.keys(backendAnalysis.existing).length}`);
  console.log(`Missing directories: ${report.frontend.missing.length + report.backend.missing.length}`);
  console.log(`Misnamed files: ${report.frontend.misnamed.length + report.backend.misnamed.length}`);
  console.log(`Recommendations: ${report.recommendations.length}`);
  
  // Display recommendations
  if (report.recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    console.log('===================');
    
    report.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec.message} (${rec.priority} priority)`);
      if (rec.count) {
        console.log(`   Count: ${rec.count}`);
      }
    });
  }
  
  // Create missing directories if requested
  if (createDirs) {
    console.log('\n📁 Creating missing directories...');
    
    const frontendCreated = createMissingDirectories(frontendAnalysis, frontendPath, dryRun);
    const backendCreated = createMissingDirectories(backendAnalysis, backendPath, dryRun);
    
    if (dryRun) {
      console.log('DRY RUN - Would create:');
      [...frontendCreated, ...backendCreated].forEach(dir => {
        console.log(`  - ${dir}`);
      });
      console.log('\nRun with --execute to actually create directories');
    } else {
      console.log('Created directories:');
      [...frontendCreated, ...backendCreated].forEach(dir => {
        console.log(`  ✅ ${dir}`);
      });
    }
  }
  
  // Save report
  const reportPath = path.join(process.cwd(), 'reports', `structure-analysis-${Date.now()}.json`);
  const reportsDir = path.dirname(reportPath);
  
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Report saved: ${reportPath}`);
  
  // Exit with appropriate code
  const hasIssues = report.recommendations.some(rec => rec.priority === 'high');
  process.exit(hasIssues ? 1 : 0);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Structure alignment failed:', error);
    process.exit(1);
  });
}

module.exports = {
  analyzeStructure,
  generateReport,
  createMissingDirectories,
  DESIRED_STRUCTURE,
  NAMING_CONVENTIONS
};
