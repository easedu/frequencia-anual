module.exports = {
  extends: ['next/core-web-vitals'],
  rules: {
    // Temporariamente desabilitar durante migração - foco na funcionalidade
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    'react-hooks/exhaustive-deps': 'warn',
    'prefer-const': 'warn',
  },
};