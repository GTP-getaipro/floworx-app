#!/usr/bin/env node

/**
 * FloWorx SaaS - Comprehensive Test Suite Inventory
 * Analyzes all test files and provides detailed inventory
 */

const fs = require('fs');
const path = require('path');

class TestInventoryAnalyzer {
  constructor() {
    this.inventory = {
      summary: {
        totalTestFiles: 0,
        totalTestSuites: 0,
        totalTestCases: 0,
        frameworks: new Set(),
        categories: new Set()
      },
      byFramework: {},
      byCategory: {},
      byLocation: {},
      testFiles: [],
      coverageGaps: []
    };
  }

  async analyzeTestSuite() {
    console.log('🔍 FloWorx SaaS - Comprehensive Test Suite Inventory');
    console.log('='.repeat(60));
    console.log('Analyzing all test files across the codebase...\n');

    // Scan all test directories
    await this.scanTestDirectories();

    // Generate comprehensive report
    await this.generateInventoryReport();
  }

  async scanTestDirectories() {
    const testDirectories = [
      './tests',
      './backend/tests',
      './frontend/src',
      './archive/test-files'
    ];

    for (const dir of testDirectories) {
      if (fs.existsSync(dir)) {
        await this.scanDirectory(dir, dir);
      }
    }
  }

