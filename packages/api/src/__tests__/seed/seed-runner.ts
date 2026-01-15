import { describe, it } from 'vitest'

import type { Database } from '@aromarious/db'

import type { SeedConfig } from './seed.config'
import { SeedRunner } from '../../utils/seed-runner'
import { defaultSeedConfig } from './seed.config'

// Vitestテスト枠組みでシードデータを実行
describe('Seed Data Runner', () => {
  describe('Development Seed', () => {
    it('should create sample contact data for development', async () => {
      const db = globalThis.testDb as Database
      const seedRunner = new SeedRunner(defaultSeedConfig, db)
      await seedRunner.executeSeed()
    }, 60000) // 60秒タイムアウト
  })

  describe('Large Dataset Seed', () => {
    it('should create large dataset for performance testing', async () => {
      const largeConfig = {
        ...defaultSeedConfig,
        dataCount: {
          predefinedContacts: 3,
          multipleContactScenarios: 0,
          randomContacts: 47,
          totalContacts: 50,
        },
        database: {
          clearExistingData: false, // 既存データは保持
          batchSize: 10,
        },
        external: {
          enableNotionSync: true, // 大量データでもNotion同期を有効化
          enableSlackNotification: false,
          delayBetweenRequests: 500,
        },
      }

      const db = globalThis.testDb as Database
      const seedRunner = new SeedRunner(largeConfig, db)
      await seedRunner.executeSeed()
    }, 120000) // 2分タイムアウト
  })

  describe('Resync Unsynced Records', () => {
    it('should resync unsynced records to Notion', async () => {
      console.log('🔄 再同期: 同期に失敗したレコードを再処理します...')

      const resyncConfig: SeedConfig = {
        environment: 'development',
        dataCount: {
          predefinedContacts: 0,
          multipleContactScenarios: 0,
          randomContacts: 0,
          totalContacts: 0,
        },
        multipleContact: {
          includeScenarios: false,
          enableRandomMultiple: false,
          multipleChance: 0,
        },
        database: {
          clearExistingData: false,
          batchSize: 5,
        },
        external: {
          enableNotionSync: true,
          enableSlackNotification: false,
          delayBetweenRequests: 1000,
        },
      }

      const db = globalThis.testDb as Database
      const seedRunner = new SeedRunner(resyncConfig, db)
      await seedRunner.resyncUnsyncedRecords()
    }, 180000) // 3分タイムアウト（大量データ対応）
  })
})
