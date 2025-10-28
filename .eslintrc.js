module.exports = {
  extends: ['next/core-web-vitals'],
  rules: {
    // Permitir variáveis não utilizadas que começam com _
    '@typescript-eslint/no-unused-vars': ['error', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_',
    }],
    '@typescript-eslint/no-explicit-any': 'off',
    'react-hooks/exhaustive-deps': 'warn',
    'prefer-const': 'warn',
  },
};