  async scanDirectory(dirPath, rootPath) {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        await this.scanDirectory(fullPath, rootPath);
      } else if (stat.isFile() && this.isTestFile(item)) {
        await this.analyzeTestFile(fullPath, rootPath);
      }
    }
  }

  isTestFile(fileName) {
    return fileName.match(/\.(test|spec)\.(js|jsx|ts|tsx)$/) ||
           fileName.includes('test') && fileName.endsWith('.js');
  }

  async analyzeTestFile(filePath, rootPath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative('.', filePath);
      
      const analysis = {
        path: relativePath,
        fileName: path.basename(filePath),
        framework: this.detectFramework(content),
        category: this.detectCategory(filePath, content),
        location: this.detectLocation(filePath),
        suites: this.extractTestSuites(content),
        totalTests: this.countTestCases(content),
        status: this.detectStatus(content),
        coverage: this.detectCoverage(filePath, content),
        dependencies: this.extractDependencies(content),
        size: fs.statSync(filePath).size
      };

      this.inventory.testFiles.push(analysis);
      this.updateSummary(analysis);
      
    } catch (error) {
      console.warn(`⚠️  Could not analyze ${filePath}: ${error.message}`);
    }
  }

  detectFramework(content) {
    if (content.includes('@playwright/test')) return 'Playwright';
    if (content.includes('describe(') && content.includes('test(')) return 'Jest';
    if (content.includes('describe(') && content.includes('it(')) return 'Jest/Mocha';
    if (content.includes('supertest')) return 'Jest + Supertest';
    if (content.includes('@testing-library')) return 'Jest + React Testing Library';
    if (content.includes('require(\'supertest\')')) return 'Jest + Supertest';
    return 'Custom/Unknown';
  }

  detectCategory(filePath, content) {
    const path = filePath.toLowerCase();
    
    if (path.includes('e2e') || path.includes('end-to-end')) return 'End-to-End';
    if (path.includes('integration')) return 'Integration';
    if (path.includes('unit')) return 'Unit';
    if (path.includes('performance')) return 'Performance';
    if (path.includes('security')) return 'Security';
    if (path.includes('api')) return 'API';
    if (path.includes('frontend') || path.includes('component')) return 'Frontend/Component';
    if (path.includes('backend')) return 'Backend';
    if (path.includes('database')) return 'Database';
    if (path.includes('auth')) return 'Authentication';
    if (path.includes('regression')) return 'Regression';
    
    // Content-based detection
    if (content.includes('render(') && content.includes('screen.')) return 'Frontend/Component';
    if (content.includes('request(app)')) return 'API Integration';
    if (content.includes('pool.query') || content.includes('supabase')) return 'Database';
    
    return 'General';
  }

  detectLocation(filePath) {
    if (filePath.includes('backend/tests')) return 'Backend Tests';
    if (filePath.includes('tests/frontend')) return 'Frontend Tests';
    if (filePath.includes('tests/e2e')) return 'E2E Tests';
    if (filePath.includes('tests/integration')) return 'Integration Tests';
    if (filePath.includes('tests/api')) return 'API Tests';
    if (filePath.includes('tests/performance')) return 'Performance Tests';
    if (filePath.includes('tests/security')) return 'Security Tests';
    if (filePath.includes('archive')) return 'Archived Tests';
    return 'Root Tests';
  }

  extractTestSuites(content) {
    const suites = [];
    const describeRegex = /describe\s*\(\s*['"`]([^'"`]+)['"`]/g;
    let match;
    
    while ((match = describeRegex.exec(content)) !== null) {
      suites.push(match[1]);
    }
    
    return suites;
  }

  countTestCases(content) {
    const testRegex = /(test|it)\s*\(\s*['"`]([^'"`]+)['"`]/g;
    const matches = content.match(testRegex);
    return matches ? matches.length : 0;
  }

  detectStatus(content) {
    if (content.includes('.skip') || content.includes('xdescribe') || content.includes('xit')) {
      return 'Skipped';
    }
    if (content.includes('TODO') || content.includes('FIXME')) {
      return 'Incomplete';
    }
    return 'Active';
  }

  detectCoverage(filePath, content) {
    const coverage = [];
    
    // Extract what components/services are being tested
    const importRegex = /(?:require|import).*['"`]([^'"`]+)['"`]/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      if (importPath.includes('../') && !importPath.includes('node_modules')) {
        coverage.push(importPath);
      }
    }
    
    return coverage;
  }

  extractDependencies(content) {
    const deps = new Set();
    
    if (content.includes('@playwright/test')) deps.add('@playwright/test');
    if (content.includes('@testing-library')) deps.add('@testing-library/react');
    if (content.includes('supertest')) deps.add('supertest');
    if (content.includes('axios')) deps.add('axios');
    if (content.includes('jest')) deps.add('jest');
    
    return Array.from(deps);
  }

  updateSummary(analysis) {
    this.inventory.summary.totalTestFiles++;
    this.inventory.summary.totalTestSuites += analysis.suites.length;
    this.inventory.summary.totalTestCases += analysis.totalTests;
    this.inventory.summary.frameworks.add(analysis.framework);
    this.inventory.summary.categories.add(analysis.category);

    // Group by framework
    if (!this.inventory.byFramework[analysis.framework]) {
      this.inventory.byFramework[analysis.framework] = [];
    }
    this.inventory.byFramework[analysis.framework].push(analysis);

    // Group by category
    if (!this.inventory.byCategory[analysis.category]) {
      this.inventory.byCategory[analysis.category] = [];
    }
    this.inventory.byCategory[analysis.category].push(analysis);

    // Group by location
    if (!this.inventory.byLocation[analysis.location]) {
      this.inventory.byLocation[analysis.location] = [];
    }
    this.inventory.byLocation[analysis.location].push(analysis);
  }

  async generateInventoryReport() {
    console.log('📊 TEST SUITE INVENTORY SUMMARY');
    console.log('='.repeat(40));
    console.log(`📁 Total Test Files: ${this.inventory.summary.totalTestFiles}`);
    console.log(`📋 Total Test Suites: ${this.inventory.summary.totalTestSuites}`);
    console.log(`🧪 Total Test Cases: ${this.inventory.summary.totalTestCases}`);
    console.log(`🔧 Frameworks Used: ${Array.from(this.inventory.summary.frameworks).join(', ')}`);
    console.log(`📂 Categories: ${Array.from(this.inventory.summary.categories).join(', ')}\n`);

    // Framework breakdown
    console.log('🔧 BY FRAMEWORK');
    console.log('-'.repeat(20));
    Object.entries(this.inventory.byFramework).forEach(([framework, files]) => {
      const totalTests = files.reduce((sum, file) => sum + file.totalTests, 0);
      console.log(`${framework}: ${files.length} files, ${totalTests} tests`);
    });

    // Category breakdown
    console.log('\n📂 BY CATEGORY');
    console.log('-'.repeat(20));
    Object.entries(this.inventory.byCategory).forEach(([category, files]) => {
      const totalTests = files.reduce((sum, file) => sum + file.totalTests, 0);
      console.log(`${category}: ${files.length} files, ${totalTests} tests`);
    });

    // Location breakdown
    console.log('\n📍 BY LOCATION');
    console.log('-'.repeat(20));
    Object.entries(this.inventory.byLocation).forEach(([location, files]) => {
      const totalTests = files.reduce((sum, file) => sum + file.totalTests, 0);
      console.log(`${location}: ${files.length} files, ${totalTests} tests`);
    });

    // Detailed file listing
    console.log('\n📋 DETAILED TEST FILE INVENTORY');
    console.log('='.repeat(60));
    
    this.inventory.testFiles
      .sort((a, b) => a.path.localeCompare(b.path))
      .forEach(file => {
        console.log(`\n📄 ${file.path}`);
        console.log(`   Framework: ${file.framework}`);
        console.log(`   Category: ${file.category}`);
        console.log(`   Test Suites: ${file.suites.length} (${file.suites.join(', ')})`);
        console.log(`   Test Cases: ${file.totalTests}`);
        console.log(`   Status: ${file.status}`);
        console.log(`   Size: ${Math.round(file.size / 1024)}KB`);
        if (file.dependencies.length > 0) {
          console.log(`   Dependencies: ${file.dependencies.join(', ')}`);
        }
      });

    // Save detailed report to file
    await this.saveDetailedReport();
  }

  async saveDetailedReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        ...this.inventory.summary,
        frameworks: Array.from(this.inventory.summary.frameworks),
        categories: Array.from(this.inventory.summary.categories)
      },
      byFramework: this.inventory.byFramework,
      byCategory: this.inventory.byCategory,
      byLocation: this.inventory.byLocation,
      testFiles: this.inventory.testFiles
    };

    fs.writeFileSync('TEST_INVENTORY_REPORT.json', JSON.stringify(report, null, 2));
    console.log('\n💾 Detailed report saved to TEST_INVENTORY_REPORT.json');
  }
}

// Run the analysis
async function main() {
  const analyzer = new TestInventoryAnalyzer();
  await analyzer.analyzeTestSuite();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { TestInventoryAnalyzer };
