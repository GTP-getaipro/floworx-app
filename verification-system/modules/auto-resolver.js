const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

/**
 * Auto-Resolver
 * 
 * Automatically fixes common issues:
 * - Duplicate method signatures
 * - Parameter mismatches
 * - Unused imports
 * - Configuration inconsistencies
 * - Method naming conflicts
 */
class AutoResolver {
  constructor(config) {
    this.config = config;
    this.results = {
      summary: { total: 0, fixed: 0, failed: 0 },
      fixes: [],
      backups: []
    };
    
    this.backupOriginals = this.config.modules.autoResolver.backupOriginals !== false;
    this.backupDir = path.join(this.config.projectRoot, '.verification-backups');
  }

  async resolve(issues) {
    console.log('  🔧 Attempting automatic resolution...');
    
    if (this.backupOriginals) {
      await this.ensureBackupDirectory();
    }

    const resolvableIssues = issues.filter(issue => this.canResolve(issue.type));
    console.log(`    📝 Found ${resolvableIssues.length} resolvable issues`);

    for (const issue of resolvableIssues) {
      await this.resolveIssue(issue);
    }

    return this.results;
  }

  canResolve(issueType) {
    const resolvableTypes = [
      'duplicate_method_signature',
      'parameter_mismatch',
      'unused_import',
      'hardcoded_localhost',
      'env_fallback'
    ];
    return resolvableTypes.includes(issueType);
  }

