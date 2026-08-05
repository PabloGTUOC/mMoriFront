// @ts-check
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const prettier = require('eslint-config-prettier');

/**
 * ESLint flat configuration.
 *
 * Replaces `.eslintrc.json`, which ESLint 9 no longer reads — `npm run lint` could not even
 * start before this file existed. See FRONTEND_IMPROVEMENT_PLAN.md task 2.1.
 *
 * Two things changed beyond the format migration:
 *
 * 1. **Templates are actually linted now.** The old config declared an `*.html` override but
 *    never installed an Angular template parser, so HTML files were only checked by Prettier.
 *    `angular-eslint` brings the real template rules, including the accessibility set.
 *
 * 2. **Prettier no longer runs as an ESLint rule.** `eslint-config-prettier` turns off rules
 *    that would fight the formatter, but formatting is checked separately with
 *    `npm run format:check`. Running Prettier through ESLint would bury real findings under
 *    hundreds of whitespace warnings, since the codebase predates the Prettier config.
 */
module.exports = tseslint.config(
  {
    // Build output, dependencies, and the backend — which is a separate npm project with its
    // own TypeScript setup and must not be linted with Angular rules.
    ignores: ['dist/**', 'node_modules/**', '.angular/**', 'coverage/**', 'backend/**'],
  },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...angular.configs.tsRecommended,
      prettier,
    ],
    // Lets template rules reach templates written inline in @Component decorators.
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'app', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'app', style: 'kebab-case' },
      ],
      // Warnings, not errors: the codebase is mid-migration to real types (Phase 3), and a
      // failing lint run for known debt would just train everyone to ignore it.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
    rules: {},
  }
);
