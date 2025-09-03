/**
 * Root Prettier Configuration for FloWorx SaaS
 * Consistent code formatting across backend, frontend, and shared code
 */

module.exports = {
  // Basic formatting
  semi: true,
  trailingComma: 'es5',
  singleQuote: true,
  
  // Indentation
  tabWidth: 2,
  useTabs: false,
  
  // Line length
  printWidth: 100,
  
  // Spacing
  bracketSpacing: true,
  bracketSameLine: false,
  
  // Arrow functions
  arrowParens: 'avoid',
  
  // Quotes in objects
  quoteProps: 'as-needed',
  
  // JSX formatting
  jsxSingleQuote: true,
  jsxBracketSameLine: false,
  
  // End of line
  endOfLine: 'lf',
  
  // Embedded languages
  embeddedLanguageFormatting: 'auto',
  
  // HTML whitespace
  htmlWhitespaceSensitivity: 'css',
  
  // Prose wrap
  proseWrap: 'preserve',
  
  // File-specific overrides
  overrides: [
    // JSON files
    {
      files: ['*.json', '*.jsonc'],
      options: {
        printWidth: 80,
        tabWidth: 2,
        trailingComma: 'none'
      }
    },
    
    // Package.json files
    {
      files: ['package.json', 'package-lock.json'],
      options: {
        printWidth: 120,
        tabWidth: 2,
        trailingComma: 'none'
      }
    },
    
    // Markdown files
    {
      files: ['*.md', '*.mdx'],
      options: {
        printWidth: 80,
        proseWrap: 'always',
        tabWidth: 2,
        useTabs: false
      }
    },
    
    // YAML files
    {
      files: ['*.yml', '*.yaml'],
      options: {
        tabWidth: 2,
        singleQuote: false,
        bracketSpacing: true
      }
    },
    
    // CSS and styling files
    {
      files: ['*.css', '*.scss', '*.sass', '*.less'],
      options: {
        singleQuote: false,
        tabWidth: 2
      }
    },
    
    // JavaScript/TypeScript files
    {
      files: ['*.js', '*.jsx', '*.ts', '*.tsx'],
      options: {
        singleQuote: true,
        trailingComma: 'es5',
        bracketSpacing: true,
        arrowParens: 'avoid'
      }
    },
    
    // Configuration files
    {
      files: [
        '*.config.js',
        '*.config.mjs',
        '.eslintrc.js',
        '.prettierrc.js',
        'jest.config.js',
        'playwright.config.js',
        'tailwind.config.js',
        'postcss.config.js',
        'babel.config.js'
      ],
      options: {
        printWidth: 120,
        singleQuote: true,
        trailingComma: 'es5'
      }
    },
    
    // SQL files
    {
      files: ['*.sql'],
      options: {
        printWidth: 120,
        tabWidth: 2,
        useTabs: false
      }
    },
    
    // Shell scripts
    {
      files: ['*.sh', '*.bash'],
      options: {
        printWidth: 120,
        tabWidth: 2,
        useTabs: false
      }
    }
  ]
};
