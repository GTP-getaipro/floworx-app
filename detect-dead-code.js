#!/usr/bin/env node

/**
 * Dead Code Detection Script
 * Identifies unused files, functions, imports, and other dead code
 */

const fs = require('fs');
const path = require('path');

class DeadCodeDetector {
  constructor() {
    this.deadCode = {
      unusedFiles: [],
      unusedImports: [],
      commentedCode: [],
      duplicateFiles: [],
      unusedFunctions: [],
      unusedVariables: [],
      emptyFiles: []
    };
    
    this.excludePatterns = [
      /node_modules/,
      /\.git/,
      /coverage/,
      /build/,
      /dist/,
      /logs/,
      /\.log$/,
      /\.md$/,
      /\.txt$/,
      /package-lock\.json/,
      /yarn\.lock/,
      /\.env/
    ];

    this.sourceExtensions = ['.js', '.jsx', '.ts', '.tsx', '.vue'];
    this.allFiles = [];
    this.fileContents = new Map();
  }

  async analyze() {
    console.log('🔍 Analyzing Codebase for Dead Code...');
    console.log('=' .repeat(50));

    try {
      await this.scanFiles();
      await this.detectUnusedFiles();
      await this.detectCommentedCode();
      await this.detectEmptyFiles();
      await this.detectUnusedImports();
      await this.detectDuplicateCode();
      
      this.generateReport();
      return this.deadCode;
    } catch (error) {
      console.error('❌ Analysis failed:', error.message);
      process.exit(1);
    }
  }

  async scanFiles(dir = '.') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      // Skip excluded patterns
      if (this.excludePatterns.some(pattern => pattern.test(fullPath))) {
        continue;
      }

