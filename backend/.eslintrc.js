module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es2021: true,
    node: true,
    jest: true
  },
  extends: [
    'eslint:recommended',
    'plugin:security/recommended',
    'plugin:node/recommended',
    'plugin:prettier/recommended'
  ],
  plugins: [
    'security',
    'node',
    'prettier'
  ],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module'
  },
  rules: {
    // Code Style & Formatting
    'indent': ['error', 2, { 
      'SwitchCase': 1,
      'VariableDeclarator': 1,
      'outerIIFEBody': 1,
      'FunctionDeclaration': { 'parameters': 1, 'body': 1 },
      'FunctionExpression': { 'parameters': 1, 'body': 1 },
      'CallExpression': { 'arguments': 1 },
      'ArrayExpression': 1,
      'ObjectExpression': 1,
      'ImportDeclaration': 1,
      'flatTernaryExpressions': false,
      'ignoreComments': false
    }],
    'linebreak-style': ['error', 'unix'],
    'quotes': ['error', 'single', { 'avoidEscape': true, 'allowTemplateLiterals': true }],
    'semi': ['error', 'always'],
    'comma-dangle': ['error', 'never'],
    'comma-spacing': ['error', { 'before': false, 'after': true }],
    'comma-style': ['error', 'last'],
    'key-spacing': ['error', { 'beforeColon': false, 'afterColon': true }],
    'object-curly-spacing': ['error', 'always'],
    'array-bracket-spacing': ['error', 'never'],
    'space-before-blocks': ['error', 'always'],
    'space-before-function-paren': ['error', { 'anonymous': 'always', 'named': 'never', 'asyncArrow': 'always' }],
    'space-in-parens': ['error', 'never'],
    'space-infix-ops': 'error',
    'space-unary-ops': ['error', { 'words': true, 'nonwords': false }],
    'spaced-comment': ['error', 'always', { 'exceptions': ['-', '+'] }],
    'brace-style': ['error', '1tbs', { 'allowSingleLine': true }],
    'curly': ['error', 'all'],
    'eol-last': ['error', 'always'],
    'no-trailing-spaces': 'error',
    'no-multiple-empty-lines': ['error', { 'max': 2, 'maxEOF': 1 }],
    'max-len': ['error', { 
      'code': 120, 
      'tabWidth': 2, 
      'ignoreUrls': true, 
      'ignoreStrings': true, 
      'ignoreTemplateLiterals': true,
      'ignoreRegExpLiterals': true
    }],

    // Naming Conventions
    'camelcase': ['error', { 
      'properties': 'always',
      'ignoreDestructuring': false,
      'ignoreImports': false,
      'ignoreGlobals': false,
      'allow': ['^UNSAFE_', '^_', 'created_at', 'updated_at', 'user_id', 'business_type_id', 'email_verified']
    }],
    'new-cap': ['error', { 
      'newIsCap': true, 
      'capIsNew': false,
      'properties': true
    }],
    'no-underscore-dangle': ['error', { 
      'allow': ['_id', '__dirname', '__filename', '_error', '_next', '_req', '_res'],
      'allowAfterThis': false,
      'allowAfterSuper': false,
      'enforceInMethodNames': true
    }],

    // Variables & Functions
    'no-unused-vars': ['error', { 
      'vars': 'all',
      'args': 'after-used',
      'ignoreRestSiblings': true,
      'argsIgnorePattern': '^_',
      'varsIgnorePattern': '^_',
      'caughtErrorsIgnorePattern': '^_'
    }],
    'no-var': 'error',
    'prefer-const': ['error', { 'destructuring': 'any', 'ignoreReadBeforeAssign': true }],
    'prefer-arrow-callback': ['error', { 'allowNamedFunctions': false, 'allowUnboundThis': true }],
    'arrow-spacing': ['error', { 'before': true, 'after': true }],
    'arrow-parens': ['error', 'as-needed', { 'requireForBlockBody': true }],
    'no-duplicate-imports': 'error',
    'no-useless-rename': 'error',
    'object-shorthand': ['error', 'always', { 'ignoreConstructors': false, 'avoidQuotes': true }],

    // Error Handling & Async
    'no-throw-literal': 'error',
    'prefer-promise-reject-errors': 'error',
    'no-return-await': 'error',
    'require-await': 'error',
    'no-async-promise-executor': 'error',
    'no-await-in-loop': 'warn',
    'no-promise-executor-return': 'error',

    // Security Rules
    'security/detect-object-injection': 'error',
    'security/detect-non-literal-regexp': 'error',
    'security/detect-unsafe-regex': 'error',
    'security/detect-buffer-noassert': 'error',
    'security/detect-child-process': 'warn',
    'security/detect-disable-mustache-escape': 'error',
    'security/detect-eval-with-expression': 'error',
    'security/detect-no-csrf-before-method-override': 'error',
    'security/detect-non-literal-fs-filename': 'warn',
    'security/detect-non-literal-require': 'warn',
    'security/detect-possible-timing-attacks': 'warn',
    'security/detect-pseudoRandomBytes': 'error',

    // Node.js Specific
    'node/no-unpublished-require': 'off', // Allow dev dependencies in tests
    'node/no-missing-require': 'error',
    'node/no-extraneous-require': 'error',
    'node/prefer-global/buffer': ['error', 'always'],
    'node/prefer-global/console': ['error', 'always'],
    'node/prefer-global/process': ['error', 'always'],
    'node/prefer-global/url-search-params': ['error', 'always'],
    'node/prefer-global/url': ['error', 'always'],
    'node/prefer-promises/dns': 'error',
    'node/prefer-promises/fs': 'error',

    // Best Practices
    'eqeqeq': ['error', 'always', { 'null': 'ignore' }],
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    'no-self-compare': 'error',
    'no-sequences': 'error',
    'no-unmodified-loop-condition': 'error',
    'no-unused-expressions': ['error', { 'allowShortCircuit': true, 'allowTernary': true }],
    'no-useless-call': 'error',
    'no-useless-concat': 'error',
    'no-useless-return': 'error',
    'radix': 'error',
    'yoda': ['error', 'never'],

    // Console & Debugging
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-alert': 'error',

    // Prettier Integration
    'prettier/prettier': ['error', {
      'semi': true,
      'trailingComma': 'none',
      'singleQuote': true,
      'printWidth': 120,
      'tabWidth': 2,
      'useTabs': false,
      'bracketSpacing': true,
      'arrowParens': 'avoid',
      'endOfLine': 'lf'
    }]
  },
  overrides: [
    {
      files: ['**/*.test.js', '**/*.spec.js', '**/tests/**/*.js'],
      env: {
        jest: true
      },
      rules: {
        'no-console': 'off',
        'security/detect-non-literal-fs-filename': 'off',
        'node/no-unpublished-require': 'off'
      }
    },
    {
      files: ['scripts/**/*.js'],
      rules: {
        'no-console': 'off',
        'security/detect-child-process': 'off'
      }
    }
  ]
};