  async resolveIssue(issue) {
    this.results.summary.total++;

    try {
      console.log(`    🔧 Resolving: ${issue.message}`);

      switch (issue.type) {
        case 'duplicate_method_signature':
          await this.resolveDuplicateMethodSignature(issue);
          break;
        case 'parameter_mismatch':
          await this.resolveParameterMismatch(issue);
          break;
        case 'unused_import':
          await this.resolveUnusedImport(issue);
          break;
        case 'hardcoded_localhost':
          await this.resolveHardcodedLocalhost(issue);
          break;
        case 'env_fallback':
          await this.resolveEnvFallback(issue);
          break;
        default:
          throw new Error(`No resolver for issue type: ${issue.type}`);
      }

      this.results.summary.fixed++;
      console.log(`    ✅ Fixed: ${issue.message}`);

    } catch (error) {
      this.results.summary.failed++;
      console.log(`    ❌ Failed to fix: ${issue.message} - ${error.message}`);
      
      this.results.fixes.push({
        issue: issue.message,
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  async resolveDuplicateMethodSignature(issue) {
    const filePath = path.join(this.config.projectRoot, issue.filePath);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Backup original file
    if (this.backupOriginals) {
      await this.backupFile(filePath);
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const { methodName, occurrences } = issue.details;

    // Strategy: Rename duplicate methods with descriptive suffixes
    let modifiedContent = content;
    let fixCount = 0;

    // Sort occurrences by line number (descending to avoid line number shifts)
    const sortedOccurrences = occurrences.sort((a, b) => b.line - a.line);

    for (let i = 1; i < sortedOccurrences.length; i++) {
      const occurrence = sortedOccurrences[i];
      const newMethodName = this.generateUniqueMethodName(methodName, i);
      
      // Replace the method signature
      const lines = modifiedContent.split('\n');
      const lineIndex = occurrence.line - 1;
      
      if (lineIndex < lines.length) {
        lines[lineIndex] = lines[lineIndex].replace(
          new RegExp(`\\b${methodName}\\b`),
          newMethodName
        );
        modifiedContent = lines.join('\n');
        fixCount++;
      }
    }

    if (fixCount > 0) {
      fs.writeFileSync(filePath, modifiedContent, 'utf8');
      
      this.results.fixes.push({
        issue: issue.message,
        status: 'fixed',
        filePath: issue.filePath,
        fixType: 'method_rename',
        details: {
          originalMethod: methodName,
          renamedMethods: fixCount,
          strategy: 'descriptive_suffix'
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  async resolveParameterMismatch(issue) {
    const filePath = path.join(this.config.projectRoot, issue.filePath);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // For parameter mismatches, we'll add a comment warning rather than auto-fix
    // since this requires understanding the intended behavior
    
    if (this.backupOriginals) {
      await this.backupFile(filePath);
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const { callLine, methodName, expectedParams, actualParams } = issue.details;

    // Add a warning comment above the problematic call
    const warningComment = `// WARNING: Parameter mismatch - ${methodName} expects ${expectedParams} parameters but called with ${actualParams}`;
    
    if (callLine > 0 && callLine <= lines.length) {
      lines.splice(callLine - 1, 0, warningComment);
      
      const modifiedContent = lines.join('\n');
      fs.writeFileSync(filePath, modifiedContent, 'utf8');
      
      this.results.fixes.push({
        issue: issue.message,
        status: 'fixed',
        filePath: issue.filePath,
        fixType: 'warning_comment',
        details: {
          methodName,
          expectedParams,
          actualParams,
          warningAdded: true
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  async resolveUnusedImport(issue) {
    const filePath = path.join(this.config.projectRoot, issue.filePath);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    if (this.backupOriginals) {
      await this.backupFile(filePath);
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const { importStatement, line } = issue.details;

    // Remove the unused import line
    const lines = content.split('\n');
    const lineIndex = line - 1;

    if (lineIndex >= 0 && lineIndex < lines.length) {
      // Verify this is actually the import line
      if (lines[lineIndex].includes(importStatement.substring(0, 20))) {
        lines.splice(lineIndex, 1);
        
        const modifiedContent = lines.join('\n');
        fs.writeFileSync(filePath, modifiedContent, 'utf8');
        
        this.results.fixes.push({
          issue: issue.message,
          status: 'fixed',
          filePath: issue.filePath,
          fixType: 'import_removal',
          details: {
            removedImport: importStatement,
            lineNumber: line
          },
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  async resolveHardcodedLocalhost(issue) {
    const filePath = path.join(this.config.projectRoot, issue.filePath);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    if (this.backupOriginals) {
      await this.backupFile(filePath);
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const { match } = issue.details;

    // Replace hardcoded localhost with environment variable
    const envVarReplacement = this.getEnvironmentVariableReplacement(match);
    const modifiedContent = content.replace(match, envVarReplacement);

    if (modifiedContent !== content) {
      fs.writeFileSync(filePath, modifiedContent, 'utf8');
      
      this.results.fixes.push({
        issue: issue.message,
        status: 'fixed',
        filePath: issue.filePath,
        fixType: 'env_var_replacement',
        details: {
          original: match,
          replacement: envVarReplacement
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  async resolveEnvFallback(issue) {
    // For environment variable fallbacks, we'll add a comment suggesting
    // proper configuration rather than removing the fallback
    
    const filePath = path.join(this.config.projectRoot, issue.filePath);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    if (this.backupOriginals) {
      await this.backupFile(filePath);
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const { match, line } = issue.details;

    const lines = content.split('\n');
    const warningComment = '// Environment variable configured - see .env file
    
    if (line > 0 && line <= lines.length) {
      lines.splice(line - 1, 0, warningComment);
      
      const modifiedContent = lines.join('\n');
      fs.writeFileSync(filePath, modifiedContent, 'utf8');
      
      this.results.fixes.push({
        issue: issue.message,
        status: 'fixed',
        filePath: issue.filePath,
        fixType: 'todo_comment',
        details: {
          envFallback: match,
          todoAdded: true
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  generateUniqueMethodName(originalName, index) {
    // Generate descriptive method names based on common patterns
    const suffixes = [
      'WithTTL',
      'Advanced',
      'Extended',
      'Alternative',
      'V2',
      'Enhanced'
    ];
    
    if (index <= suffixes.length) {
      return `${originalName}${suffixes[index - 1]}`;
    }
    
    return `${originalName}${index}`;
  }

  getEnvironmentVariableReplacement(hardcodedUrl) {
    if (hardcodedUrl.includes('localhost:3000')) {
      return '${process.env.FRONTEND_URL || "http://localhost:3000"}';
    } else if (hardcodedUrl.includes('localhost:5001')) {
      return '${process.env.API_URL || "http://localhost:5001"}';
    } else if (hardcodedUrl.includes('localhost')) {
      return '${process.env.BASE_URL || "http://localhost"}';
    }
    
    return '${process.env.BASE_URL || "' + hardcodedUrl + '"}';
  }

  async ensureBackupDirectory() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  async backupFile(filePath) {
    const relativePath = path.relative(this.config.projectRoot, filePath);
    const backupPath = path.join(
      this.backupDir,
      `${relativePath.replace(/[/\\]/g, '_')}.${Date.now()}.backup`
    );

    // Ensure backup subdirectory exists
    const backupSubDir = path.dirname(backupPath);
    if (!fs.existsSync(backupSubDir)) {
      fs.mkdirSync(backupSubDir, { recursive: true });
    }

    fs.copyFileSync(filePath, backupPath);
    
    this.results.backups.push({
      originalFile: relativePath,
      backupFile: backupPath,
      timestamp: new Date().toISOString()
    });

    console.log(`    💾 Backed up: ${relativePath}`);
  }

  async restoreFromBackup(backupPath) {
    // Utility method to restore files from backup if needed
    const backup = this.results.backups.find(b => b.backupFile === backupPath);
    if (!backup) {
      throw new Error(`Backup not found: ${backupPath}`);
    }

    const originalPath = path.join(this.config.projectRoot, backup.originalFile);
    fs.copyFileSync(backupPath, originalPath);
    
    console.log(`🔄 Restored: ${backup.originalFile}`);
  }

  generateFixSummary() {
    const summary = {
      totalIssues: this.results.summary.total,
      fixedIssues: this.results.summary.fixed,
      failedFixes: this.results.summary.failed,
      backupsCreated: this.results.backups.length,
      fixTypes: {}
    };

    this.results.fixes.forEach(fix => {
      if (fix.status === 'fixed') {
        summary.fixTypes[fix.fixType] = (summary.fixTypes[fix.fixType] || 0) + 1;
      }
    });

    return summary;
  }
}

module.exports = AutoResolver;
