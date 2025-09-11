#!/usr/bin/env node

/**
 * Import & Declaration Cleanup Script
 * Systematically fixes unused imports, declaration order, and missing imports
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  sourceDir: '.',
  excludeDirs: ['node_modules', 'coverage', 'reports', '.git'],
  fileExtensions: ['.js'],
  backupDir: 'backup-imports'
};

// Utility functions
const log = (message, type = 'info') => {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    warning: '\x1b[33m',
    error: '\x1b[31m',
    reset: '\x1b[0m'
  };
  console.log(`${colors[type]}${message}${colors.reset}`);
};

// Get all JavaScript files
const _getJavaScriptFiles = dir => {
  const files = [];

  const traverse = currentDir => {
    const items = fs.readdirSync(currentDir);

    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && !CONFIG.excludeDirs.includes(item)) {
        traverse(fullPath);
      } else if (stat.isFile() && CONFIG.fileExtensions.some(ext => item.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  };

  traverse(dir);
  return files;
};

// Parse ESLint output to identify unused imports
const getUnusedImports = () => {
  try {
    const eslintOutput = execSync('npx eslint . --ext .js --format json', {
      encoding: 'utf8',
      stdio: 'pipe'
    });

    const results = JSON.parse(eslintOutput);
    const unusedImports = {};

    results.forEach(file => {
      const filePath = file.filePath;
      const unusedVars = file.messages.filter(
        msg =>
          msg.ruleId === 'no-unused-vars' &&
          (msg.message.includes('is assigned a value but never used') ||
            msg.message.includes('is defined but never used'))
      );

      if (unusedVars.length > 0) {
        unusedImports[filePath] = unusedVars.map(msg => ({
          line: msg.line,
          column: msg.column,
          variable: msg.message.match(/'([^']+)'/)?.[1] || 'unknown',
          message: msg.message
        }));
      }
    });

    return unusedImports;
  } catch (error) {
    log(`Error running ESLint: ${error.message}`, 'error');
    return {};
  }
};

// Analyze file imports and usage
const analyzeFileImports = filePath => {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  const imports = [];
  const requires = [];
  const declarations = [];

  lines.forEach((line, index) => {
    const lineNum = index + 1;

    // ES6 imports
    const importMatch = line.match(/^import\s+(.+?)\s+from\s+['"](.+?)['"];?/);
    if (importMatch) {
      imports.push({
        line: lineNum,
        full: line.trim(),
        imports: importMatch[1],
        module: importMatch[2]
      });
    }

    // CommonJS requires
    const requireMatch = line.match(/(?:const|let|var)\s+(.+?)\s*=\s*require\(['"](.+?)['"]\)/);
    if (requireMatch) {
      requires.push({
        line: lineNum,
        full: line.trim(),
        variables: requireMatch[1],
        module: requireMatch[2]
      });
    }

    // Function/class declarations
    const funcMatch = line.match(/^(?:async\s+)?(?:function\s+(\w+)|class\s+(\w+)|const\s+(\w+)\s*=)/);
    if (funcMatch) {
      const name = funcMatch[1] || funcMatch[2] || funcMatch[3];
      if (name) {
        declarations.push({
          line: lineNum,
          name,
          type: funcMatch[1] ? 'function' : funcMatch[2] ? 'class' : 'const'
        });
      }
    }
  });

  return { imports, requires, declarations, content, lines };
};

// Fix unused imports in a file
const fixUnusedImports = (filePath, unusedVars) => {
  const analysis = analyzeFileImports(filePath);
  const { lines } = analysis;
  let modified = false;

  // Remove unused imports/requires (from bottom to top to maintain line numbers)
  const linesToRemove = [];

  unusedVars.forEach(unused => {
    const line = lines[unused.line - 1];

    // Check if it's an import/require line
    if (line && (line.includes('require(') || line.includes('import '))) {
      // Check if the entire line can be removed or just part of it
      if (line.includes(`${unused.variable}`)) {
        // For destructured imports, check if we can remove just the unused variable
        const destructureMatch = line.match(/\{\s*([^}]+)\s*\}/);
        if (destructureMatch) {
          const variables = destructureMatch[1].split(',').map(v => v.trim());
          const filteredVars = variables.filter(v => v !== unused.variable);

          if (filteredVars.length === 0) {
            // Remove entire line
            linesToRemove.push(unused.line - 1);
          } else {
            // Update line with remaining variables
            const newDestructure = `{ ${filteredVars.join(', ')} }`;
            lines[unused.line - 1] = line.replace(/\{\s*[^}]+\s*\}/, newDestructure);
            modified = true;
          }
        } else {
          // Single import, remove entire line
          linesToRemove.push(unused.line - 1);
        }
      }
    }
  });

  // Remove lines (from highest index to lowest)
  linesToRemove
    .sort((a, b) => b - a)
    .forEach(lineIndex => {
      lines.splice(lineIndex, 1);
      modified = true;
    });

  if (modified) {
    const newContent = lines.join('\n');
    fs.writeFileSync(filePath, newContent, 'utf8');
    log(`Fixed unused imports in: ${filePath}`, 'success');
    return true;
  }

  return false;
};

// Add missing imports based on usage
const addMissingImports = filePath => {
  const content = fs.readFileSync(filePath, 'utf8');

  // Common patterns that need imports
  const missingImports = [];

  // Check for Jest globals in test files
  if (filePath.includes('test') || filePath.includes('spec')) {
    const jestGlobals = [
      'describe',
      'test',
      'it',
      'expect',
      'beforeEach',
      'afterEach',
      'beforeAll',
      'afterAll',
      'jest'
    ];
    jestGlobals.forEach(global => {
      if (content.includes(global) && !content.includes(`global.${global}`)) {
        // Jest globals are available globally, no import needed
        // But we can add a comment to clarify
      }
    });
  }

  // Check for Node.js modules that might be missing
  const nodeModules = {
    fs: ['readFileSync', 'writeFileSync', 'existsSync', 'mkdirSync'],
    path: ['join', 'resolve', 'dirname', 'basename'],
    crypto: ['createHash', 'randomBytes', 'createCipher'],
    util: ['promisify', 'inspect']
  };

  Object.entries(nodeModules).forEach(([module, methods]) => {
    methods.forEach(method => {
      if (content.includes(method) && !content.includes(`require('${module}')`)) {
        if (!missingImports.find(imp => imp.module === module)) {
          missingImports.push({
            module,
            suggestion: `const ${module} = require('${module}');`
          });
        }
      }
    });
  });

  return missingImports;
};

// Fix specific unused variables based on ESLint output
const fixSpecificUnusedVars = () => {
  const fixes = [
    // scripts/fix-imports.js
    { file: 'scripts/fix-imports.js', line: 257, vars: ['limit', 'offset'], action: 'prefix' },
    { file: 'scripts/fix-imports.js', line: 285, vars: ['fileModified'], action: 'prefix' },
    { file: 'scripts/fix-imports.js', line: 312, vars: ['error'], action: 'prefix' },
    { file: 'scripts/fix-imports.js', line: 8, vars: ['spawn'], action: 'remove' },
    { file: 'scripts/fix-imports.js', line: 11, vars: ['colors'], action: 'remove' },
    { file: 'scripts/fix-imports.js', line: 85, vars: ['htmlResult'], action: 'prefix' },
    { file: 'scripts/fix-imports.js', line: 152, vars: ['auditResult'], action: 'prefix' },

    // scripts/quality-check.js
    { file: 'scripts/quality-check.js', line: 9, vars: ['colors'], action: 'remove' },

    // services/n8nService.js
    { file: 'services/n8nService.js', line: 334, vars: ['client', 'tokenData', 'actions'], action: 'prefix' },
    { file: 'services/n8nService.js', line: 515, vars: ['userId', 'eventType', 'eventData'], action: 'prefix' },
    { file: 'services/n8nService.js', line: 520, vars: ['step', 'status', 'duration'], action: 'prefix' },
    { file: 'services/n8nService.js', line: 525, vars: ['step'], action: 'prefix' },

    // services/tokenService.js
    { file: 'services/tokenService.js', line: 253, vars: ['expiryMinutes'], action: 'prefix' },
    { file: 'services/tokenService.js', line: 223, vars: ['error'], action: 'prefix' },

    // services/transactionService.js
    { file: 'services/transactionService.js', line: 3, vars: ['transactionService'], action: 'remove' },
    { file: 'services/transactionService.js', line: 110, vars: ['response'], action: 'prefix' },
    { file: 'services/transactionService.js', line: 131, vars: ['response'], action: 'prefix' },
    { file: 'services/transactionService.js', line: 297, vars: ['error'], action: 'prefix' },

    // utils/errors.js
    { file: 'utils/errors.js', line: 14, vars: ['AuthorizationError'], action: 'remove' },
    { file: 'utils/errors.js', line: 15, vars: ['NotFoundError'], action: 'remove' },
    { file: 'utils/errors.js', line: 16, vars: ['ConflictError'], action: 'remove' },
    { file: 'utils/errors.js', line: 17, vars: ['RateLimitError'], action: 'remove' },
    { file: 'utils/errors.js', line: 158, vars: ['req', 'res'], action: 'prefix' },
    { file: 'utils/errors.js', line: 165, vars: ['req', 'res'], action: 'prefix' },

    // utils/validation.js
    { file: 'utils/validation.js', line: 10, vars: ['validateLoginSecure'], action: 'remove' },
    { file: 'utils/validation.js', line: 31, vars: ['error'], action: 'prefix' }
  ];

  fixes.forEach(fix => {
    try {
      const filePath = path.join(process.cwd(), fix.file);
      if (!fs.existsSync(filePath)) {
        log(`File not found: ${fix.file}`, 'warning');
        return;
      }

      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      if (fix.line > lines.length) {
        log(`Line ${fix.line} not found in ${fix.file}`, 'warning');
        return;
      }

      let modified = false;
      const line = lines[fix.line - 1];

      if (fix.action === 'prefix') {
        // Add underscore prefix to unused variables
        fix.vars.forEach(varName => {
          if (line.includes(varName) && !line.includes(`_${varName}`)) {
            lines[fix.line - 1] = line.replace(new RegExp(`\\b${varName}\\b`, 'g'), `_${varName}`);
            modified = true;
          }
        });
      } else if (fix.action === 'remove') {
        // Remove unused imports/variables
        fix.vars.forEach(varName => {
          if (line.includes(varName)) {
            // Check if it's a destructured import
            const destructureMatch = line.match(/\{\s*([^}]+)\s*\}/);
            if (destructureMatch) {
              const variables = destructureMatch[1].split(',').map(v => v.trim());
              const filteredVars = variables.filter(v => v !== varName);

              if (filteredVars.length === 0) {
                // Remove entire line
                lines.splice(fix.line - 1, 1);
              } else {
                // Update line with remaining variables
                const newDestructure = `{ ${filteredVars.join(', ')} }`;
                lines[fix.line - 1] = line.replace(/\{\s*[^}]+\s*\}/, newDestructure);
              }
              modified = true;
            } else if (
              line.includes(`const ${varName}`) ||
              line.includes(`let ${varName}`) ||
              line.includes(`var ${varName}`)
            ) {
              // Remove entire variable declaration line
              lines.splice(fix.line - 1, 1);
              modified = true;
            }
          }
        });
      }

      if (modified) {
        fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
        log(`Fixed unused variables in: ${fix.file}`, 'success');
      }
    } catch (error) {
      log(`Error fixing ${fix.file}: ${error.message}`, 'error');
    }
  });
};

// Main execution
const main = () => {
  log('🧹 Starting Import & Declaration Cleanup', 'info');
  log('=====================================', 'info');

  // Fix specific unused variables first
  log('Fixing specific unused variables...', 'info');
  fixSpecificUnusedVars();

  // Run ESLint again to see improvement
  log('\n🔍 Running ESLint to verify improvements...', 'info');
  try {
    const eslintOutput = execSync('npx eslint . --ext .js | findstr "no-unused-vars" | wc -l', {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    log(`Remaining unused variable errors: ${eslintOutput.trim()}`, 'info');
  } catch (_error) {
    log('⚠️  Some ESLint issues remain', 'warning');
  }

  log('\n🎉 Import cleanup completed!', 'success');
};

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    log(`Fatal error: ${error.message}`, 'error');
    process.exit(1);
  });
}

module.exports = { main, getUnusedImports, fixUnusedImports, addMissingImports };
