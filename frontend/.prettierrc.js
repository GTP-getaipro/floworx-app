/**
 * Prettier Configuration for FloWorx Frontend
 * React and JSX-specific formatting rules
 */

module.exports = {
  // Inherit from root config but override for React/JSX
  ...require('../.prettierrc.js'),
  
  // JSX-specific overrides
  jsxSingleQuote: true,
  jsxBracketSameLine: false,
  
  // React-friendly settings
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: true,
  trailingComma: 'es5',
  bracketSpacing: true,
  arrowParens: 'avoid',
  
  // File-specific overrides for frontend
  overrides: [
    // JSX files
    {
      files: ['*.jsx'],
      options: {
        jsxSingleQuote: true,
        jsxBracketSameLine: false,
        printWidth: 100
      }
    },
    
    // CSS and styling files
    {
      files: ['*.css', '*.scss', '*.sass'],
      options: {
        singleQuote: false,
        tabWidth: 2
      }
    },
    
    // JSON files in frontend
    {
      files: ['*.json'],
      options: {
        printWidth: 80,
        tabWidth: 2,
        trailingComma: 'none'
      }
    },
    
    // Package.json
    {
      files: ['package.json'],
      options: {
        printWidth: 120,
        tabWidth: 2,
        trailingComma: 'none'
      }
    }
  ]
};
