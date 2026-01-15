import type { Database } from '@aromarious/db'
import { ContactRepository, PersonRepository } from '@aromarious/db'
import { ContactDomainService, ExternalSyncDomainService } from '@aromarious/domain'
import {
  NotionContactRepository,
  NotionPersonRepository,
  NotionService,
  SlackNotificationService,
} from '@aromarious/external'

import type { SeedContactData } from '../__tests__/seed/seed-data'
import type { SeedConfig } from '../__tests__/seed/seed.config'
import {
  generateRandomContactData,
  generateRandomMultipleContactData,
  multipleContactScenarios,
  sampleContactData,
} from '../__tests__/seed/seed-data'
import { ContactApplicationService } from '../application/services/contact-application.service'

/**
 * テスト枠組みを活用したシードデータ実行ランナー
 *
 * 利点:
 * - 実際のサービス関数を使用
 * - テスト環境の設定（DB、外部サービス）を再利用
 * - VitestのbeforeAll/afterAllでセットアップ/クリーンアップ
 * - 実際のデータフローと同じ処理
 */
export class SeedRunner {
  private config: SeedConfig
  private contactApplicationService: ContactApplicationService
  private contactRepository: ContactRepository
  private personRepository: PersonRepository

  constructor(config: SeedConfig, db: Database) {
    this.config = config

    // リポジトリのインスタンスを作成（テスト環境のDBを使用）
    this.contactRepository = new ContactRepository(db)
    this.personRepository = new PersonRepository(db)

    // 実際のサービスを初期化（テストと同じ方法）
    const contactDomainService = new ContactDomainService(
      this.personRepository,
      this.contactRepository
    )
    const notionContactRepo = new NotionContactRepository(
      process.env.NOTION_API_TOKEN || '',
      process.env.NOTION_PARENT_PAGE_ID || ''
    )
    const notionPersonRepo = new NotionPersonRepository(
      process.env.NOTION_API_TOKEN || '',
      process.env.NOTION_PARENT_PAGE_ID || ''
    )
    const notionService = new NotionService(notionContactRepo, notionPersonRepo)
    const slackNotifier = new SlackNotificationService(process.env.SLACK_WEBHOOK_URL || '')
    const externalSyncDomainService = new ExternalSyncDomainService(
      contactDomainService,
      this.contactRepository,
      this.personRepository,
      notionService,
      notionContactRepo,
      notionPersonRepo,
      slackNotifier
    )
    this.contactApplicationService = new ContactApplicationService(
      contactDomainService,
      externalSyncDomainService
    )
  }

  /**
   * シードデータの実行
   */
  async executeSeed(): Promise<void> {
    console.log('🌱 シードデータの実行を開始します...')
    console.log(`📊 設定: ${JSON.stringify(this.config, null, 2)}`)

    // 1. 既存データのクリア（設定による）
    if (this.config.database.clearExistingData) {
      await this.clearExistingData()
    }

    // 2. サンプルデータの準備
    const allContactData = this.prepareSeedData()
    console.log(`📝 生成するデータ数: ${allContactData.length}件`)

    // 3. バッチ処理でデータ作成
    await this.createContactsInBatches(allContactData)

    console.log('✅ シードデータの実行が完了しました')
  }

  /**
   * 既存データのクリア（リポジトリメソッド使用版）
   */
  private async clearExistingData(): Promise<void> {
    console.log('🧹 既存データをクリアしています...')

    try {
      // リポジトリのメソッドを使用してより安全に削除
      await this.contactRepository.deleteAll()
      await this.personRepository.deleteAll()

      console.log('✅ 既存データのクリアが完了しました')
    } catch (error) {
      console.error('❌ データクリアに失敗:', error)
      throw error
    }
  }

  /**
   * シードデータの準備
   */
  private prepareSeedData(): SeedContactData[] {
    const data: SeedContactData[] = []

    // 1. 事前定義されたリアルなデータ（初回問い合わせ）
    const predefinedData = sampleContactData.slice(0, this.config.dataCount.predefinedContacts)
    data.push(...predefinedData)

    // 2. 複数問い合わせシナリオ
    if (this.config.multipleContact.includeScenarios) {
      const scenariosToInclude = multipleContactScenarios.slice(
        0,
        this.config.dataCount.multipleContactScenarios
      )
      for (const scenario of scenariosToInclude) {
        data.push(...scenario)
      }
    }

    // 3. ランダム生成データ
    if (this.config.multipleContact.enableRandomMultiple) {
      // 複数問い合わせも含むランダムデータ
      const randomData = generateRandomMultipleContactData(this.config.dataCount.randomContacts)
      data.push(...randomData)
    } else {
      // 単発のみのランダムデータ
      const randomData = generateRandomContactData(this.config.dataCount.randomContacts)
      data.push(...randomData)
    }

    return data.slice(0, this.config.dataCount.totalContacts)
  }

