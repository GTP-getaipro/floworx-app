#!/usr/bin/env node

/**
 * Component Contract Validation Script
 * 
 * Scans React components to identify potential prop/context mismatches
 * and missing documentation.
 */

const fs = require('fs');
const path = require('path');

class ComponentContractValidator {
  constructor() {
    this.issues = [];
    this.componentsScanned = 0;
    this.frontendDir = path.join(__dirname, '../frontend/src');
  }

  async validateAllComponents() {
    console.log('🔍 FLOWORX COMPONENT CONTRACT VALIDATION');
    console.log('=====================================');
    
    await this.scanDirectory(this.frontendDir);
    this.generateReport();
  }

  async scanDirectory(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        await this.scanDirectory(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.jsx') || entry.name.endsWith('.js'))) {
        await this.validateComponent(fullPath);
      }
    }
  }

  async validateComponent(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(this.frontendDir, filePath);
      
      // Skip test files and non-component files
      if (relativePath.includes('.test.') || relativePath.includes('.spec.')) {
        return;
      }

      this.componentsScanned++;
      
      // Check for React component
      if (!this.isReactComponent(content)) {
        return;
      }

      console.log(`📄 Validating: ${relativePath}`);

      // Validation checks
      this.checkJSDocPresence(content, relativePath);
      this.checkPropUsage(content, relativePath);
      this.checkContextUsage(content, relativePath);
      this.checkErrorHandling(content, relativePath);
      this.checkFormSubmission(content, relativePath);

    } catch (error) {
      this.addIssue('ERROR', filePath, `Failed to read file: ${error.message}`);
    }
  }

  isReactComponent(content) {
    // Check for React component patterns
    return (
      content.includes('export default function') ||
      content.includes('export function') ||
      content.includes('const ') && content.includes('= () =>') ||
      content.includes('React.Component') ||
      content.includes('function ') && content.includes('return (')
    );
  }

  checkJSDocPresence(content, filePath) {
    const hasJSDoc = content.includes('/**') && content.includes('*/');
    const hasExportDefault = content.includes('export default');
    
    if (hasExportDefault && !hasJSDoc) {
      this.addIssue('MISSING_DOCS', filePath, 'Component lacks JSDoc documentation');
    }
  }

  checkPropUsage(content, filePath) {
    // Check for prop destructuring in function parameters
    const propDestructuringMatch = content.match(/function\s+\w+\s*\(\s*\{\s*([^}]+)\s*\}/);
    const arrowPropMatch = content.match(/=\s*\(\s*\{\s*([^}]+)\s*\}\s*\)\s*=>/);
    
    let propsUsed = [];
    if (propDestructuringMatch) {
      propsUsed = propDestructuringMatch[1].split(',').map(p => p.trim().split('=')[0].trim());
    } else if (arrowPropMatch) {
      propsUsed = arrowPropMatch[1].split(',').map(p => p.trim().split('=')[0].trim());
    }

    // Check for common problematic patterns
    if (propsUsed.includes('onSubmit') && !content.includes('useAuth')) {
      this.addIssue('PROP_CONTEXT_MISMATCH', filePath, 
        'Component expects onSubmit prop but should likely use AuthContext');
    }

    if (propsUsed.length > 5) {
      this.addIssue('TOO_MANY_PROPS', filePath, 
        `Component has ${propsUsed.length} props - consider using context or reducing complexity`);
    }
  }

  checkContextUsage(content, filePath) {
    const usesContext = content.includes('useAuth') || content.includes('useContext');
    const expectsProps = content.includes('onSubmit') || content.includes('onLogin') || content.includes('onRegister');
    
    if (usesContext && expectsProps) {
      this.addIssue('MIXED_PATTERNS', filePath, 
        'Component mixes context usage with prop expectations - choose one pattern');
    }

    // Check for context usage without provider check
    if (content.includes('useAuth') && !content.includes('AuthProvider')) {
      // This is just a warning since the provider might be higher up
      this.addIssue('CONTEXT_DEPENDENCY', filePath, 
        'Component uses AuthContext - ensure it\'s wrapped in AuthProvider');
    }
  }

  checkErrorHandling(content, filePath) {
    const hasAsyncFunction = content.includes('async ') || content.includes('await ');
    const hasTryCatch = content.includes('try {') && content.includes('catch');
    
    if (hasAsyncFunction && !hasTryCatch) {
      this.addIssue('MISSING_ERROR_HANDLING', filePath, 
        'Component has async operations but lacks try-catch error handling');
    }

    // Check for consistent error state management
    const hasErrorState = content.includes('Error') && content.includes('useState');
    const hasAsyncCall = content.includes('await ') && (content.includes('api') || content.includes('fetch'));
    
    if (hasAsyncCall && !hasErrorState) {
      this.addIssue('MISSING_ERROR_STATE', filePath, 
        'Component makes API calls but lacks error state management');
    }
  }

  checkFormSubmission(content, filePath) {
    const hasForm = content.includes('<form') || content.includes('onSubmit');
    const hasValidation = content.includes('validate') || content.includes('error');
    const hasLoadingState = content.includes('loading') || content.includes('isLoading');
    
    if (hasForm && !hasValidation) {
      this.addIssue('MISSING_VALIDATION', filePath, 
        'Form component lacks validation logic');
    }

    if (hasForm && !hasLoadingState) {
      this.addIssue('MISSING_LOADING_STATE', filePath, 
        'Form component lacks loading state management');
    }
  }

  addIssue(type, filePath, message) {
    this.issues.push({
      type,
      file: path.relative(this.frontendDir, filePath),
      message,
      severity: this.getSeverity(type)
    });
  }

  getSeverity(type) {
    const severityMap = {
      'ERROR': 'HIGH',
      'PROP_CONTEXT_MISMATCH': 'HIGH',
      'MIXED_PATTERNS': 'HIGH',
      'MISSING_ERROR_HANDLING': 'MEDIUM',
      'MISSING_ERROR_STATE': 'MEDIUM',
      'MISSING_VALIDATION': 'MEDIUM',
      'MISSING_LOADING_STATE': 'MEDIUM',
      'MISSING_DOCS': 'LOW',
      'TOO_MANY_PROPS': 'LOW',
      'CONTEXT_DEPENDENCY': 'LOW'
    };
    return severityMap[type] || 'LOW';
  }

  generateReport() {
    console.log('\n📊 VALIDATION REPORT');
    console.log('===================');
    console.log(`Components Scanned: ${this.componentsScanned}`);
    console.log(`Issues Found: ${this.issues.length}`);

    if (this.issues.length === 0) {
      console.log('\n🎉 No issues found! All components follow good practices.');
      return;
    }

    // Group by severity
    const groupedIssues = this.issues.reduce((acc, issue) => {
      if (!acc[issue.severity]) acc[issue.severity] = [];
      acc[issue.severity].push(issue);
      return acc;
    }, {});

    // Report by severity
    ['HIGH', 'MEDIUM', 'LOW'].forEach(severity => {
      if (groupedIssues[severity]) {
        console.log(`\n🚨 ${severity} PRIORITY ISSUES (${groupedIssues[severity].length}):`);
        groupedIssues[severity].forEach(issue => {
          console.log(`   📁 ${issue.file}`);
          console.log(`      ${issue.message}`);
        });
      }
    });

    // Summary recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    
    const highPriorityCount = groupedIssues.HIGH?.length || 0;
    if (highPriorityCount > 0) {
      console.log(`   🔥 Fix ${highPriorityCount} HIGH priority issues immediately`);
    }
    
    const mediumPriorityCount = groupedIssues.MEDIUM?.length || 0;
    if (mediumPriorityCount > 0) {
      console.log(`   ⚠️  Address ${mediumPriorityCount} MEDIUM priority issues in next sprint`);
    }
    
    const lowPriorityCount = groupedIssues.LOW?.length || 0;
    if (lowPriorityCount > 0) {
      console.log(`   📝 Improve ${lowPriorityCount} LOW priority issues when time permits`);
    }

    console.log('\n🔧 NEXT STEPS:');
    console.log('   1. Review the Mismatch Prevention Guide: docs/MISMATCH_PREVENTION_GUIDE.md');
    console.log('   2. Fix HIGH priority issues first');
    console.log('   3. Add JSDoc documentation to components');
    console.log('   4. Implement consistent error handling patterns');
    console.log('   5. Run this script regularly to catch new issues');

    // Exit with error code if high priority issues found
    if (highPriorityCount > 0) {
      process.exit(1);
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new ComponentContractValidator();
  validator.validateAllComponents().catch(console.error);
}

module.exports = ComponentContractValidator;
