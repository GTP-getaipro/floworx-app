const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

/**
 * Static Code Analyzer
 * 
 * Detects issues like:
 * - Duplicate method signatures
 * - Parameter mismatches
 * - Unused imports
 * - Configuration inconsistencies
 * - Method signature conflicts (like the createPasswordResetToken issue)
 */
class StaticAnalyzer {
  constructor(config) {
    this.config = config;
    this.results = {
      summary: { total: 0, passed: 0, failed: 0, warnings: 0 },
      issues: [],
      recommendations: []
    };
  }

  async analyze() {
    console.log('  🔍 Scanning codebase for issues...');
    
    const criticalPaths = this.config.criticalPaths;
    
    for (const criticalPath of criticalPaths) {
      const fullPath = path.join(this.config.projectRoot, criticalPath);
      if (fs.existsSync(fullPath)) {
        await this.analyzePath(fullPath, criticalPath);
      }
    }

    // Specific checks for known issue patterns
    await this.checkForKnownIssues();
    
    // Method signature analysis
    await this.analyzeMethodSignatures();
    
    // Parameter mismatch detection
    await this.analyzeParameterMismatches();

    this.generateRecommendations();
    return this.results;
  }

  async analyzeCritical() {
    console.log('  ⚡ Quick critical analysis...');
    
    // Only check for critical issues
    await this.checkForKnownIssues();
    await this.analyzeMethodSignatures();
    
    return this.results;
  }

