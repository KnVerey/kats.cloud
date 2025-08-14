// @ts-check
// ESLint v9+ flat config for kats.cloud

import js from '@eslint/js';
import globals from 'globals';
import eslintConfigPrettier from 'eslint-config-prettier';
import ts from 'typescript-eslint';

export default [
  // 0) Ignore noise
  {
    ignores: [
      'node_modules/',
      'dist/',
      'build/',
      'coverage/',
      'playwright-report/',
      'test-results/',
      '.git/',
      '.vscode/',
      'images/**',
      '**/*.min.js',
    ],
  },

  // 1) Browser JavaScript (site code)
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: globals.browser,
    },
    ...js.configs.recommended, // ESLint core recommended rules
  },

  // 2a) Node/CommonJS configs (e.g., playwright.config.js if using require/module)
  {
    files: ['**/*.cjs', '**/playwright.config.{js,cjs}'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'commonjs',
      globals: globals.node,
    },
  },
  // 2b) Node/ESM config variant (only used if you ever switch to .mjs)
  {
    files: ['**/playwright.config.mjs'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: globals.node,
    },
  },

  // 3) TypeScript (Playwright tests in /test)
  // Use typescript-eslint's recommended flat configs, scoped to tests.
  ...ts.configs.recommended.map((cfg) => ({
    files: ['test/**/*.ts'],
    ...cfg,
    languageOptions: {
      ...(cfg.languageOptions ?? {}),
      parserOptions: {
        ...(cfg.languageOptions?.parserOptions ?? {}),
        ecmaVersion: 2024,
        sourceType: 'module',
      },
      globals: globals.node,
    },
  })),

  // 4) Turn off formatting rules (let Prettier own formatting)
  eslintConfigPrettier,
];
