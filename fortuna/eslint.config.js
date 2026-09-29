import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'test-results', 'playwright-report'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: { ecmaVersion: 2022, globals: { ...globals.browser, ...globals.worker } },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['src/economy/**/*.ts', 'src/investments/**/*.ts'],
    rules: {
      // La simulación debe ser determinista: prohibido Math.random y Date.now.
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Usa el Rng con semilla.' },
        { object: 'Date', property: 'now', message: 'Usa el reloj de la simulación.' },
      ],
      'no-restricted-imports': [
        'error',
        { patterns: ['**/engine/**', '**/ui/**', 'react', 'three', 'zustand'] },
      ],
    },
  },
);
