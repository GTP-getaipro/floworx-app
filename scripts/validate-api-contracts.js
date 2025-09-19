#!/usr/bin/env node

/**
 * API Contract Validator for FloWorx
 * 
 * Validates that frontend API calls match backend endpoint definitions
 * and ensures API contracts are consistent across the application.
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const glob = require('glob');

const readFile = promisify(fs.readFile);
const globAsync = promisify(glob);

class APIContractValidator {
  constructor() {
    this.results = {
      missingEndpoints: [],
      orphanedEndpoints: [],
      contractMismatches: [],
      methodConflicts: [],
      parameterMismatches: [],
      responseFormatIssues: [],
      summary: {
        totalEndpoints: 0,
        totalApiCalls: 0,
        totalIssues: 0,
        criticalIssues: 0,
        warningIssues: 0
      }
    };
    
    this.backendEndpoints = new Map();
    this.frontendApiCalls = new Map();
  }

  async validateAll() {
    console.log('🔍 FLOWORX API CONTRACT VALIDATION');
    console.log('='.repeat(60));
    
    await this.scanBackendEndpoints();
    await this.scanFrontendApiCalls();
    await this.validateEndpointCoverage();
    await this.validateMethodConsistency();
    await this.validateParameterContracts();
    await this.validateResponseFormats();
    
    this.generateReport();
    return this.results;
  }

  async scanBackendEndpoints() {
    console.log('\n🔍 Scanning Backend Endpoints...');
    
    const routeFiles = await globAsync('backend/routes/**/*.js', {
      ignore: ['node_modules/**']
    });
    
    for (const file of routeFiles) {
      try {
        const content = await readFile(file, 'utf8');
        const endpoints = this.extractBackendEndpoints(content, file);
        
        endpoints.forEach(endpoint => {
          const key = `${endpoint.method}:${endpoint.path}`;
          this.backendEndpoints.set(key, endpoint);
        });
      } catch (error) {
        console.warn(`⚠️ Could not scan ${file}: ${error.message}`);
      }
    }
    
    console.log(`Found ${this.backendEndpoints.size} backend endpoints`);
    this.results.summary.totalEndpoints = this.backendEndpoints.size;
  }

  async scanFrontendApiCalls() {
    console.log('\n🔍 Scanning Frontend API Calls...');
    
    const frontendFiles = await globAsync('frontend/src/**/*.{js,jsx}', {
      ignore: ['node_modules/**', 'build/**']
    });
    
    for (const file of frontendFiles) {
      try {
        const content = await readFile(file, 'utf8');
        const apiCalls = this.extractFrontendApiCalls(content, file);
        
        apiCalls.forEach(apiCall => {
          const key = `${apiCall.method}:${apiCall.path}`;
          
          if (!this.frontendApiCalls.has(key)) {
            this.frontendApiCalls.set(key, []);
          }
          
          this.frontendApiCalls.get(key).push(apiCall);
        });
      } catch (error) {
        console.warn(`⚠️ Could not scan ${file}: ${error.message}`);
      }
    }
    
    const totalCalls = Array.from(this.frontendApiCalls.values()).reduce((sum, calls) => sum + calls.length, 0);
    console.log(`Found ${totalCalls} frontend API calls`);
    this.results.summary.totalApiCalls = totalCalls;
  }

  async validateEndpointCoverage() {
    console.log('\n✅ Validating Endpoint Coverage...');
    
    // Find frontend calls without backend endpoints
    for (const [key, calls] of this.frontendApiCalls.entries()) {
      if (!this.backendEndpoints.has(key)) {
        const [method, path] = key.split(':');
        this.results.missingEndpoints.push({
          method,
          path,
          calls,
          severity: 'critical'
        });
      }
    }
    
    // Find backend endpoints without frontend calls
    for (const [key, endpoint] of this.backendEndpoints.entries()) {
      if (!this.frontendApiCalls.has(key) && !this.isInternalEndpoint(endpoint.path)) {
        this.results.orphanedEndpoints.push({
          ...endpoint,
          severity: 'warning'
        });
      }
    }
    
    console.log(`Missing endpoints: ${this.results.missingEndpoints.length}`);
    console.log(`Orphaned endpoints: ${this.results.orphanedEndpoints.length}`);
  }

  async validateMethodConsistency() {
    console.log('\n🔄 Validating HTTP Method Consistency...');
    
    const pathGroups = new Map();
    
    // Group endpoints by path
    for (const [key, endpoint] of this.backendEndpoints.entries()) {
      const path = endpoint.path;
      
      if (!pathGroups.has(path)) {
        pathGroups.set(path, {
          backend: [],
          frontend: []
        });
      }
      
      pathGroups.get(path).backend.push(endpoint);
    }
    
    // Add frontend calls to groups
    for (const [key, calls] of this.frontendApiCalls.entries()) {
      const [method, path] = key.split(':');
      
      if (pathGroups.has(path)) {
        pathGroups.get(path).frontend.push(...calls);
      }
    }
    
    // Check for method conflicts
    for (const [path, group] of pathGroups.entries()) {
      const backendMethods = new Set(group.backend.map(e => e.method));
      const frontendMethods = new Set(group.frontend.map(c => c.method));
      
      // Find methods used in frontend but not supported by backend
      for (const method of frontendMethods) {
        if (!backendMethods.has(method)) {
          this.results.methodConflicts.push({
            path,
            method,
            issue: 'Frontend uses method not supported by backend',
            severity: 'critical'
          });
        }
      }
    }
    
    console.log(`Method conflicts: ${this.results.methodConflicts.length}`);
  }

  async validateParameterContracts() {
    console.log('\n📋 Validating Parameter Contracts...');
    
    for (const [key, calls] of this.frontendApiCalls.entries()) {
      const endpoint = this.backendEndpoints.get(key);
      
      if (endpoint) {
        for (const call of calls) {
          const issues = this.compareParameters(endpoint, call);
          
          issues.forEach(issue => {
            this.results.parameterMismatches.push({
              endpoint: key,
              file: call.file,
              line: call.line,
              issue,
              severity: issue.includes('required') ? 'critical' : 'warning'
            });
          });
        }
      }
    }
    
    console.log(`Parameter mismatches: ${this.results.parameterMismatches.length}`);
  }

  async validateResponseFormats() {
    console.log('\n📤 Validating Response Formats...');
    
    for (const [key, calls] of this.frontendApiCalls.entries()) {
      const endpoint = this.backendEndpoints.get(key);
      
      if (endpoint) {
        for (const call of calls) {
          const issues = this.compareResponseFormats(endpoint, call);
          
          issues.forEach(issue => {
            this.results.responseFormatIssues.push({
              endpoint: key,
              file: call.file,
              line: call.line,
              issue,
              severity: 'warning'
            });
          });
        }
      }
    }
    
    console.log(`Response format issues: ${this.results.responseFormatIssues.length}`);
  }

  // Extraction methods
  extractBackendEndpoints(content, file) {
    const endpoints = [];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      // Express route definitions
      const routeMatch = line.match(/router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/);
      if (routeMatch) {
        const method = routeMatch[1].toUpperCase();
        const path = this.normalizePath(routeMatch[2]);
        
        endpoints.push({
          method,
          path,
          file,
          line: index + 1,
          handler: this.extractHandler(line),
          middleware: this.extractMiddleware(line),
          parameters: this.extractRouteParameters(path, content, index),
          responses: this.extractResponseFormats(content, index)
        });
      }
    });
    
    return endpoints;
  }

  extractFrontendApiCalls(content, file) {
    const apiCalls = [];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      // Fetch calls
      const fetchMatch = line.match(/fetch\s*\(\s*['"`]([^'"`]+)['"`]\s*,?\s*({[^}]*})?/);
      if (fetchMatch) {
        const url = fetchMatch[1];
        const options = fetchMatch[2];
        const method = this.extractMethodFromOptions(options) || 'GET';
        const path = this.extractPathFromUrl(url);
        
        if (path) {
          apiCalls.push({
            method,
            path: this.normalizePath(path),
            file,
            line: index + 1,
            url,
            options,
            parameters: this.extractCallParameters(options),
            expectedResponse: this.extractExpectedResponse(content, index)
          });
        }
      }
      
      // Axios calls
      const axiosMatch = line.match(/(axios|api)\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/);
      if (axiosMatch) {
        const method = axiosMatch[2].toUpperCase();
        const path = this.normalizePath(axiosMatch[3]);
        
        apiCalls.push({
          method,
          path,
          file,
          line: index + 1,
          library: axiosMatch[1],
          parameters: this.extractAxiosParameters(content, index),
          expectedResponse: this.extractExpectedResponse(content, index)
        });
      }
    });
    
    return apiCalls;
  }

  // Helper methods
  normalizePath(path) {
    // Remove query parameters and normalize path
    return path.split('?')[0].replace(/\/+/g, '/').replace(/\/$/, '') || '/';
  }

  extractMethodFromOptions(options) {
    if (!options) return null;
    
    const methodMatch = options.match(/method\s*:\s*['"`](\w+)['"`]/i);
    return methodMatch ? methodMatch[1].toUpperCase() : null;
  }

  extractPathFromUrl(url) {
    // Extract path from full URL or relative path
    if (url.startsWith('http')) {
      try {
        return new URL(url).pathname;
      } catch {
        return null;
      }
    } else if (url.startsWith('/')) {
      return url;
    } else {
      return '/' + url;
    }
  }

  extractHandler(line) {
    const handlerMatch = line.match(/,\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\)/);
    return handlerMatch ? handlerMatch[1] : null;
  }

  extractMiddleware(line) {
    const middleware = [];
    const middlewareMatch = line.match(/router\.\w+\([^,]+,\s*([^,)]+(?:,\s*[^,)]+)*)/);
    
    if (middlewareMatch) {
      const parts = middlewareMatch[1].split(',');
      parts.slice(0, -1).forEach(part => {
        const trimmed = part.trim();
        if (trimmed && !trimmed.includes('(')) {
          middleware.push(trimmed);
        }
      });
    }
    
    return middleware;
  }

  extractRouteParameters(path, content, lineIndex) {
    const parameters = {
      path: [],
      query: [],
      body: []
    };
    
    // Extract path parameters
    const pathParams = path.match(/:(\w+)/g);
    if (pathParams) {
      parameters.path = pathParams.map(param => param.substring(1));
    }
    
    // Look for parameter validation in surrounding lines
    const contextLines = content.split('\n').slice(Math.max(0, lineIndex - 5), lineIndex + 10);
    
    contextLines.forEach(line => {
      // Look for req.body, req.query, req.params usage
      const bodyMatch = line.match(/req\.body\.(\w+)/g);
      if (bodyMatch) {
        bodyMatch.forEach(match => {
          const param = match.replace('req.body.', '');
          if (!parameters.body.includes(param)) {
            parameters.body.push(param);
          }
        });
      }
      
      const queryMatch = line.match(/req\.query\.(\w+)/g);
      if (queryMatch) {
        queryMatch.forEach(match => {
          const param = match.replace('req.query.', '');
          if (!parameters.query.includes(param)) {
            parameters.query.push(param);
          }
        });
      }
    });
    
    return parameters;
  }

  extractResponseFormats(content, lineIndex) {
    const responses = [];
    const contextLines = content.split('\n').slice(lineIndex, lineIndex + 20);
    
    contextLines.forEach(line => {
      // Look for res.json, res.send, res.status patterns
      const responseMatch = line.match(/res\.(json|send|status)\s*\(([^)]+)\)/);
      if (responseMatch) {
        responses.push({
          type: responseMatch[1],
          content: responseMatch[2].trim()
        });
      }
    });
    
    return responses;
  }

  extractCallParameters(options) {
    const parameters = {
      body: [],
      headers: []
    };
    
    if (!options) return parameters;
    
    // Extract body parameters
    const bodyMatch = options.match(/body\s*:\s*JSON\.stringify\s*\(\s*{([^}]+)}\s*\)/);
    if (bodyMatch) {
      const bodyContent = bodyMatch[1];
      const params = bodyContent.split(',').map(param => {
        const [key] = param.split(':');
        return key.trim();
      });
      parameters.body = params;
    }
    
    return parameters;
  }

  extractAxiosParameters(content, lineIndex) {
    const parameters = {
      body: [],
      config: []
    };
    
    // Look for parameters in surrounding lines
    const contextLines = content.split('\n').slice(lineIndex, lineIndex + 5);
    
    contextLines.forEach(line => {
      // Look for data object
      const dataMatch = line.match(/{\s*([^}]+)\s*}/);
      if (dataMatch) {
        const params = dataMatch[1].split(',').map(param => {
          const [key] = param.split(':');
          return key.trim();
        });
        parameters.body.push(...params);
      }
    });
    
    return parameters;
  }

  extractExpectedResponse(content, lineIndex) {
    const contextLines = content.split('\n').slice(lineIndex, lineIndex + 10);
    
    for (const line of contextLines) {
      // Look for .then() or await patterns that suggest expected response structure
      const thenMatch = line.match(/\.then\s*\(\s*([^)]+)\s*=>/);
      if (thenMatch) {
        return { type: 'promise', handler: thenMatch[1] };
      }
      
      const awaitMatch = line.match(/const\s+(\w+)\s*=\s*await/);
      if (awaitMatch) {
        return { type: 'await', variable: awaitMatch[1] };
      }
    }
    
    return null;
  }

  compareParameters(endpoint, call) {
    const issues = [];
    
    // Compare body parameters
    const endpointBodyParams = endpoint.parameters.body || [];
    const callBodyParams = call.parameters.body || [];
    
    // Check for missing required parameters
    endpointBodyParams.forEach(param => {
      if (!callBodyParams.includes(param)) {
        issues.push(`Missing required body parameter: ${param}`);
      }
    });
    
    // Check for extra parameters
    callBodyParams.forEach(param => {
      if (!endpointBodyParams.includes(param)) {
        issues.push(`Unexpected body parameter: ${param}`);
      }
    });
    
    return issues;
  }

  compareResponseFormats(endpoint, call) {
    const issues = [];
    
    // This is a simplified comparison - in practice, you'd want more sophisticated analysis
    const endpointResponses = endpoint.responses || [];
    const callExpectedResponse = call.expectedResponse;
    
    if (endpointResponses.length > 0 && !callExpectedResponse) {
      issues.push('Frontend does not handle response format');
    }
    
    return issues;
  }

  isInternalEndpoint(path) {
    const internalPaths = ['/health', '/metrics', '/admin', '/internal'];
    return internalPaths.some(internal => path.startsWith(internal));
  }

  generateReport() {
    const allIssues = [
      ...this.results.missingEndpoints,
      ...this.results.orphanedEndpoints,
      ...this.results.contractMismatches,
      ...this.results.methodConflicts,
      ...this.results.parameterMismatches,
      ...this.results.responseFormatIssues
    ];
    
    this.results.summary.totalIssues = allIssues.length;
    this.results.summary.criticalIssues = allIssues.filter(i => i.severity === 'critical').length;
    this.results.summary.warningIssues = allIssues.filter(i => i.severity === 'warning').length;
    
    console.log('\n📊 API CONTRACT VALIDATION REPORT');
    console.log('='.repeat(60));
    console.log(`🔍 Backend Endpoints: ${this.results.summary.totalEndpoints}`);
    console.log(`📱 Frontend API Calls: ${this.results.summary.totalApiCalls}`);
    console.log(`❌ Missing Endpoints: ${this.results.missingEndpoints.length}`);
    console.log(`🔄 Orphaned Endpoints: ${this.results.orphanedEndpoints.length}`);
    console.log(`⚠️ Method Conflicts: ${this.results.methodConflicts.length}`);
    console.log(`📋 Parameter Mismatches: ${this.results.parameterMismatches.length}`);
    console.log(`📤 Response Format Issues: ${this.results.responseFormatIssues.length}`);
    console.log(`\n🚨 Critical Issues: ${this.results.summary.criticalIssues}`);
    console.log(`⚠️ Warning Issues: ${this.results.summary.warningIssues}`);
    console.log(`📋 Total Issues: ${this.results.summary.totalIssues}`);
    
    // Save detailed report
    const reportPath = 'api-contract-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new APIContractValidator();
  validator.validateAll()
    .then(results => {
      process.exit(results.summary.criticalIssues > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('❌ Validation failed:', error);
      process.exit(1);
    });
}

module.exports = APIContractValidator;
