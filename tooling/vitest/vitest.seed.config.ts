import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

const dirname =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(dirname, '../../')

export default defineConfig({
  plugins: [
    tsconfigPaths({
      projects: [
        'packages/db/tsconfig.json',
        'packages/api/tsconfig.json',
        'packages/domain/tsconfig.json',
        'packages/external/tsconfig.json',
        'packages/ui/tsconfig.json',
        'packages/validators/tsconfig.json',
      ],
    }),
  ],
  test: {
    name: '🌱seed',
    environment: 'node',
    include: ['packages/**/__tests__/seed/**/seed-runner.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'dist', '**/node_modules/**'],
    setupFiles: [path.resolve(dirname, 'setup/seed.ts')], // seed専用セットアップ（開発DB接続）
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    sequence: {
      concurrent: false,
    },
    testTimeout: 120000, // 2分タイムアウト（長めに設定）
    hookTimeout: 30000,
    typecheck: {
      enabled: true,
    },
    globals: true,
    root: rootDir,
  },
  resolve: {
    alias: {
      '@aromarious/api': path.resolve(rootDir, 'packages/api/src'),
      '@aromarious/db': path.resolve(rootDir, 'packages/db/src'),
      '@aromarious/domain': path.resolve(rootDir, 'packages/domain/src'),
      '@aromarious/external': path.resolve(rootDir, 'packages/external/src'),
      '@aromarious/ui': path.resolve(rootDir, 'packages/ui/src'),
      '@aromarious/validators': path.resolve(rootDir, 'packages/validators/src'),
    },
  },
})
