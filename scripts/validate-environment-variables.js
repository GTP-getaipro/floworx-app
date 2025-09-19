#!/usr/bin/env node

/**
 * Environment Variable Cross-Reference Validator for FloWorx
 * 
 * Validates environment variables across all environments and configurations
 * to ensure consistency, completeness, and security best practices.
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { glob } = require('glob');

const readFile = promisify(fs.readFile);

class EnvironmentVariableValidator {
  constructor() {
    this.results = {
      missingVariables: [],
      inconsistentValues: [],
      securityIssues: [],
      unusedVariables: [],
      typeConflicts: [],
      summary: {
        totalVariables: 0,
        totalIssues: 0,
        criticalIssues: 0,
        warningIssues: 0
      }
    };
    
    this.environments = {
      production: ['.env.production', 'frontend/.env.production'],
      development: ['.env.development', 'frontend/.env.development'],
      test: ['.env.test', 'frontend/.env.test'],
      template: ['.env.production.template']
    };
    
    this.requiredVariables = {
      production: [
        'NODE_ENV',
        'PORT',
        'FRONTEND_URL',
        'SUPABASE_URL',
        'SUPABASE_ANON_KEY',
        'JWT_SECRET',
        'ENCRYPTION_KEY'
      ],
      development: [
        'NODE_ENV',
        'PORT',
        'SUPABASE_URL',
        'SUPABASE_ANON_KEY'
      ],
      test: [
        'NODE_ENV',
        'JWT_SECRET',
        'ENCRYPTION_KEY'
      ]
    };
    
    this.sensitivePatterns = [
      /password/i,
      /secret/i,
      /key/i,
      /token/i,
      /auth/i,
      /api_key/i,
      /private/i
    ];
  }

  async validateAll() {
    console.log('🔍 FLOWORX ENVIRONMENT VARIABLE VALIDATION');
    console.log('='.repeat(60));
    
    const envData = await this.loadAllEnvironments();
    const codeUsage = await this.scanCodeUsage();
    
    await this.validateRequiredVariables(envData);
    await this.validateConsistency(envData);
    await this.validateSecurity(envData);
    await this.validateUsage(envData, codeUsage);
    await this.validateTypes(envData);
    
    this.generateReport();
    return this.results;
  }

  async loadAllEnvironments() {
    console.log('\n📋 Loading Environment Files...');
    
    const envData = {};
    
    for (const [envName, files] of Object.entries(this.environments)) {
      envData[envName] = {};
      
      for (const file of files) {
        if (fs.existsSync(file)) {
          try {
            const content = await readFile(file, 'utf8');
            const variables = this.parseEnvFile(content);
            
            envData[envName][file] = variables;
            console.log(`✅ Loaded ${Object.keys(variables).length} variables from ${file}`);
          } catch (error) {
            console.warn(`⚠️ Could not read ${file}: ${error.message}`);
          }
        } else {
          console.warn(`⚠️ Environment file not found: ${file}`);
        }
      }
    }
    
    return envData;
  }

  async scanCodeUsage() {
    console.log('\n🔍 Scanning Code for Environment Variable Usage...');
    
    const files = await glob('**/*.{js,jsx}', {
      ignore: ['**/node_modules/**', '**/build/**', '**/dist/**', '**/coverage/**', '**/.git/**']
    });
    
    const usage = new Set();
    
    for (const file of files) {
      try {
        const content = await readFile(file, 'utf8');
        const variables = this.extractEnvUsage(content);
        
        variables.forEach(variable => {
          usage.add(variable);
        });
      } catch (error) {
        console.warn(`⚠️ Could not scan ${file}: ${error.message}`);
      }
    }
    
    console.log(`Found ${usage.size} environment variables used in code`);
    return usage;
  }

  async validateRequiredVariables(envData) {
    console.log('\n✅ Validating Required Variables...');
    
    for (const [envName, requiredVars] of Object.entries(this.requiredVariables)) {
      const envFiles = envData[envName] || {};
      
      for (const variable of requiredVars) {
        let found = false;
        
        for (const [file, variables] of Object.entries(envFiles)) {
          if (variables[variable]) {
            found = true;
            break;
          }
        }
        
        if (!found) {
          this.results.missingVariables.push({
            variable,
            environment: envName,
            severity: this.getVariableSeverity(variable),
            suggestion: this.getVariableSuggestion(variable)
          });
        }
      }
    }
    
    console.log(`Found ${this.results.missingVariables.length} missing required variables`);
  }

  async validateConsistency(envData) {
    console.log('\n🔄 Validating Variable Consistency...');
    
    const allVariables = new Set();
    
    // Collect all variable names
    for (const envFiles of Object.values(envData)) {
      for (const variables of Object.values(envFiles)) {
        Object.keys(variables).forEach(key => allVariables.add(key));
      }
    }
    
    // Check consistency for each variable
    for (const variable of allVariables) {
      const values = {};
      
      for (const [envName, envFiles] of Object.entries(envData)) {
        for (const [file, variables] of Object.entries(envFiles)) {
          if (variables[variable]) {
            if (!values[envName]) {
              values[envName] = [];
            }
            values[envName].push({
              file,
              value: variables[variable]
            });
          }
        }
      }
      
      // Check for inconsistencies within same environment
      for (const [envName, envValues] of Object.entries(values)) {
        const uniqueValues = [...new Set(envValues.map(v => v.value))];
        
        if (uniqueValues.length > 1 && !this.isExpectedInconsistency(variable)) {
          this.results.inconsistentValues.push({
            variable,
            environment: envName,
            values: envValues,
            severity: 'critical'
          });
        }
      }
    }
    
    console.log(`Found ${this.results.inconsistentValues.length} inconsistent variables`);
  }

  async validateSecurity(envData) {
    console.log('\n🔒 Validating Security Practices...');
    
    for (const [envName, envFiles] of Object.entries(envData)) {
      for (const [file, variables] of Object.entries(envFiles)) {
        for (const [variable, value] of Object.entries(variables)) {
          // Check for sensitive variables with weak values
          if (this.isSensitiveVariable(variable)) {
            const issues = this.checkSensitiveValue(variable, value);
            
            issues.forEach(issue => {
              this.results.securityIssues.push({
                variable,
                file,
                environment: envName,
                issue,
                severity: 'critical'
              });
            });
          }
          
          // Check for hardcoded values that should be environment-specific
          if (this.isHardcodedValue(variable, value)) {
            this.results.securityIssues.push({
              variable,
              file,
              environment: envName,
              issue: 'Hardcoded value detected',
              severity: 'warning'
            });
          }
        }
      }
    }
    
    console.log(`Found ${this.results.securityIssues.length} security issues`);
  }

  async validateUsage(envData, codeUsage) {
    console.log('\n📊 Validating Variable Usage...');
    
    const definedVariables = new Set();
    
    // Collect all defined variables
    for (const envFiles of Object.values(envData)) {
      for (const variables of Object.values(envFiles)) {
        Object.keys(variables).forEach(key => definedVariables.add(key));
      }
    }
    
    // Find unused variables
    for (const variable of definedVariables) {
      if (!codeUsage.has(variable) && !this.isSystemVariable(variable)) {
        this.results.unusedVariables.push({
          variable,
          severity: 'warning',
          suggestion: 'Consider removing if not needed'
        });
      }
    }
    
    // Find used but undefined variables
    for (const variable of codeUsage) {
      if (!definedVariables.has(variable) && !this.isSystemVariable(variable)) {
        this.results.missingVariables.push({
          variable,
          environment: 'all',
          severity: 'critical',
          suggestion: 'Define in appropriate environment files'
        });
      }
    }
    
    console.log(`Found ${this.results.unusedVariables.length} unused variables`);
  }

  async validateTypes(envData) {
    console.log('\n🔢 Validating Variable Types...');
    
    const typeMap = {};
    
    // Analyze types across environments
    for (const [envName, envFiles] of Object.entries(envData)) {
      for (const [file, variables] of Object.entries(envFiles)) {
        for (const [variable, value] of Object.entries(variables)) {
          const type = this.inferType(value);
          
          if (!typeMap[variable]) {
            typeMap[variable] = {};
          }
          
          if (!typeMap[variable][type]) {
            typeMap[variable][type] = [];
          }
          
          typeMap[variable][type].push({
            environment: envName,
            file,
            value
          });
        }
      }
    }
    
    // Find type conflicts
    for (const [variable, types] of Object.entries(typeMap)) {
      const typeNames = Object.keys(types);
      
      if (typeNames.length > 1) {
        this.results.typeConflicts.push({
          variable,
          types,
          severity: 'warning'
        });
      }
    }
    
    console.log(`Found ${this.results.typeConflicts.length} type conflicts`);
  }

  // Helper methods
  parseEnvFile(content) {
    const variables = {};
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=').trim();
        
        // Remove quotes if present
        const cleanValue = value.replace(/^["']|["']$/g, '');
        variables[key.trim()] = cleanValue;
      }
    }
    
    return variables;
  }

  extractEnvUsage(content) {
    const variables = new Set();
    
    // process.env.VARIABLE_NAME
    const processEnvMatches = content.match(/process\.env\.([A-Z_][A-Z0-9_]*)/g) || [];
    processEnvMatches.forEach(match => {
      const variable = match.replace('process.env.', '');
      variables.add(variable);
    });
    
    // process.env['VARIABLE_NAME'] or process.env["VARIABLE_NAME"]
    const bracketMatches = content.match(/process\.env\[['"]([A-Z_][A-Z0-9_]*)['"]]/g) || [];
    bracketMatches.forEach(match => {
      const variable = match.match(/['"]([A-Z_][A-Z0-9_]*)['"]]/)[1];
      variables.add(variable);
    });
    
    return Array.from(variables);
  }

  isSensitiveVariable(variable) {
    return this.sensitivePatterns.some(pattern => pattern.test(variable));
  }

  checkSensitiveValue(variable, value) {
    const issues = [];
    
    if (!value || value.trim() === '') {
      issues.push('Empty sensitive variable');
    } else if (value.length < 16 && variable.toLowerCase().includes('secret')) {
      issues.push('Secret value too short (< 16 characters)');
    } else if (value === 'your_' + variable.toLowerCase()) {
      issues.push('Placeholder value detected');
    } else if (value.includes('example') || value.includes('test')) {
      issues.push('Example/test value in production variable');
    }
    
    return issues;
  }

  isHardcodedValue(variable, value) {
    const hardcodedPatterns = [
      /^https?:\/\/localhost/,
      /^127\.0\.0\.1/,
      /^0\.0\.0\.0/,
      /development/i,
      /staging/i
    ];
    
    return hardcodedPatterns.some(pattern => pattern.test(value));
  }

  isSystemVariable(variable) {
    const systemVars = [
      'NODE_ENV',
      'PATH',
      'HOME',
      'USER',
      'PWD',
      'SHELL',
      'TERM'
    ];
    
    return systemVars.includes(variable);
  }

  isExpectedInconsistency(variable) {
    const expectedInconsistencies = [
      'NODE_ENV',
      'DATABASE_URL',
      'FRONTEND_URL',
      'API_URL'
    ];
    
    return expectedInconsistencies.includes(variable);
  }

  inferType(value) {
    if (value === 'true' || value === 'false') {
      return 'boolean';
    } else if (/^\d+$/.test(value)) {
      return 'number';
    } else if (/^https?:\/\//.test(value)) {
      return 'url';
    } else if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)) {
      return 'email';
    } else {
      return 'string';
    }
  }

  getVariableSeverity(variable) {
    const criticalVars = ['JWT_SECRET', 'ENCRYPTION_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
    return criticalVars.includes(variable) ? 'critical' : 'warning';
  }

  getVariableSuggestion(variable) {
    const suggestions = {
      'JWT_SECRET': 'Generate a secure random string (32+ characters)',
      'ENCRYPTION_KEY': 'Generate a 32-byte encryption key',
      'SUPABASE_URL': 'Get from Supabase project settings',
      'SUPABASE_ANON_KEY': 'Get from Supabase project API settings',
      'PORT': 'Set to 5001 for production, 3000 for development'
    };
    
    return suggestions[variable] || 'Define appropriate value for your environment';
  }

  generateReport() {
    const allIssues = [
      ...this.results.missingVariables,
      ...this.results.inconsistentValues,
      ...this.results.securityIssues,
      ...this.results.unusedVariables,
      ...this.results.typeConflicts
    ];
    
    this.results.summary.totalIssues = allIssues.length;
    this.results.summary.criticalIssues = allIssues.filter(i => i.severity === 'critical').length;
    this.results.summary.warningIssues = allIssues.filter(i => i.severity === 'warning').length;
    
    console.log('\n📊 ENVIRONMENT VARIABLE VALIDATION REPORT');
    console.log('='.repeat(60));
    console.log(`❌ Missing Variables: ${this.results.missingVariables.length}`);
    console.log(`🔄 Inconsistent Values: ${this.results.inconsistentValues.length}`);
    console.log(`🔒 Security Issues: ${this.results.securityIssues.length}`);
    console.log(`📊 Unused Variables: ${this.results.unusedVariables.length}`);
    console.log(`🔢 Type Conflicts: ${this.results.typeConflicts.length}`);
    console.log(`\n🚨 Critical Issues: ${this.results.summary.criticalIssues}`);
    console.log(`⚠️ Warning Issues: ${this.results.summary.warningIssues}`);
    console.log(`📋 Total Issues: ${this.results.summary.totalIssues}`);
    
    // Save detailed report
    const reportPath = 'environment-variable-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new EnvironmentVariableValidator();
  validator.validateAll()
    .then(results => {
      process.exit(results.summary.criticalIssues > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('❌ Validation failed:', error);
      process.exit(1);
    });
}

module.exports = EnvironmentVariableValidator;
