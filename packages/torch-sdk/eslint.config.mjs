import globals from 'globals'
import pluginJs from '@eslint/js'
import tseslint from 'typescript-eslint'

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ['src/**/*.{ts}', 'tests/**/*.{ts}'],
  },
  {
    ignores: [
      '.github/**',
      '.husky/**',
      '.yarn/**',
      'node_modules/**',
      'dist/**/*.js',
      'node_modules/**',
      'jest.config.ts',
      'rollup.config.js',
      'eslint.config.mjs',
    ],
  },
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
    },
  },
]