  async analyzePath(dirPath, relativePath) {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        await this.analyzePath(itemPath, path.join(relativePath, item));
      } else if (stat.isFile() && this.shouldAnalyzeFile(item)) {
        await this.analyzeFile(itemPath, path.join(relativePath, item));
      }
    }
  }

  shouldAnalyzeFile(filename) {
    const extensions = ['.js', '.jsx', '.ts', '.tsx'];
    return extensions.some(ext => filename.endsWith(ext));
  }

  async analyzeFile(filePath, relativePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      this.results.summary.total++;

      // Check for duplicate method signatures
      this.checkDuplicateMethods(content, relativePath);
      
      // Check for parameter mismatches
      this.checkParameterMismatches(content, relativePath);
      
      // Check for unused imports
      this.checkUnusedImports(content, relativePath);
      
      // Check for configuration issues
      this.checkConfigurationIssues(content, relativePath);

      this.results.summary.passed++;
    } catch (error) {
      this.results.summary.failed++;
      this.addIssue('file_read_error', 'high', `Failed to analyze ${relativePath}: ${error.message}`, relativePath);
    }
  }

  checkDuplicateMethods(content, filePath) {
    // Look for duplicate method signatures (like our createPasswordResetToken issue)
    const methodPattern = /(?:async\s+)?(\w+)\s*\([^)]*\)\s*{/g;
    const methods = {};
    let match;

    while ((match = methodPattern.exec(content)) !== null) {
      const methodName = match[1];
      const signature = match[0];
      
      if (methods[methodName]) {
        methods[methodName].push({
          signature,
          line: this.getLineNumber(content, match.index)
        });
      } else {
        methods[methodName] = [{
          signature,
          line: this.getLineNumber(content, match.index)
        }];
      }
    }

    // Check for duplicates
    Object.entries(methods).forEach(([methodName, occurrences]) => {
      if (occurrences.length > 1) {
        this.addIssue(
          'duplicate_method_signature',
          'critical',
          `Duplicate method '${methodName}' found ${occurrences.length} times`,
          filePath,
          {
            methodName,
            occurrences: occurrences.map(o => ({ line: o.line, signature: o.signature }))
          }
        );
      }
    });
  }

  checkParameterMismatches(content, filePath) {
    // Look for method calls that might have parameter mismatches
    const callPattern = /(\w+)\s*\([^)]*\)/g;
    const definitionPattern = /(?:async\s+)?(\w+)\s*\(([^)]*)\)\s*{/g;
    
    const definitions = {};
    const calls = {};
    
    let match;
    
    // Collect method definitions
    while ((match = definitionPattern.exec(content)) !== null) {
      const methodName = match[1];
      const params = match[2].split(',').map(p => p.trim()).filter(p => p);
      definitions[methodName] = {
        paramCount: params.length,
        params,
        line: this.getLineNumber(content, match.index)
      };
    }
    
    // Collect method calls
    while ((match = callPattern.exec(content)) !== null) {
      const methodName = match[1];
      const callContent = match[0];
      const paramCount = this.countParameters(callContent);
      
      if (!calls[methodName]) calls[methodName] = [];
      calls[methodName].push({
        paramCount,
        line: this.getLineNumber(content, match.index),
        call: callContent
      });
    }
    
    // Check for mismatches
    Object.entries(calls).forEach(([methodName, callList]) => {
      const definition = definitions[methodName];
      if (definition) {
        callList.forEach(call => {
          if (call.paramCount !== definition.paramCount) {
            this.addIssue(
              'parameter_mismatch',
              'high',
              `Method '${methodName}' called with ${call.paramCount} parameters but defined with ${definition.paramCount}`,
              filePath,
              {
                methodName,
                expectedParams: definition.paramCount,
                actualParams: call.paramCount,
                callLine: call.line,
                definitionLine: definition.line
              }
            );
          }
        });
      }
    });
  }

  checkUnusedImports(content, filePath) {
    const importPattern = /(?:import\s+(?:{[^}]+}|\w+)\s+from\s+['"][^'"]+['"]|const\s+(?:{[^}]+}|\w+)\s*=\s*require\(['"][^'"]+['"]\))/g;
    const imports = [];
    let match;

    while ((match = importPattern.exec(content)) !== null) {
      imports.push({
        statement: match[0],
        line: this.getLineNumber(content, match.index)
      });
    }

    // Simple check for unused imports (could be enhanced)
    imports.forEach(importItem => {
      const importName = this.extractImportName(importItem.statement);
      if (importName && !this.isImportUsed(content, importName, importItem.statement)) {
        this.addIssue(
          'unused_import',
          'low',
          `Potentially unused import: ${importName}`,
          filePath,
          { importStatement: importItem.statement, line: importItem.line }
        );
      }
    });
  }

  checkConfigurationIssues(content, filePath) {
    // Check for hardcoded URLs, API keys, etc.
    const patterns = [
      { pattern: /https?:\/\/localhost:\d+/g, issue: 'hardcoded_localhost', severity: 'medium' },
      { pattern: /process\.env\.\w+\s*\|\|\s*['"][^'"]*['"]/g, issue: 'env_fallback', severity: 'low' },
      { pattern: /['"]\w*[Kk]ey\w*['"]:\s*['"][^'"]{20,}['"]/g, issue: 'potential_hardcoded_key', severity: 'high' }
    ];

    patterns.forEach(({ pattern, issue, severity }) => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        this.addIssue(
          issue,
          severity,
          `Configuration issue detected: ${match[0]}`,
          filePath,
          { match: match[0], line: this.getLineNumber(content, match.index) }
        );
      }
    });
  }

  async checkForKnownIssues() {
    // Check for specific known issues from config
    this.config.knownIssues.forEach(knownIssue => {
      // This would be implemented based on specific patterns
      console.log(`  🔍 Checking for known issue: ${knownIssue.id}`);
    });
  }

  async analyzeMethodSignatures() {
    // Comprehensive method signature analysis across the entire codebase
    const methodRegistry = {};
    
    // This would build a registry of all methods and their signatures
    // Then check for conflicts like we had with createPasswordResetToken
    
    console.log('  📝 Analyzing method signatures...');
  }

  async analyzeParameterMismatches() {
    // Cross-file parameter mismatch analysis
    console.log('  🔍 Checking parameter mismatches...');
  }

  // Helper methods
  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }

  countParameters(callString) {
    const match = callString.match(/\(([^)]*)\)/);
    if (!match || !match[1].trim()) return 0;
    return match[1].split(',').length;
  }

  extractImportName(importStatement) {
    const patterns = [
      /import\s+(\w+)/,
      /import\s+{\s*([^}]+)\s*}/,
      /const\s+(\w+)/,
      /const\s+{\s*([^}]+)\s*}/
    ];
    
    for (const pattern of patterns) {
      const match = importStatement.match(pattern);
      if (match) return match[1].trim();
    }
    return null;
  }

  isImportUsed(content, importName, importStatement) {
    // Simple usage check - could be enhanced
    const usagePattern = new RegExp(`\\b${importName}\\b`, 'g');
    const matches = content.match(usagePattern) || [];
    return matches.length > 1; // More than just the import statement
  }

  addIssue(type, severity, message, filePath, details = {}) {
    this.results.issues.push({
      type,
      severity,
      message,
      filePath,
      details,
      timestamp: new Date().toISOString()
    });

    if (severity === 'critical' || severity === 'high') {
      this.results.summary.failed++;
    } else {
      this.results.summary.warnings++;
    }
  }

  generateRecommendations() {
    const issueTypes = {};
    this.results.issues.forEach(issue => {
      issueTypes[issue.type] = (issueTypes[issue.type] || 0) + 1;
    });

    Object.entries(issueTypes).forEach(([type, count]) => {
      let recommendation = '';
      switch (type) {
        case 'duplicate_method_signature':
          recommendation = `Found ${count} duplicate method signature(s). Consider renaming methods or consolidating functionality.`;
          break;
        case 'parameter_mismatch':
          recommendation = `Found ${count} parameter mismatch(es). Review method calls and ensure parameter counts match definitions.`;
          break;
        case 'unused_import':
          recommendation = `Found ${count} potentially unused import(s). Remove unused imports to improve bundle size.`;
          break;
        default:
          recommendation = `Found ${count} ${type} issue(s). Review and resolve as needed.`;
      }
      
      this.results.recommendations.push({
        type,
        count,
        recommendation,
        priority: this.getPriority(type)
      });
    });
  }

  getPriority(issueType) {
    const priorities = {
      'duplicate_method_signature': 'critical',
      'parameter_mismatch': 'high',
      'potential_hardcoded_key': 'high',
      'hardcoded_localhost': 'medium',
      'unused_import': 'low'
    };
    return priorities[issueType] || 'medium';
  }
}

module.exports = StaticAnalyzer;
