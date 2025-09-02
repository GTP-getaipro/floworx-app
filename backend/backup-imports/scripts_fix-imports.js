#!/usr/bin/env node

/**
 * Import & Declaration Cleanup Script
 * Systematically fixes unused imports, declaration order, and missing imports
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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
const getJavaScriptFiles = (dir) => {
  const files = [];
  
  const traverse = (currentDir) => {
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
      const unusedVars = file.messages.filter(msg => 
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
const analyzeFileImports = (filePath) => {
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
  linesToRemove.sort((a, b) => b - a).forEach(lineIndex => {
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
const addMissingImports = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Common patterns that need imports
  const missingImports = [];
  
  // Check for Jest globals in test files
  if (filePath.includes('test') || filePath.includes('spec')) {
    const jestGlobals = ['describe', 'test', 'it', 'expect', 'beforeEach', 'afterEach', 'beforeAll', 'afterAll', 'jest'];
    jestGlobals.forEach(global => {
      if (content.includes(global) && !content.includes(`global.${global}`)) {
        // Jest globals are available globally, no import needed
        // But we can add a comment to clarify
      }
    });
  }
  
  // Check for Node.js modules that might be missing
  const nodeModules = {
    'fs': ['readFileSync', 'writeFileSync', 'existsSync', 'mkdirSync'],
    'path': ['join', 'resolve', 'dirname', 'basename'],
    'crypto': ['createHash', 'randomBytes', 'createCipher'],
    'util': ['promisify', 'inspect']
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

// Main execution
const main = async () => {
  log('🧹 Starting Import & Declaration Cleanup', 'info');
  log('=====================================', 'info');
  
  // Create backup directory
  if (!fs.existsSync(CONFIG.backupDir)) {
    fs.mkdirSync(CONFIG.backupDir, { recursive: true });
  }
  
  // Get all JavaScript files
  const files = getJavaScriptFiles(CONFIG.sourceDir);
  log(`Found ${files.length} JavaScript files`, 'info');
  
  // Get unused imports from ESLint
  log('Analyzing unused imports with ESLint...', 'info');
  const unusedImports = getUnusedImports();
  
  let totalFixed = 0;
  let totalFiles = 0;
  
  // Process each file
  for (const filePath of files) {
    const relativePath = path.relative(process.cwd(), filePath);
    
    // Skip certain files
    if (relativePath.includes('node_modules') || 
        relativePath.includes('coverage') ||
        relativePath.includes('reports')) {
      continue;
    }
    
    totalFiles++;
    
    // Create backup
    const backupPath = path.join(CONFIG.backupDir, relativePath.replace(/[/\\]/g, '_'));
    fs.copyFileSync(filePath, backupPath);
    
    let fileModified = false;
    
    // Fix unused imports
    const fileUnusedImports = unusedImports[filePath];
    if (fileUnusedImports && fileUnusedImports.length > 0) {
      log(`Processing: ${relativePath} (${fileUnusedImports.length} unused imports)`, 'info');
      
      if (fixUnusedImports(filePath, fileUnusedImports)) {
        fileModified = true;
        totalFixed++;
      }
    }
    
    // Check for missing imports
    const missingImports = addMissingImports(filePath);
    if (missingImports.length > 0) {
      log(`Missing imports in ${relativePath}:`, 'warning');
      missingImports.forEach(imp => {
        log(`  Suggestion: ${imp.suggestion}`, 'warning');
      });
    }
  }
  
  // Summary
  log('\n📊 CLEANUP SUMMARY', 'info');
  log('==================', 'info');
  log(`Files processed: ${totalFiles}`, 'info');
  log(`Files modified: ${totalFixed}`, 'success');
  log(`Backups created in: ${CONFIG.backupDir}`, 'info');
  
  // Run ESLint again to see improvement
  log('\n🔍 Running ESLint to verify improvements...', 'info');
  try {
    execSync('npx eslint . --ext .js --format compact', { stdio: 'inherit' });
    log('✅ ESLint check completed', 'success');
  } catch (error) {
    log('⚠️  Some ESLint issues remain - check output above', 'warning');
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
