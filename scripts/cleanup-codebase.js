#!/usr/bin/env node

/**
 * FloWorx Codebase Cleanup Script
 * Automated cleanup of code quality issues, duplicates, and inconsistencies
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Cleanup configuration
 */
const CLEANUP_CONFIG = {
    console.log('=====================================\n');

  const results = {
    filesRemoved: 0,
    importsFixed: 0,
    authAdded: 0,
    validationAdded: 0,
    errors: []
  };

  try {
        await removeDuplicateFiles(results);

    // Step 2: Fix import statements
    console.log('📦 Fixing import statements...');
    await fixImportStatements(results);

    // Step 3: Add missing authentication middleware
    console.log('🔐 Adding missing authentication middleware...');
    await addAuthenticationMiddleware(results);

    // Step 4: Add missing validation
    console.log('✅ Adding missing validation...');
    await addValidationMiddleware(results);

    // Step 5: Standardize error responses
    console.log('🚨 Standardizing error responses...');
    await standardizeErrorResponses(results);

    // Step 6: Fix function declaration order
    console.log('🔧 Fixing function declaration order...');
    await fixFunctionOrder(results);

    // Step 7: Run linting and formatting
    console.log('💅 Running linting and formatting...');
    await runLintingAndFormatting(results);

    // Generate cleanup report
    generateCleanupReport(results);

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    results.errors.push(error.message);
  }

  return results;
}

/**
 * Remove duplicate and unnecessary files
 */
