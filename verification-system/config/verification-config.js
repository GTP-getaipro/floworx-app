const path = require('path');

/**
 * FloWorx Verification System Configuration
 * 
 * Customize verification behavior, thresholds, and rules
 */
module.exports = {
  // Project structure
  projectRoot: path.resolve(__dirname, '../..'),
  
  // Module configuration
  modules: {
    staticAnalyzer: {
      enabled: true,
      severity: 'high',
      excludePatterns: [
        'node_modules/**',
        '.git/**',
        'dist/**',
        'build/**',
        '*.min.js',
        '*.test.js',
        '*.spec.js'
      ],
      includePatterns: [
        '**/*.js',
        '**/*.jsx',
        '**/*.ts',
        '**/*.tsx'
      ]
    },
    
    integrationTester: {
      enabled: true,
      timeout: 30000,
      retries: 2,
      testScenarios: [
        'user_registration',
        'password_reset',
        'email_verification',
        'authentication',
        'api_health'
      ]
    },
    
    healthMonitor: {
      enabled: true,
      retries: 3,
      timeout: 10000,
      thresholds: {
        responseTime: 2000, // ms
        errorRate: 20, // percentage
        availability: 95 // percentage
      },
      monitoringInterval: 60000 // ms
    },
    
    autoResolver: {
      enabled: true,
      backupOriginals: true,
      safeMode: true, // Only apply safe fixes
      maxFixesPerFile: 10
    }
  },

  // Environment-specific endpoints
  endpoints: {
    api: process.env.NODE_ENV === 'production' 
      ? 'https://app.floworx-iq.com/api'
      : 'http://localhost:5001/api',
    frontend: process.env.NODE_ENV === 'production'
      ? 'https://app.floworx-iq.com'
      : 'http://localhost:3000',
    database: process.env.DATABASE_URL || 'postgresql://localhost:5432/floworx'
  },

  // Critical paths to analyze
  criticalPaths: [
    'backend/routes',
    'backend/services',
    'backend/database',
    'backend/middleware',
    'backend/utils',
    'frontend/src/pages',
    'frontend/src/components',
    'frontend/src/lib',
    'frontend/src/services',
    'frontend/src/hooks'
  ],

  // Known issue patterns to detect
  knownIssues: [
    {
      id: 'duplicate-method-signatures',
      pattern: /async\s+(\w+)\s*\([^)]*\)\s*{[\s\S]*?async\s+\1\s*\([^)]*\)/g,
      severity: 'critical',
      description: 'Duplicate method signatures detected',
      autoFix: true
    },
    {
      id: 'parameter-mismatch',
      pattern: /(\w+)\s*\([^)]*\)[\s\S]*?\1\s*\([^)]*\)/g,
      severity: 'high',
      description: 'Potential parameter mismatch between definition and usage',
      autoFix: false // Requires manual review
    },
    {
      id: 'hardcoded-credentials',
      pattern: /(?:password|secret|key|token)\s*[:=]\s*['"][^'"]{8,}['"]/gi,
      severity: 'critical',
      description: 'Potential hardcoded credentials detected',
      autoFix: false
    },
    {
      id: 'console-logs',
      pattern: /console\.(log|debug|info|warn|error)\s*\(/g,
      severity: 'low',
      description: 'Console statements found (should use proper logging)',
      autoFix: false
    },
    {
      id: 'todo-comments',
      pattern: /\/\/\s*TODO|\/\*\s*TODO|\#\s*TODO/gi,
      severity: 'low',
      description: 'TODO comments found',
      autoFix: false
    }
  ],

  // Email service specific checks
  emailServiceChecks: {
    testEmails: [
      'test.verification@example.com',
      'test.password.reset@example.com'
    ],
    expectedProviders: ['SendGrid', 'Mailgun', 'SES'],
    requiredTemplates: [
      'verification-email.html',
      'password-reset-email.html'
    ]
  },

  // Database checks
  databaseChecks: {
    requiredTables: [
      'users',
      'password_reset_tokens',
      'email_verification_tokens'
    ],
    connectionPoolSize: {
      min: 1,
      max: 20
    }
  },

  // Security checks
  securityChecks: {
    requiredHeaders: [
      'X-Content-Type-Options',
      'X-Frame-Options',
      'X-XSS-Protection'
    ],
    forbiddenPatterns: [
      /eval\s*\(/g,
      /innerHTML\s*=/g,
      /document\.write\s*\(/g
    ]
  },

  // Performance thresholds
  performanceThresholds: {
    apiResponseTime: 1000, // ms
    frontendLoadTime: 3000, // ms
    databaseQueryTime: 500, // ms
    bundleSize: 2048, // KB
    memoryUsage: 512 // MB
  },

  // Notification settings
  notifications: {
    enabled: false,
    webhook: process.env.VERIFICATION_WEBHOOK_URL,
    email: process.env.VERIFICATION_EMAIL,
    slack: process.env.VERIFICATION_SLACK_WEBHOOK,
    onlyOnFailure: true
  },

  // Report settings
  reports: {
    retention: 30, // days
    formats: ['console', 'json', 'html'],
    includeStackTraces: false,
    includeSourceCode: false
  },

  // CI/CD integration
  cicd: {
    failOnCritical: true,
    failOnHigh: false,
    failOnWarnings: false,
    generateArtifacts: true,
    uploadReports: false
  },

  // Custom rules (can be extended)
  customRules: [
    {
      name: 'floworx-naming-convention',
      pattern: /class\s+(\w+)/g,
      test: (match) => {
        const className = match[1];
        return /^[A-Z][a-zA-Z0-9]*$/.test(className);
      },
      message: 'Class names should use PascalCase',
      severity: 'medium'
    },
    {
      name: 'floworx-async-await',
      pattern: /\.then\s*\(/g,
      message: 'Prefer async/await over .then() for better readability',
      severity: 'low'
    }
  ],

  // Exclusions
  exclusions: {
    files: [
      'node_modules/**',
      '.git/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '*.min.js',
      '*.bundle.js'
    ],
    directories: [
      'node_modules',
      '.git',
      'dist',
      'build',
      'coverage',
      '.next',
      '.nuxt'
    ],
    patterns: [
      /test\.(js|jsx|ts|tsx)$/,
      /spec\.(js|jsx|ts|tsx)$/,
      /\.d\.ts$/,
      /\.config\.(js|ts)$/
    ]
  }
};