      if (entry.isDirectory()) {
        await this.scanFiles(fullPath);
      } else if (entry.isFile()) {
        this.allFiles.push(fullPath);
        
        // Read source files for analysis
        if (this.sourceExtensions.includes(path.extname(fullPath))) {
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            this.fileContents.set(fullPath, content);
          } catch (error) {
            console.warn(`⚠️  Could not read ${fullPath}: ${error.message}`);
          }
        }
      }
    }
  }

  async detectUnusedFiles() {
    console.log('\n📁 Detecting Unused Files...');
    
    const potentiallyUnused = [];
    
    // Check for files that might be unused
    this.allFiles.forEach(filePath => {
      const fileName = path.basename(filePath);
      const fileExt = path.extname(filePath);
      
      // Skip certain file types that are typically not imported
      if (['.md', '.txt', '.json', '.env', '.gitignore'].includes(fileExt)) {
        return;
      }

      // Check if file is referenced in other files
      const isReferenced = Array.from(this.fileContents.values()).some(content => {
        const relativePath = filePath.replace(/\\/g, '/');
        const withoutExt = relativePath.replace(fileExt, '');
        
        return content.includes(fileName) || 
               content.includes(relativePath) ||
               content.includes(withoutExt) ||
               content.includes(`'${fileName}'`) ||
               content.includes(`"${fileName}"`) ||
               content.includes(`from '${withoutExt}'`) ||
               content.includes(`from "${withoutExt}"`);
      });

      if (!isReferenced) {
        potentiallyUnused.push(filePath);
      }
    });

    // Filter out files that are entry points or have special purposes
    const entryPoints = [
      'server.js',
      'index.js',
      'app.js',
      'main.js',
      'App.js',
      'App.jsx'
    ];

    this.deadCode.unusedFiles = potentiallyUnused.filter(filePath => {
      const fileName = path.basename(filePath);
      return !entryPoints.includes(fileName) && 
             !filePath.includes('test') &&
             !filePath.includes('spec') &&
             !fileName.startsWith('debug-') &&
             !fileName.startsWith('validate-') &&
             !fileName.startsWith('configure-');
    });

    console.log(`   Found ${this.deadCode.unusedFiles.length} potentially unused files`);
  }

  async detectCommentedCode() {
    console.log('\n💬 Detecting Commented Code Blocks...');
    
    this.fileContents.forEach((content, filePath) => {
      const lines = content.split('\n');
      let commentedCodeBlocks = [];
      let currentBlock = null;

      lines.forEach((line, index) => {
        const trimmed = line.trim();
        
        // Detect commented code (not just comments)
        if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
          const commentContent = trimmed.replace(/^(\/\/|\*|\/\*)\s*/, '');
          
          // Check if it looks like code (has common code patterns)
          const codePatterns = [
            /^(const|let|var|function|class|if|for|while|return|import|export)/,
            /[{}();=]/,
            /\.(js|jsx|ts|tsx|css|html)$/,
            /^[A-Z_]+=/,
            /^\w+\(/
          ];

          if (codePatterns.some(pattern => pattern.test(commentContent))) {
            if (!currentBlock) {
              currentBlock = {
                startLine: index + 1,
                endLine: index + 1,
                lines: [line]
              };
            } else {
              currentBlock.endLine = index + 1;
              currentBlock.lines.push(line);
            }
          } else if (currentBlock) {
            // End of commented code block
            if (currentBlock.lines.length > 2) { // Only report blocks with multiple lines
              commentedCodeBlocks.push(currentBlock);
            }
            currentBlock = null;
          }
        } else if (currentBlock) {
          // End of commented code block
          if (currentBlock.lines.length > 2) {
            commentedCodeBlocks.push(currentBlock);
          }
          currentBlock = null;
        }
      });

      if (commentedCodeBlocks.length > 0) {
        this.deadCode.commentedCode.push({
          file: filePath,
          blocks: commentedCodeBlocks
        });
      }
    });

    const totalBlocks = this.deadCode.commentedCode.reduce((sum, file) => sum + file.blocks.length, 0);
    console.log(`   Found ${totalBlocks} commented code blocks in ${this.deadCode.commentedCode.length} files`);
  }

  async detectEmptyFiles() {
    console.log('\n📄 Detecting Empty Files...');
    
    this.fileContents.forEach((content, filePath) => {
      const trimmedContent = content.trim();
      
      if (trimmedContent === '' || 
          trimmedContent.length < 10 ||
          /^\/\*[\s\S]*\*\/\s*$/.test(trimmedContent) ||
          /^\/\/.*\n?$/.test(trimmedContent)) {
        this.deadCode.emptyFiles.push(filePath);
      }
    });

    console.log(`   Found ${this.deadCode.emptyFiles.length} empty or nearly empty files`);
  }

  async detectUnusedImports() {
    console.log('\n📦 Detecting Unused Imports...');
    
    this.fileContents.forEach((content, filePath) => {
      const lines = content.split('\n');
      const unusedImports = [];

      lines.forEach((line, index) => {
        const trimmed = line.trim();
        
        // Match import statements
        const importMatch = trimmed.match(/^import\s+(?:{([^}]+)}|\*\s+as\s+(\w+)|(\w+))\s+from\s+['"]([^'"]+)['"]/);
        
        if (importMatch) {
          const [, namedImports, namespaceImport, defaultImport, modulePath] = importMatch;
          
          let imports = [];
          if (namedImports) {
            imports = namedImports.split(',').map(imp => imp.trim());
          } else if (namespaceImport) {
            imports = [namespaceImport];
          } else if (defaultImport) {
            imports = [defaultImport];
          }

          // Check if imports are used in the file
          const restOfFile = lines.slice(index + 1).join('\n');
          const unusedInThisLine = imports.filter(imp => {
            const cleanImport = imp.replace(/\s+as\s+\w+/, '').trim();
            return !restOfFile.includes(cleanImport);
          });

          if (unusedInThisLine.length > 0) {
            unusedImports.push({
              line: index + 1,
              imports: unusedInThisLine,
              fullLine: line
            });
          }
        }
      });

      if (unusedImports.length > 0) {
        this.deadCode.unusedImports.push({
          file: filePath,
          imports: unusedImports
        });
      }
    });

    const totalUnusedImports = this.deadCode.unusedImports.reduce((sum, file) => sum + file.imports.length, 0);
    console.log(`   Found ${totalUnusedImports} potentially unused imports in ${this.deadCode.unusedImports.length} files`);
  }

  async detectDuplicateCode() {
    console.log('\n🔄 Detecting Duplicate Code...');
    
    const fileHashes = new Map();
    const duplicates = new Map();

    this.fileContents.forEach((content, filePath) => {
      // Simple hash based on content (excluding whitespace and comments)
      const normalizedContent = content
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
        .replace(/\/\/.*$/gm, '') // Remove line comments
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();

      if (normalizedContent.length > 100) { // Only check substantial files
        const hash = this.simpleHash(normalizedContent);
        
        if (fileHashes.has(hash)) {
          const existingFile = fileHashes.get(hash);
          if (!duplicates.has(hash)) {
            duplicates.set(hash, [existingFile]);
          }
          duplicates.get(hash).push(filePath);
        } else {
          fileHashes.set(hash, filePath);
        }
      }
    });

    duplicates.forEach((files, hash) => {
      if (files.length > 1) {
        this.deadCode.duplicateFiles.push(files);
      }
    });

    console.log(`   Found ${this.deadCode.duplicateFiles.length} sets of potentially duplicate files`);
  }

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  generateReport() {
    console.log('\n📊 DEAD CODE ANALYSIS REPORT');
    console.log('=' .repeat(50));

    let totalIssues = 0;

    // Unused Files
    if (this.deadCode.unusedFiles.length > 0) {
      console.log(`\n📁 Potentially Unused Files (${this.deadCode.unusedFiles.length}):`);
      this.deadCode.unusedFiles.forEach(file => {
        console.log(`   🗑️  ${file}`);
      });
      totalIssues += this.deadCode.unusedFiles.length;
    }

    // Empty Files
    if (this.deadCode.emptyFiles.length > 0) {
      console.log(`\n📄 Empty Files (${this.deadCode.emptyFiles.length}):`);
      this.deadCode.emptyFiles.forEach(file => {
        console.log(`   📄 ${file}`);
      });
      totalIssues += this.deadCode.emptyFiles.length;
    }

    // Commented Code
    if (this.deadCode.commentedCode.length > 0) {
      console.log(`\n💬 Files with Commented Code (${this.deadCode.commentedCode.length}):`);
      this.deadCode.commentedCode.forEach(({ file, blocks }) => {
        console.log(`   💬 ${file}: ${blocks.length} block(s)`);
        blocks.forEach(block => {
          console.log(`      Lines ${block.startLine}-${block.endLine}`);
        });
      });
      totalIssues += this.deadCode.commentedCode.length;
    }

    // Unused Imports
    if (this.deadCode.unusedImports.length > 0) {
      console.log(`\n📦 Files with Unused Imports (${this.deadCode.unusedImports.length}):`);
      this.deadCode.unusedImports.forEach(({ file, imports }) => {
        console.log(`   📦 ${file}: ${imports.length} unused import(s)`);
      });
      totalIssues += this.deadCode.unusedImports.length;
    }

    // Duplicate Files
    if (this.deadCode.duplicateFiles.length > 0) {
      console.log(`\n🔄 Duplicate Files (${this.deadCode.duplicateFiles.length} sets):`);
      this.deadCode.duplicateFiles.forEach((files, index) => {
        console.log(`   🔄 Set ${index + 1}:`);
        files.forEach(file => console.log(`      ${file}`));
      });
      totalIssues += this.deadCode.duplicateFiles.length;
    }

    console.log('\n📈 Summary:');
    console.log(`   Total Issues Found: ${totalIssues}`);
    console.log(`   Files Analyzed: ${this.fileContents.size}`);
    
    if (totalIssues === 0) {
      console.log('\n🎉 No dead code detected! Your codebase is clean.');
    } else {
      console.log('\n🧹 Recommendations:');
      console.log('   1. Review and remove unused files');
      console.log('   2. Clean up commented code blocks');
      console.log('   3. Remove unused imports');
      console.log('   4. Consider consolidating duplicate files');
      console.log('   5. Delete empty files');
    }

    return this.deadCode;
  }
}

// Main execution
async function main() {
  const detector = new DeadCodeDetector();
  const results = await detector.analyze();
  
  // Save results for cleanup script
  if (results) {
    fs.writeFileSync('dead-code-analysis.json', JSON.stringify(results, null, 2));
    console.log('\n💾 Analysis results saved to dead-code-analysis.json');
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { DeadCodeDetector };