  /**
   * バッチ処理でContact作成
   */
  private async createContactsInBatches(contactDataList: SeedContactData[]): Promise<void> {
    const batches = this.createBatches(contactDataList, this.config.database.batchSize)

    console.log(
      `🔄 ${batches.length}個のバッチで処理します（バッチサイズ: ${this.config.database.batchSize}）`
    )

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]
      console.log(`📦 バッチ ${i + 1}/${batches.length} を処理中... (${batch?.length || 0}件)`)

      // バッチ内の各アイテムを順次処理（レースコンディション回避）
      if (batch) {
        for (let j = 0; j < batch.length; j++) {
          const contactData = batch[j]
          if (contactData) {
            await this.createSingleContact(contactData, i * this.config.database.batchSize + j + 1)
          }
        }
      }

      // バッチ間の遅延（API制限対策）
      if (i < batches.length - 1) {
        await this.delay(this.config.external.delayBetweenRequests)
      }
    }
  }

  /**
   * 単一のContact作成
   */
  private async createSingleContact(contactData: SeedContactData, index: number): Promise<void> {
    try {
      const input = {
        name: contactData.name,
        email: contactData.email,
        company: contactData.company,
        twitterHandle: contactData.twitterHandle,
        subject: contactData.subject,
        message: contactData.message,
        ipAddress: contactData.ipAddress,
        userAgent: contactData.userAgent,
        referer: contactData.referer,
        sessionId: contactData.sessionId,
        deviceType: contactData.deviceType as 'desktop' | 'mobile' | 'tablet' | undefined,
        browserName: contactData.browserName,
        browserVersion: contactData.browserVersion,
        osName: contactData.osName,
        screenResolution: contactData.screenResolution,
        language: contactData.language,
        timezone: contactData.timezone,
      }

      const result = await this.contactApplicationService.submitInquiry(input)

      console.log(
        `✅ ${index}. ${contactData.name} (${contactData.email}) - Contact ID: ${result.contactId}`
      )

      if (result.isFirstTimeContact) {
        console.log('   👋 初回問い合わせです')
      } else {
        console.log('   🔄 リピーター（既存の方からの問い合わせ）')
      }

      // Contact間の遅延（Notion API制限対策）
      await this.delay(this.config.external.delayBetweenRequests)
    } catch (error) {
      console.error(`❌ ${index}. ${contactData.name} の作成に失敗:`, error)
      // エラー時も遅延を入れる
      await this.delay(this.config.external.delayBetweenRequests)
    }
  }

  /**
   * 配列をバッチに分割
   */
  private createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = []
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize))
    }
    return batches
  }

  /**
   * 遅延処理
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * 再同期: 同期に失敗したレコードを再処理
   */
  async resyncUnsyncedRecords(): Promise<void> {
    console.log('🔍 notion_synced = false のレコードを検索中...')

    // 同期に失敗したContactレコードを取得
    const unsyncedContacts = await this.contactRepository.findUnsyncedContacts()

    if (unsyncedContacts.length === 0) {
      console.log('✅ 同期の失敗したレコードは見つかりませんでした')
      return
    }

    console.log(`📝 ${unsyncedContacts.length}件の未同期レコードが見つかりました`)

    // バッチ処理で再同期を実行
    const batches = this.createBatches(unsyncedContacts, this.config.database.batchSize)

    for (let i = 0; i < batches.length; i++) {
      console.log(`📦 バッチ ${i + 1}/${batches.length} を処理中... (${batches[i]?.length}件)`)

      const batch = batches[i]
      if (batch) {
        for (let j = 0; j < batch.length; j++) {
          const contact = batch[j]
          if (contact) {
            await this.retryContactSync(contact, i * this.config.database.batchSize + j + 1)
          }
        }
      }

      // バッチ間の遅延
      if (i < batches.length - 1) {
        await this.delay(this.config.external.delayBetweenRequests)
      }
    }

    console.log('🧹 落穂拾い処理が完了しました')
  }

  /**
   * 単一Contactの再同期処理
   */
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  private async retryContactSync(contact: any, index: number): Promise<void> {
    try {
      // ContactドメインエンティティからPersonを取得
      const person = await this.personRepository.findById(contact.personId)

      if (!person) {
        console.log(`❌ Person情報が見つかりません - Contact ID: ${contact.id}`)
        return
      }

      console.log(`🔄 ${index}. ${person.name} (${person.email.value}) - Contact ID: ${contact.id}`)

      // 外部サービス同期を再実行
      await this.contactApplicationService.retryExternalSync(contact.id, {
        personId: person.id,
        contactId: contact.id,
        name: person.name,
        email: person.email.value,
        subject: contact.subject,
        message: contact.message,
        twitterHandle: person.twitterHandle,
        createdAt: contact.createdAt,
      })

      console.log(`✅ 再同期完了 - Contact ID: ${contact.id}`)
    } catch (error) {
      console.error(`❌ 再同期失敗 - Contact ID: ${contact.id}`, error)
    }
  }
}
