import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FlatCompat } from '@eslint/eslintrc'

// eslint-config-next still ships in eslintrc format; FlatCompat is the bridge
// Next itself recommends. `next lint` is removed in Next 16, so package.json
// calls the ESLint CLI directly — which also means it runs non-interactively in CI.
const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) })

const config = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'next-env.d.ts',
      'coverage/**',
      // Throwaway probes and review scratch: not project source, and a stray
      // unused import in one should never fail the project's lint.
      '.review-tmp/**',
      '**/*.review.*',
      '**/__probe*',
    ],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
]

export default config
