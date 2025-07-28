module.exports = {
  extends: [
    'next/core-web-vitals',
    '@typescript-eslint/recommended',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  rules: {
    // TypeScript specific rules
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-empty-function': 'warn',
    '@typescript-eslint/no-require-imports': 'off',

    // React specific rules
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // General JavaScript rules
    'no-console': 'warn',
    'no-debugger': 'error',
    'prefer-const': 'error',
    'no-var': 'error',

    // Next.js specific rules
    '@next/next/no-img-element': 'error',
    '@next/next/no-html-link-for-pages': 'error',
  },
  overrides: [
    {
      files: [
        '*.config.js',
        '*.config.ts',
        '*.config.mjs',
        'jest.config.js',
        'tailwind.config.ts',
        'next.config.ts',
        'postcss.config.mjs',
      ],
      rules: {
        '@typescript-eslint/no-require-imports': 'off',
      },
    },
  ],
  settings: {
    react: {
      version: 'detect',
    },
  },
  env: {
    browser: true,
    es2020: true,
    node: true,
  },
};
