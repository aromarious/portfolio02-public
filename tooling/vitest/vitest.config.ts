import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

const dirname =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(dirname, '../../')

// 現在の日時を取得してフォーマット
const now = new Date()
const dateTimeString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`

export default defineConfig({
  test: {
    globals: true,
    exclude: ['node_modules', '.next', 'dist', '**/node_modules/**'],
    root: rootDir,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json', 'lcov'],
      reportsDirectory: `./reports/coverage-${dateTimeString}`,
      include: ['packages/*/src/**/*.{ts,tsx}'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'reports/coverage/**',
        '**/*.config.{js,ts}',
        '**/*.d.ts',
        '**/setup/**',
        '**/__tests__/**',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/types/**',
        '**/client.ts',
        '**/index.ts',
        // * especially excluded
        'packages/db/src/{migrate,test-client}.ts',
        'packages/api/src/utils/seed-runner.ts',
      ],
    },
    projects: [
      {
        root: rootDir,
        plugins: [
          tsconfigPaths({
            projects: [
              'packages/db/tsconfig.json',
              'packages/api/tsconfig.json',
              'packages/external/tsconfig.json',
              'packages/ui/tsconfig.json',
              'packages/validators/tsconfig.json',
            ],
          }),
        ],
        test: {
          name: '📦unit',
          environment: 'node',
          include: ['packages/**/*.unit.test.{ts,tsx}'],
          exclude: ['**/node_modules/**', 'packages/ui/src/components/**/*.unit.test.{ts,tsx}'],
          setupFiles: [path.resolve(dirname, 'setup/unit.ts')],
          pool: 'threads',
          poolOptions: {
            threads: {
              singleThread: false,
            },
          },
          typecheck: {
            enabled: true,
          },
        },
        resolve: {
          alias: {
            '@aromarious/api': path.resolve(rootDir, 'packages/api/src'),
            '@aromarious/db': path.resolve(rootDir, 'packages/db/src'),
            '@aromarious/external': path.resolve(rootDir, 'packages/external/src'),
            '@aromarious/ui': path.resolve(rootDir, 'packages/ui/src'),
            '@aromarious/validators': path.resolve(rootDir, 'packages/validators/src'),
          },
        },
      },
      {
        root: rootDir,
        plugins: [
          tsconfigPaths({
            projects: [
              'packages/db/tsconfig.json',
              'packages/api/tsconfig.json',
              'packages/external/tsconfig.json',
              'packages/ui/tsconfig.json',
              'packages/validators/tsconfig.json',
            ],
          }),
        ],
        test: {
          name: '🔁database',
          environment: 'node',
          include: ['packages/**/*.database.test.{ts,tsx}'],
          exclude: ['**/node_modules/**'],
          setupFiles: [path.resolve(dirname, 'setup/database.ts')],
          pool: 'forks',
          poolOptions: {
            forks: {
              singleFork: true,
            },
          },
          sequence: {
            concurrent: false,
          },
          testTimeout: 30000,
          hookTimeout: 30000,
          typecheck: {
            enabled: true,
          },
        },
        resolve: {
          alias: {
            '@aromarious/api': path.resolve(rootDir, 'packages/api/src'),
            '@aromarious/db': path.resolve(rootDir, 'packages/db/src'),
            '@aromarious/external': path.resolve(rootDir, 'packages/external/src'),
            '@aromarious/ui': path.resolve(rootDir, 'packages/ui/src'),
            '@aromarious/validators': path.resolve(rootDir, 'packages/validators/src'),
          },
        },
      },
      {
        root: rootDir,
        plugins: [
          tsconfigPaths({
            projects: [
              'packages/db/tsconfig.json',
              'packages/api/tsconfig.json',
              'packages/external/tsconfig.json',
              'packages/ui/tsconfig.json',
              'packages/validators/tsconfig.json',
            ],
          }),
        ],
        test: {
          name: '🌐external',
          environment: 'node',
          include: ['packages/**/*.external.test.{ts,tsx}'],
          exclude: ['**/node_modules/**'],
          setupFiles: [path.resolve(dirname, 'setup/external.ts')],
          pool: 'forks',
          poolOptions: {
            forks: {
              singleFork: true,
            },
          },
          sequence: {
            concurrent: false,
          },
          testTimeout: 60000,
          hookTimeout: 30000,
          retry: 1,
          typecheck: {
            enabled: true,
          },
        },
        resolve: {
          alias: {
            '@aromarious/api': path.resolve(rootDir, 'packages/api/src'),
            '@aromarious/db': path.resolve(rootDir, 'packages/db/src'),
            '@aromarious/external': path.resolve(rootDir, 'packages/external/src'),
            '@aromarious/ui': path.resolve(rootDir, 'packages/ui/src'),
            '@aromarious/validators': path.resolve(rootDir, 'packages/validators/src'),
          },
        },
      },
      {
        root: rootDir,
        plugins: [
          tsconfigPaths({
            projects: ['packages/ui/tsconfig.json'],
          }),
        ],
        test: {
          name: '📱ui',
          environment: 'jsdom',
          globals: true,
          include: ['packages/ui/src/components/**/*.unit.test.{ts,tsx}'],
          exclude: [
            '**/node_modules/**',
            'packages/ui/src/components/__tests__/ContactForm.unit.test.tsx',
          ],
          setupFiles: [path.resolve(dirname, 'setup/ui.ts')],
          pool: 'threads',
          poolOptions: {
            threads: {
              singleThread: false,
            },
          },
          typecheck: {
            enabled: true,
          },
        },
        resolve: {
          alias: {
            '@aromarious/ui': path.resolve(rootDir, 'packages/ui/src'),
            '@aromarious/validators': path.resolve(rootDir, 'packages/validators/src'),
          },
        },
      },
      {
        root: rootDir,
        plugins: [
          tsconfigPaths({
            projects: [
              'apps/nextjs/tsconfig.json',
              'packages/db/tsconfig.json',
              'packages/api/tsconfig.json',
              'packages/external/tsconfig.json',
              'packages/ui/tsconfig.json',
              'packages/validators/tsconfig.json',
            ],
          }),
        ],
        test: {
          name: '🎭e2e',
          environment: 'node',
          include: ['apps/**/*.e2e.test.{ts,tsx}'],
          exclude: ['**/node_modules/**'],
          setupFiles: [path.resolve(dirname, 'setup/e2e.ts')],
          pool: 'forks',
          poolOptions: {
            forks: {
              singleFork: true,
            },
          },
          sequence: {
            concurrent: false,
          },
          testTimeout: 60000,
          hookTimeout: 30000,
          typecheck: {
            enabled: true,
          },
        },
        resolve: {
          alias: {
            '@aromarious/api': path.resolve(rootDir, 'packages/api/src'),
            '@aromarious/db': path.resolve(rootDir, 'packages/db/src'),
            '@aromarious/external': path.resolve(rootDir, 'packages/external/src'),
            '@aromarious/ui': path.resolve(rootDir, 'packages/ui/src'),
            '@aromarious/validators': path.resolve(rootDir, 'packages/validators/src'),
          },
        },
      },
    ],
  },
  resolve: {
    alias: {
      '@aromarious/api': path.resolve(rootDir, 'packages/api/src'),
      '@aromarious/auth': path.resolve(rootDir, 'packages/auth/src'),
      '@aromarious/db': path.resolve(rootDir, 'packages/db/src'),
      '@aromarious/external': path.resolve(rootDir, 'packages/external/src'),
      '@aromarious/ui': path.resolve(rootDir, 'packages/ui/src'),
      '@aromarious/validators': path.resolve(rootDir, 'packages/validators/src'),
    },
  },
})
