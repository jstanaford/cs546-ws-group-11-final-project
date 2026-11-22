import js from '@eslint/js';
import globals from 'globals';

// flat config, eslint 9. keeping the rule list short on purpose, five of us are writing code
// at the same time and the only rules worth arguing about are the ones that catch real breaks
export default [
  {
    ignores: ['node_modules/**', 'public/images/**']
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        ...globals.node
      }
    },
    rules: {
      // usually a leftover from a rename
      'no-unused-vars': 'error',
      // typos in a name, the kind that only shows up when that route gets hit
      'no-undef': 'error'
    }
  },
  {
    // anything in public/js runs in the browser, not in node
    files: ['public/js/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser
      }
    }
  }
];
