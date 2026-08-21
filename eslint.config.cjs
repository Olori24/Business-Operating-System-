const js = require('@eslint/js');
const globals = require('globals');

const sharedGlobals = {
  ...globals.browser,
  ...globals.node,
  AbortController: 'readonly',
  FormData: 'readonly',
  Headers: 'readonly',
  Request: 'readonly',
  Response: 'readonly',
  describe: 'readonly',
  test: 'readonly',
  expect: 'readonly',
};

const sharedRules = {
  'max-lines': ['error', { max: 500, skipBlankLines: true, skipComments: true }],
  'no-console': 'off',
  'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none' }],
};

module.exports = [
  {
    ignores: ['**/node_modules/**', '**/coverage/**', '**/dist/**'],
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,cjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: sharedGlobals,
    },
    rules: sharedRules,
  },
  {
    files: ['**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: sharedGlobals,
    },
    rules: sharedRules,
  },
];
