#!/usr/bin/env node

/**
 * Double Reference Detector for FloWorx
 * 
 * Detects duplicate imports, route definitions, component registrations,
 * and other double references that could cause conflicts or inefficiencies.
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { glob } = require('glob');

const readFile = promisify(fs.readFile);

class DoubleReferenceDetector {
  constructor() {
    this.results = {
      duplicateImports: [],
      duplicateRoutes: [],
      duplicateComponents: [],
      duplicateExports: [],
      duplicateConstants: [],
      duplicateUtilities: [],
      summary: {
        totalIssues: 0,
        criticalIssues: 0,
        warningIssues: 0
      }
    };
  }

  async detectAll() {
    console.log('🔍 FLOWORX DOUBLE REFERENCE DETECTION');
    console.log('='.repeat(60));
    
    await this.detectDuplicateImports();
    await this.detectDuplicateRoutes();
    await this.detectDuplicateComponents();
    await this.detectDuplicateExports();
    await this.detectDuplicateConstants();
    await this.detectDuplicateUtilities();
    
    this.generateReport();
    return this.results;
  }

  async detectDuplicateImports() {
    console.log('\n📦 Detecting Duplicate Imports...');
    
    const files = await glob('**/*.{js,jsx}', {
      ignore: ['**/node_modules/**', '**/build/**', '**/dist/**', '**/coverage/**', '**/.git/**']
    });
    
    const importMap = new Map();
    
    for (const file of files) {
      try {
        const content = await readFile(file, 'utf8');
        const imports = this.extractImports(content);
        
        for (const importInfo of imports) {
          const key = `${importInfo.source}:${importInfo.specifier}`;
          
          if (!importMap.has(key)) {
            importMap.set(key, []);
          }
          
          importMap.get(key).push({
            file,
            line: importInfo.line,
            statement: importInfo.statement
          });
        }
      } catch (error) {
        console.warn(`⚠️ Could not read ${file}: ${error.message}`);
      }
    }
    
    // Find duplicates
    for (const [key, locations] of importMap.entries()) {
      if (locations.length > 1) {
        const [source, specifier] = key.split(':');
        this.results.duplicateImports.push({
          source,
          specifier,
          locations,
          severity: this.getImportDuplicateSeverity(locations)
        });
      }
    }
    
    console.log(`Found ${this.results.duplicateImports.length} duplicate import patterns`);
  }

  async detectDuplicateRoutes() {
    console.log('\n🛣️ Detecting Duplicate Routes...');
    
    const routeFiles = await glob('**/routes/**/*.js', {
      ignore: ['**/node_modules/**', '**/.git/**']
    });
    
    const routeMap = new Map();
    
    for (const file of routeFiles) {
      try {
        const content = await readFile(file, 'utf8');
        const routes = this.extractRoutes(content);
        
        for (const route of routes) {
          const key = `${route.method}:${route.path}`;
          
          if (!routeMap.has(key)) {
            routeMap.set(key, []);
          }
          
          routeMap.get(key).push({
            file,
            line: route.line,
            handler: route.handler
          });
        }
      } catch (error) {
        console.warn(`⚠️ Could not read ${file}: ${error.message}`);
      }
    }
    
    // Find duplicates
    for (const [key, locations] of routeMap.entries()) {
      if (locations.length > 1) {
        const [method, routePath] = key.split(':');
        this.results.duplicateRoutes.push({
          method,
          path: routePath,
          locations,
          severity: 'critical' // Route duplicates are always critical
        });
      }
    }
    
    console.log(`Found ${this.results.duplicateRoutes.length} duplicate route definitions`);
  }

  async detectDuplicateComponents() {
    console.log('\n⚛️ Detecting Duplicate Components...');
    
    const componentFiles = await glob('**/components/**/*.{js,jsx}', {
      ignore: ['**/node_modules/**', '**/.git/**']
    });
    
    const componentMap = new Map();
    
    for (const file of componentFiles) {
      try {
        const content = await readFile(file, 'utf8');
        const components = this.extractComponents(content);
        
        for (const component of components) {
          if (!componentMap.has(component.name)) {
            componentMap.set(component.name, []);
          }
          
          componentMap.get(component.name).push({
            file,
            line: component.line,
            type: component.type
          });
        }
      } catch (error) {
        console.warn(`⚠️ Could not read ${file}: ${error.message}`);
      }
    }
    
    // Find duplicates
    for (const [name, locations] of componentMap.entries()) {
      if (locations.length > 1) {
        this.results.duplicateComponents.push({
          name,
          locations,
          severity: this.getComponentDuplicateSeverity(name, locations)
        });
      }
    }
    
    console.log(`Found ${this.results.duplicateComponents.length} duplicate component definitions`);
  }

  async detectDuplicateExports() {
    console.log('\n📤 Detecting Duplicate Exports...');
    
    const files = await glob('**/*.{js,jsx}', {
      ignore: ['**/node_modules/**', '**/build/**', '**/dist/**', '**/.git/**']
    });
    
    const exportMap = new Map();
    
    for (const file of files) {
      try {
        const content = await readFile(file, 'utf8');
        const exports = this.extractExports(content);
        
        for (const exportInfo of exports) {
          if (!exportMap.has(exportInfo.name)) {
            exportMap.set(exportInfo.name, []);
          }
          
          exportMap.get(exportInfo.name).push({
            file,
            line: exportInfo.line,
            type: exportInfo.type
          });
        }
      } catch (error) {
        console.warn(`⚠️ Could not read ${file}: ${error.message}`);
      }
    }
    
    // Find duplicates
    for (const [name, locations] of exportMap.entries()) {
      if (locations.length > 1) {
        this.results.duplicateExports.push({
          name,
          locations,
          severity: this.getExportDuplicateSeverity(name, locations)
        });
      }
    }
    
    console.log(`Found ${this.results.duplicateExports.length} duplicate export definitions`);
  }

  async detectDuplicateConstants() {
    console.log('\n🔢 Detecting Duplicate Constants...');
    
    const files = await glob('**/*.{js,jsx}', {
      ignore: ['**/node_modules/**', '**/build/**', '**/dist/**', '**/.git/**']
    });
    
    const constantMap = new Map();
    
    for (const file of files) {
      try {
        const content = await readFile(file, 'utf8');
        const constants = this.extractConstants(content);
        
        for (const constant of constants) {
          const key = `${constant.name}:${constant.value}`;
          
          if (!constantMap.has(key)) {
            constantMap.set(key, []);
          }
          
          constantMap.get(key).push({
            file,
            line: constant.line
          });
        }
      } catch (error) {
        console.warn(`⚠️ Could not read ${file}: ${error.message}`);
      }
    }
    
    // Find duplicates
    for (const [key, locations] of constantMap.entries()) {
      if (locations.length > 1) {
        const [name, value] = key.split(':');
        this.results.duplicateConstants.push({
          name,
          value,
          locations,
          severity: 'warning'
        });
      }
    }
    
    console.log(`Found ${this.results.duplicateConstants.length} duplicate constant definitions`);
  }

  async detectDuplicateUtilities() {
    console.log('\n🛠️ Detecting Duplicate Utilities...');
    
    const utilFiles = await glob('**/utils/**/*.{js,jsx}', {
      ignore: ['**/node_modules/**', '**/.git/**']
    });
    
    const utilityMap = new Map();
    
    for (const file of utilFiles) {
      try {
        const content = await readFile(file, 'utf8');
        const utilities = this.extractUtilities(content);
        
        for (const utility of utilities) {
          if (!utilityMap.has(utility.name)) {
            utilityMap.set(utility.name, []);
          }
          
          utilityMap.get(utility.name).push({
            file,
            line: utility.line,
            signature: utility.signature
          });
        }
      } catch (error) {
        console.warn(`⚠️ Could not read ${file}: ${error.message}`);
      }
    }
    
    // Find duplicates
    for (const [name, locations] of utilityMap.entries()) {
      if (locations.length > 1) {
        this.results.duplicateUtilities.push({
          name,
          locations,
          severity: this.getUtilityDuplicateSeverity(name, locations)
        });
      }
    }
    
    console.log(`Found ${this.results.duplicateUtilities.length} duplicate utility functions`);
  }

  // Extraction methods
  extractImports(content) {
    const imports = [];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      const importMatch = line.match(/import\s+(.+?)\s+from\s+['"`](.+?)['"`]/);
      if (importMatch) {
        const specifiers = importMatch[1].trim();
        const source = importMatch[2];
        
        imports.push({
          specifier: specifiers,
          source,
          line: index + 1,
          statement: line.trim()
        });
      }
    });
    
    return imports;
  }

  extractRoutes(content) {
    const routes = [];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      const routeMatch = line.match(/router\.(get|post|put|delete|patch)\s*\(\s*['"`](.+?)['"`]/);
      if (routeMatch) {
        routes.push({
          method: routeMatch[1].toUpperCase(),
          path: routeMatch[2],
          line: index + 1,
          handler: line.trim()
        });
      }
    });
    
    return routes;
  }

  extractComponents(content) {
    const components = [];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      // Function components
      const funcMatch = line.match(/(?:export\s+)?(?:default\s+)?function\s+(\w+)/);
      if (funcMatch) {
        components.push({
          name: funcMatch[1],
          type: 'function',
          line: index + 1
        });
      }
      
      // Arrow function components
      const arrowMatch = line.match(/(?:export\s+)?(?:default\s+)?const\s+(\w+)\s*=\s*\(/);
      if (arrowMatch) {
        components.push({
          name: arrowMatch[1],
          type: 'arrow',
          line: index + 1
        });
      }
    });
    
    return components;
  }

  extractExports(content) {
    const exports = [];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      // Named exports
      const namedMatch = line.match(/export\s+(?:const|let|var|function|class)\s+(\w+)/);
      if (namedMatch) {
        exports.push({
          name: namedMatch[1],
          type: 'named',
          line: index + 1
        });
      }
      
      // Default exports
      const defaultMatch = line.match(/export\s+default\s+(\w+)/);
      if (defaultMatch) {
        exports.push({
          name: defaultMatch[1],
          type: 'default',
          line: index + 1
        });
      }
    });
    
    return exports;
  }

  extractConstants(content) {
    const constants = [];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      const constMatch = line.match(/const\s+([A-Z_][A-Z0-9_]*)\s*=\s*(.+?);/);
      if (constMatch) {
        constants.push({
          name: constMatch[1],
          value: constMatch[2].trim(),
          line: index + 1
        });
      }
    });
    
    return constants;
  }

  extractUtilities(content) {
    const utilities = [];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      const funcMatch = line.match(/(?:export\s+)?(?:const\s+)?(\w+)\s*=?\s*(?:function\s*)?\(([^)]*)\)/);
      if (funcMatch) {
        utilities.push({
          name: funcMatch[1],
          signature: funcMatch[2],
          line: index + 1
        });
      }
    });
    
    return utilities;
  }

  // Severity assessment methods
  getImportDuplicateSeverity(locations) {
    // Same file duplicates are critical
    const files = [...new Set(locations.map(l => l.file))];
    return files.length === 1 ? 'critical' : 'warning';
  }

  getComponentDuplicateSeverity(name, locations) {
    // Components with same name in different files might be intentional
    const files = [...new Set(locations.map(l => l.file))];
    return files.length > 1 ? 'warning' : 'critical';
  }

  getExportDuplicateSeverity(name, locations) {
    // Multiple exports of same name are usually critical
    return 'critical';
  }

  getUtilityDuplicateSeverity(name, locations) {
    // Utility function duplicates suggest refactoring opportunity
    return 'warning';
  }

  generateReport() {
    const allIssues = [
      ...this.results.duplicateImports,
      ...this.results.duplicateRoutes,
      ...this.results.duplicateComponents,
      ...this.results.duplicateExports,
      ...this.results.duplicateConstants,
      ...this.results.duplicateUtilities
    ];
    
    this.results.summary.totalIssues = allIssues.length;
    this.results.summary.criticalIssues = allIssues.filter(i => i.severity === 'critical').length;
    this.results.summary.warningIssues = allIssues.filter(i => i.severity === 'warning').length;
    
    console.log('\n📊 DOUBLE REFERENCE DETECTION REPORT');
    console.log('='.repeat(60));
    console.log(`📦 Duplicate Imports: ${this.results.duplicateImports.length}`);
    console.log(`🛣️ Duplicate Routes: ${this.results.duplicateRoutes.length}`);
    console.log(`⚛️ Duplicate Components: ${this.results.duplicateComponents.length}`);
    console.log(`📤 Duplicate Exports: ${this.results.duplicateExports.length}`);
    console.log(`🔢 Duplicate Constants: ${this.results.duplicateConstants.length}`);
    console.log(`🛠️ Duplicate Utilities: ${this.results.duplicateUtilities.length}`);
    console.log(`\n🚨 Critical Issues: ${this.results.summary.criticalIssues}`);
    console.log(`⚠️ Warning Issues: ${this.results.summary.warningIssues}`);
    console.log(`📋 Total Issues: ${this.results.summary.totalIssues}`);
    
    // Save detailed report
    const reportPath = 'double-reference-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  }
}

// Run detection if called directly
if (require.main === module) {
  const detector = new DoubleReferenceDetector();
  detector.detectAll()
    .then(results => {
      process.exit(results.summary.criticalIssues > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('❌ Detection failed:', error);
      process.exit(1);
    });
}

module.exports = DoubleReferenceDetector;
