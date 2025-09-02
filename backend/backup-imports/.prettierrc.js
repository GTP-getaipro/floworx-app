/**
 * Prettier Configuration for FloWorx Backend
 * Consistent code formatting across the entire codebase
 */

module.exports = {
  // Basic formatting
  semi: true,
  trailingComma: 'none',
  singleQuote: true,

  // Indentation
  tabWidth: 2,
  useTabs: false,

  // Line length
  printWidth: 120,

  // Spacing
  bracketSpacing: true,
  bracketSameLine: false,

  // Arrow functions
  arrowParens: 'avoid',

  // Quotes in objects
  quoteProps: 'as-needed',

  // JSX (if needed in future)
  jsxSingleQuote: true,

  // End of line
  endOfLine: 'lf',

  // Embedded languages
  embeddedLanguageFormatting: 'auto',

  // HTML whitespace
  htmlWhitespaceSensitivity: 'css',

  // Vue files (if needed in future)
  vueIndentScriptAndStyle: false,

  // Prose wrap
  proseWrap: 'preserve',

  // File-specific overrides
  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 80,
        tabWidth: 2
      }
    },
    {
      files: '*.md',
      options: {
        printWidth: 80,
        proseWrap: 'always',
        tabWidth: 2
      }
    },
    {
      files: '*.yml',
      options: {
        tabWidth: 2,
        singleQuote: false
      }
    },
    {
      files: '*.yaml',
      options: {
        tabWidth: 2,
        singleQuote: false
      }
    }
  ]
};