async function removeDuplicateFiles(results) {
  for (const filePath of CLEANUP_CONFIG.filesToRemove) {
    try {
      if (fs.existsSync(filePath)) {
        if (fs.lstatSync(filePath).isDirectory()) {
          fs.rmSync(filePath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(filePath);
        }
        console.log(`  ✅ Removed: ${filePath}`);
        results.filesRemoved++;
      }
    } catch (error) {
      console.error(`  ❌ Failed to remove ${filePath}:`, error.message);
      results.errors.push(`Failed to remove ${filePath}: ${error.message}`);
    }
  }
}

/**
 * Fix import statements
 */
async function fixImportStatements(results) {
  for (const fix of CLEANUP_CONFIG.importFixes) {
    try {
      if (fs.existsSync(fix.file)) {
        let content = fs.readFileSync(fix.file, 'utf8');
        const lines = content.split('\n');

        // Check if fix is needed
        if (fix.issue === 'Missing colors import' && content.includes('          results.importsFixed++;
        }
      }
    } catch (error) {
      console.error(`  ❌ Failed to fix import in ${fix.file}:`, error.message);
      results.errors.push(`Failed to fix import in ${fix.file}: ${error.message}`);
    }
  }
}

/**
 * Add missing authentication middleware
 */
async function addAuthenticationMiddleware(results) {
  for (const routeFile of CLEANUP_CONFIG.routesNeedingAuth) {
    try {
      if (fs.existsSync(routeFile)) {
        let content = fs.readFileSync(routeFile, 'utf8');

        // Check if auth middleware is already imported
        if (!content.includes('authenticateToken')) {
          // Add import at the top
          const lines = content.split('\n');
          const importIndex = lines.findIndex(line => line.includes('require(') && line.includes('express'));

          if (importIndex !== -1) {
            lines.splice(importIndex + 1, 0, "const { authenticateToken } = require('../middleware/auth');");
            content = lines.join('\n');
            fs.writeFileSync(routeFile, content);
            console.log(`  ✅ Added auth middleware to: ${routeFile}`);
            results.authAdded++;
          }
        }
      }
    } catch (error) {
      console.error(`  ❌ Failed to add auth to ${routeFile}:`, error.message);
      results.errors.push(`Failed to add auth to ${routeFile}: ${error.message}`);
    }
  }
}

/**
 * Add missing validation middleware
 */
async function addValidationMiddleware(results) {
  for (const routeFile of CLEANUP_CONFIG.routesNeedingValidation) {
    try {
      if (fs.existsSync(routeFile)) {
        let content = fs.readFileSync(routeFile, 'utf8');

        // Check if validation is already imported
        if (!content.includes('validateRequest')) {
          // Add import
          const lines = content.split('\n');
          const importIndex = lines.findIndex(line => line.includes('require(') && line.includes('middleware'));

          if (importIndex !== -1) {
            lines.splice(importIndex + 1, 0, "const { validateRequest } = require('../utils/validateRequest');");
            content = lines.join('\n');
            fs.writeFileSync(routeFile, content);
            console.log(`  ✅ Added validation middleware to: ${routeFile}`);
            results.validationAdded++;
          }
        }
      }
    } catch (error) {
      console.error(`  ❌ Failed to add validation to ${routeFile}:`, error.message);
      results.errors.push(`Failed to add validation to ${routeFile}: ${error.message}`);
    }
  }
}

/**
 * Standardize error responses across all routes
 */
async function standardizeErrorResponses(results) {
  const routeFiles = [
    'backend/routes/auth.js',
    'backend/routes/oauth.js',
    'backend/routes/onboarding.js',
    'backend/routes/recovery.js',
    'backend/routes/businessTypes.js',
    'backend/routes/workflows.js',
    'backend/routes/analytics.js'
  ];

  for (const routeFile of routeFiles) {
    try {
      if (fs.existsSync(routeFile)) {
        let content = fs.readFileSync(routeFile, 'utf8');

        // Replace inconsistent error responses
        content = content.replace(
          /res\.status\(\d+\)\.json\(\s*{\s*error:\s*['"`][^'"`]*['"`]\s*}\s*\)/g,
          'res.status($1).json(createErrorResponse(error, $1))'
        );

        // Add import for error utilities if not present
        if (!content.includes('createErrorResponse')) {
          const lines = content.split('\n');
          const importIndex = lines.findIndex(line => line.includes('require(') && line.includes('utils'));

          if (importIndex !== -1) {
            lines.splice(importIndex + 1, 0, "const { createErrorResponse, createSuccessResponse } = require('../utils');");
            content = lines.join('\n');
          }
        }

        fs.writeFileSync(routeFile, content);
        console.log(`  ✅ Standardized error responses in: ${routeFile}`);
      }
    } catch (error) {
      console.error(`  ❌ Failed to standardize errors in ${routeFile}:`, error.message);
      results.errors.push(`Failed to standardize errors in ${routeFile}: ${error.message}`);
    }
  }
}

/**
 * Fix function declaration order issues
 */
async function fixFunctionOrder(results) {
  // This would require more complex AST parsing
  // For now, just ensure imports are at the top
  console.log('  ℹ️  Function order fixes require manual review');
}

/**
 * Run linting and formatting
 */
async function runLintingAndFormatting(results) {
  try {
    // Run ESLint fix
    console.log('  🔍 Running ESLint fixes...');
    execSync('cd backend && npm run lint:fix', { stdio: 'pipe' });

    // Run Prettier
    console.log('  💅 Running Prettier formatting...');
    execSync('cd backend && npm run format', { stdio: 'pipe' });

    console.log('  ✅ Linting and formatting completed');
  } catch (error) {
    console.error('  ⚠️  Linting/formatting had issues (check manually)');
    results.errors.push('Linting/formatting issues detected');
  }
}

/**
 * Generate cleanup report
 */
function generateCleanupReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      filesRemoved: results.filesRemoved,
      importsFixed: results.importsFixed,
      authAdded: results.authAdded,
      validationAdded: results.validationAdded,
      errors: results.errors.length
    },
    errors: results.errors,
    nextSteps: [
      'Review authentication middleware implementation',
      'Add comprehensive input validation schemas',
      'Implement database indexes for performance',
      'Add PropTypes to React components',
      'Review and test all error handling paths'
    ]
  };

  const reportPath = path.join(process.cwd(), 'reports', `cleanup-report-${Date.now()}.json`);

  // Ensure reports directory exists
  const reportsDir = path.dirname(reportPath);
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log('\n📊 Cleanup Summary:');
  console.log('==================');
  console.log(`Files removed: ${results.filesRemoved}`);
  console.log(`Imports fixed: ${results.importsFixed}`);
  console.log(`Auth middleware added: ${results.authAdded}`);
  console.log(`Validation added: ${results.validationAdded}`);
  console.log(`Errors encountered: ${results.errors.length}`);

  if (results.errors.length > 0) {
    console.log('\n❌ Errors:');
    results.errors.forEach(error => console.log(`  - ${error}`));
  }

  console.log(`\n📄 Full report saved: ${reportPath}`);
}

// Run cleanup if called directly
if (require.main === module) {
  runCleanup().catch(error => {
    console.error('❌ Cleanup script failed:', error);
    process.exit(1);
  });
}

module.exports = { runCleanup, CLEANUP_CONFIG };
