/**
 * Root ESLint Configuration for FloWorx SaaS
 * Comprehensive linting rules for backend, frontend, and shared code
 */

module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
    jest: true
  },
  extends: [
    'eslint:recommended'
    // 'prettier' // Temporarily disabled for deployment
  ],
  plugins: [
    'import',
    'unused-imports'
    // 'prettier' // Temporarily disabled for deployment
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  rules: {
    // Error prevention
    'no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_'
      }
    ],
    'no-undef': 'error',
    'no-use-before-define': [
      'error',
      {
        functions: false,
        classes: true,
        variables: true,
        allowNamedExports: false
      }
    ],

    // Code quality
    'prefer-const': 'error',
    'no-var': 'error',
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'all'],
    'no-console': 'warn',
    'no-debugger': 'error',
    'no-alert': 'error',

    // Import/Export rules
    'import/order': [
      'error',
      {
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index'
        ],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true
        }
      }
    ],
    'import/no-unused-modules': 'warn',
    'import/no-duplicates': 'error',
    'import/newline-after-import': 'error',

    // Basic security
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',

    // Async/await
    'require-await': 'error',
    'no-return-await': 'error',
    'prefer-promise-reject-errors': 'error',

    // Best practices
    'no-implicit-coercion': 'error',
    'no-implicit-globals': 'error',
    'no-new-wrappers': 'error',
    'no-throw-literal': 'error',
    'radix': 'error',

    // Code audit rules
    'no-restricted-imports': ['error', {
      patterns: ['**/__deprecated__/*']
    }],
    'unused-imports/no-unused-imports': 'warn',
    'unused-imports/no-unused-vars': [
      'warn',
      {
        args: 'after-used',
        argsIgnorePattern: '^_'
      }
    ],

    // Prettier integration - disabled for deployment
    // 'prettier/prettier': 'error'
  },
  overrides: [
    // Backend-specific rules
    {
      files: ['backend/**/*.js', 'api/**/*.js', 'scripts/**/*.js'],
      env: {
        node: true,
        commonjs: true
      },
      parserOptions: {
        sourceType: 'commonjs'
      },
      rules: {
        'no-console': 'off', // Allow console in backend
        'security/detect-child-process': 'off' // Allow child_process in scripts
      }
    },
    // Frontend files - let frontend/.eslintrc.js handle React rules
    {
      files: ['frontend/**/*.js', 'frontend/**/*.jsx'],
      env: {
        browser: true,
        es6: true
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        },
        sourceType: 'module'
      },
      rules: {
        'no-console': 'warn', // Warn about console in frontend

        // FloWorx Design System Enforcement - CRITICAL GUARDRAIL
        'no-restricted-imports': [
          'error',
          {
            'patterns': [
              {
                'group': ['@mui/*', '@material-ui/*'],
                'message': '❌ Material-UI is forbidden. Use FloWorx design system components from ./components/auth/ instead.'
              },
              {
                'group': ['bootstrap*', 'react-bootstrap*'],
                'message': '❌ Bootstrap is forbidden. Use Tailwind CSS classes and FloWorx design system components instead.'
              },
              {
                'group': ['antd*', '@ant-design/*'],
                'message': '❌ Ant Design is forbidden. Use FloWorx design system components instead.'
              },
              {
                'group': ['@chakra-ui/*'],
                'message': '❌ Chakra UI is forbidden. Use FloWorx design system components instead.'
              },
              {
                'group': ['semantic-ui-react*'],
                'message': '❌ Semantic UI is forbidden. Use FloWorx design system components instead.'
              },
              {
                'group': ['@mantine/*'],
                'message': '❌ Mantine is forbidden. Use FloWorx design system components instead.'
              }
            ]
          }
        ]
      }
    },
    // Test files
    {
      files: ['**/*.test.js', '**/*.spec.js', '**/tests/**/*.js'],
      env: {
        jest: true,
        node: true
      },
      rules: {
        'no-console': 'off',
        'security/detect-non-literal-fs-filename': 'off',
        'security/detect-child-process': 'off'
      }
    },
    // Configuration files
    {
      files: [
        '*.config.js',
        '*.config.mjs',
        '.eslintrc.js',
        'jest.config.js',
        'playwright.config.js',
        'tailwind.config.js',
        'postcss.config.js'
      ],
      env: {
        node: true
      },
      rules: {
        'no-console': 'off',
        'import/no-unused-modules': 'off'
      }
    }
  ],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    'coverage/',
    '*.min.js',
    'backend/backup-imports/',
    'playwright-report/',
    'test-results/',
    'test-reports/',
    '__deprecated__/**'
  ]
};
