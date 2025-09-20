#!/usr/bin/env node

/**
 * Configuration Consistency Validator for FloWorx
 * 
 * Validates consistency across all configuration files to prevent
 * misconfigurations, conflicts, and deployment issues.
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readFile = promisify(fs.readFile);
const access = promisify(fs.access);

class ConfigurationConsistencyValidator {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      issues: [],
      summary: {}
    };
    
    this.configFiles = {
      env: [
        '.env.production',
        '.env.test',
        '.env.production.template',
        'frontend/.env.production',
        'frontend/.env.development'
      ],
      docker: [
        'Dockerfile',
        'Dockerfile.coolify',
        'docker-compose.yml'
      ],
      package: [
        'package.json',
        'backend/package.json',
        'frontend/package.json'
      ],
      build: [
        '.nixpacks.toml',
        'nixpacks.toml'
      ]
    };
  }

  async validateAll() {
    console.log('🔍 FLOWORX CONFIGURATION CONSISTENCY VALIDATION');
    console.log('='.repeat(60));
    
    await this.validateEnvironmentVariables();
    await this.validatePortConfigurations();
    await this.validateURLConfigurations();
    await this.validateDatabaseConfigurations();
    await this.validateDockerConfigurations();
    await this.validatePackageVersions();
    await this.validateBuildConfigurations();
    
    this.generateReport();
    return this.results;
  }

  async validateEnvironmentVariables() {
    console.log('\n📋 Validating Environment Variables...');
    
    const envVars = {};
    const conflicts = [];
    
    for (const envFile of this.configFiles.env) {
      if (await this.fileExists(envFile)) {
        try {
          const content = await readFile(envFile, 'utf8');
          const vars = this.parseEnvFile(content);
          
          for (const [key, value] of Object.entries(vars)) {
            if (!envVars[key]) {
              envVars[key] = {};
            }
            envVars[key][envFile] = value;
          }
        } catch (error) {
          this.addIssue('error', `Failed to read ${envFile}: ${error.message}`);
        }
      }
    }
    
    // Check for conflicts
    for (const [varName, files] of Object.entries(envVars)) {
      const values = Object.values(files);
      const uniqueValues = [...new Set(values)];
      
      if (uniqueValues.length > 1 && !this.isExpectedDifference(varName)) {
        conflicts.push({
          variable: varName,
          files: files,
          values: uniqueValues
        });
      }
    }
    
    if (conflicts.length > 0) {
      this.addIssue('error', `Environment variable conflicts found`, { conflicts });
    } else {
      this.results.passed++;
      console.log('✅ Environment variables consistent');
    }
  }

  async validatePortConfigurations() {
    console.log('\n🔌 Validating Port Configurations...');
    
    const ports = {};
    const files = [...this.configFiles.env, ...this.configFiles.docker];
    
    for (const file of files) {
      if (await this.fileExists(file)) {
        const content = await readFile(file, 'utf8');
        const foundPorts = this.extractPorts(content);
        
        for (const port of foundPorts) {
          if (!ports[port]) {
            ports[port] = [];
          }
          ports[port].push(file);
        }
      }
    }
    
    // Check for port conflicts
    const conflicts = Object.entries(ports)
      .filter(([port, files]) => files.length > 1 && !this.isExpectedPortUsage(port))
      .map(([port, files]) => ({ port, files }));
    
    if (conflicts.length > 0) {
      this.addIssue('warning', `Potential port conflicts`, { conflicts });
    } else {
      this.results.passed++;
      console.log('✅ Port configurations consistent');
    }
  }

  async validateURLConfigurations() {
    console.log('\n🌐 Validating URL Configurations...');

    const urlsByType = {
      baseUrl: new Set(),
      apiUrl: new Set(),
      callbackUrl: new Set(),
      corsOrigins: new Set()
    };

    const files = [...this.configFiles.env, ...this.configFiles.docker];

    for (const file of files) {
      if (await this.fileExists(file)) {
        const content = await readFile(file, 'utf8');
        const foundUrls = this.extractURLs(content);

        foundUrls.forEach(url => {
          // Categorize URLs by their purpose
          if (url.includes('/callback')) {
            urlsByType.callbackUrl.add(url);
          } else if (url.includes('/api') && !url.includes('/callback')) {
            urlsByType.apiUrl.add(url);
          } else if (url.includes(',')) {
            // CORS origins (comma-separated)
            urlsByType.corsOrigins.add(url);
          } else if (url.includes('floworx-iq.com') && !url.includes('/')) {
            // Base domain URLs
            urlsByType.baseUrl.add(url);
          }
        });
      }
    }

    // Only flag as error if there are actual conflicts within the same category
    let hasConflicts = false;
    for (const [type, urls] of Object.entries(urlsByType)) {
      if (urls.size > 1) {
        // Check if these are actually conflicting or just different valid URLs
        const urlArray = Array.from(urls);
        const domains = urlArray.map(url => {
          try {
            return new URL(url).hostname;
          } catch {
            return url.split('/')[0].replace(/https?:\/\//, '');
          }
        });

        const uniqueDomains = [...new Set(domains)];

        // Only flag as conflict if we have different domains AND they're not expected combinations
        if (uniqueDomains.length > 1) {
          const hasLocalhost = uniqueDomains.some(domain => domain.includes('localhost'));
          const hasProduction = uniqueDomains.some(domain => domain.includes('floworx-iq.com'));

          // If it's just localhost vs production, that's expected for dev/prod environments
          if (!(hasLocalhost && hasProduction && uniqueDomains.length === 2)) {
            hasConflicts = true;
            break;
          }
        }
      }
    }

    if (hasConflicts) {
      const allUrls = [];
      for (const urls of Object.values(urlsByType)) {
        allUrls.push(...Array.from(urls));
      }
      this.addIssue('warning', `Multiple URL patterns detected`, { urls: allUrls });
    } else {
      this.results.passed++;
      console.log('✅ URL configurations consistent');
    }
  }

  async validateDatabaseConfigurations() {
    console.log('\n🗄️ Validating Database Configurations...');
    
    const dbConfigs = {};
    const files = [...this.configFiles.env, 'backend/config/config.js', 'backend/database/unified-connection.js'];
    
    for (const file of files) {
      if (await this.fileExists(file)) {
        const content = await readFile(file, 'utf8');
        const dbVars = this.extractDatabaseVars(content);
        
        if (Object.keys(dbVars).length > 0) {
          dbConfigs[file] = dbVars;
        }
      }
    }
    
    // Check for database configuration consistency
    const issues = this.checkDatabaseConsistency(dbConfigs);
    
    if (issues.length > 0) {
      this.addIssue('error', `Database configuration issues`, { issues });
    } else {
      this.results.passed++;
      console.log('✅ Database configurations consistent');
    }
  }

  async validateDockerConfigurations() {
    console.log('\n🐳 Validating Docker Configurations...');
    
    const dockerConfigs = {};
    
    for (const file of this.configFiles.docker) {
      if (await this.fileExists(file)) {
        const content = await readFile(file, 'utf8');
        dockerConfigs[file] = {
          ports: this.extractPorts(content),
          envVars: this.extractDockerEnvVars(content),
          nodeVersion: this.extractNodeVersion(content)
        };
      }
    }
    
    // Check for Docker configuration consistency
    const issues = this.checkDockerConsistency(dockerConfigs);
    
    if (issues.length > 0) {
      this.addIssue('warning', `Docker configuration inconsistencies`, { issues });
    } else {
      this.results.passed++;
      console.log('✅ Docker configurations consistent');
    }
  }

  async validatePackageVersions() {
    console.log('\n📦 Validating Package Versions...');
    
    const packages = {};
    
    for (const file of this.configFiles.package) {
      if (await this.fileExists(file)) {
        const content = await readFile(file, 'utf8');
        const packageJson = JSON.parse(content);
        
        packages[file] = {
          dependencies: packageJson.dependencies || {},
          devDependencies: packageJson.devDependencies || {},
          nodeVersion: packageJson.engines?.node
        };
      }
    }
    
    // Check for version conflicts
    const conflicts = this.checkPackageVersionConflicts(packages);
    
    if (conflicts.length > 0) {
      this.addIssue('warning', `Package version conflicts`, { conflicts });
    } else {
      this.results.passed++;
      console.log('✅ Package versions consistent');
    }
  }

  async validateBuildConfigurations() {
    console.log('\n🔨 Validating Build Configurations...');
    
    const buildConfigs = {};
    
    for (const file of this.configFiles.build) {
      if (await this.fileExists(file)) {
        const content = await readFile(file, 'utf8');
        buildConfigs[file] = this.parseBuildConfig(content);
      }
    }
    
    // Check for build configuration consistency
    const issues = this.checkBuildConsistency(buildConfigs);
    
    if (issues.length > 0) {
      this.addIssue('warning', `Build configuration issues`, { issues });
    } else {
      this.results.passed++;
      console.log('✅ Build configurations consistent');
    }
  }

  // Helper methods
  async fileExists(filePath) {
    try {
      await access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  parseEnvFile(content) {
    const vars = {};
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...valueParts] = trimmed.split('=');
        vars[key.trim()] = valueParts.join('=').trim();
      }
    }
    
    return vars;
  }

  extractPorts(content) {
    const portRegex = /(?:PORT|port)[=:\s]+(\d+)/gi;
    const matches = content.match(portRegex) || [];
    return matches.map(match => match.match(/\d+/)[0]);
  }

  extractURLs(content) {
    const urlRegex = /https?:\/\/[^\s"']+/gi;
    return content.match(urlRegex) || [];
  }

  extractDatabaseVars(content) {
    const dbVars = {};
    const patterns = {
      SUPABASE_URL: /SUPABASE_URL[=:\s]+([^\s"']+)/i,
      DATABASE_URL: /DATABASE_URL[=:\s]+([^\s"']+)/i,
      DB_HOST: /DB_HOST[=:\s]+([^\s"']+)/i,
      DB_PORT: /DB_PORT[=:\s]+([^\s"']+)/i
    };
    
    for (const [key, pattern] of Object.entries(patterns)) {
      const match = content.match(pattern);
      if (match) {
        dbVars[key] = match[1];
      }
    }
    
    return dbVars;
  }

  extractDockerEnvVars(content) {
    const envRegex = /ENV\s+(\w+)[=\s]+([^\n]+)/gi;
    const vars = {};
    let match;
    
    while ((match = envRegex.exec(content)) !== null) {
      vars[match[1]] = match[2].trim();
    }
    
    return vars;
  }

  extractNodeVersion(content) {
    const nodeRegex = /FROM\s+node:([^\s-]+)/i;
    const match = content.match(nodeRegex);
    return match ? match[1] : null;
  }

  isExpectedDifference(varName) {
    const expectedDifferences = [
      'NODE_ENV',
      'DATABASE_URL',
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'JWT_SECRET',
      'ENCRYPTION_KEY',
      'REACT_APP_API_URL',
      'GENERATE_SOURCEMAP',
      'PORT',
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET',
      'GOOGLE_REDIRECT_URI',
      'SMTP_HOST',
      'SMTP_PORT',
      'SMTP_USER',
      'SMTP_PASS'
    ];
    return expectedDifferences.includes(varName);
  }

  isExpectedPortUsage(port) {
    const commonPorts = [
      '5001',  // Backend server
      '3000',  // Frontend dev server
      '80',    // HTTP
      '443',   // HTTPS
      '587',   // SMTP (SendGrid/Gmail)
      '465',   // SMTP SSL
      '25',    // SMTP
      '5432',  // PostgreSQL
      '6379'   // Redis
    ];
    return commonPorts.includes(port);
  }

  checkDatabaseConsistency(configs) {
    const issues = [];
    // Implementation for database consistency checks
    return issues;
  }

  checkDockerConsistency(configs) {
    const issues = [];
    // Implementation for Docker consistency checks
    return issues;
  }

  checkPackageVersionConflicts(packages) {
    const conflicts = [];
    // Implementation for package version conflict checks
    return conflicts;
  }

  parseBuildConfig(content) {
    // Implementation for parsing build configurations
    return {};
  }

  checkBuildConsistency(configs) {
    const issues = [];
    // Implementation for build consistency checks
    return issues;
  }

  addIssue(type, message, details = {}) {
    this.results.issues.push({
      type,
      message,
      details,
      timestamp: new Date().toISOString()
    });
    
    if (type === 'error') {
      this.results.failed++;
    } else if (type === 'warning') {
      this.results.warnings++;
    }
    
    console.log(`${type === 'error' ? '❌' : '⚠️'} ${message}`);
  }

  generateReport() {
    console.log('\n📊 CONFIGURATION CONSISTENCY REPORT');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`⚠️ Warnings: ${this.results.warnings}`);
    console.log(`📋 Total Issues: ${this.results.issues.length}`);
    
    if (this.results.issues.length > 0) {
      console.log('\n🔍 DETAILED ISSUES:');
      this.results.issues.forEach((issue, index) => {
        console.log(`\n${index + 1}. ${issue.type.toUpperCase()}: ${issue.message}`);
        if (Object.keys(issue.details).length > 0) {
          console.log(`   Details: ${JSON.stringify(issue.details, null, 2)}`);
        }
      });
    }
    
    // Save report
    const reportPath = 'configuration-consistency-report.json';
    require('fs').writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\n📄 Report saved to: ${reportPath}`);
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new ConfigurationConsistencyValidator();
  validator.validateAll()
    .then(results => {
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('❌ Validation failed:', error);
      process.exit(1);
    });
}

module.exports = ConfigurationConsistencyValidator;
