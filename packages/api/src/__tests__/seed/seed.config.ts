export interface SeedConfig {
  // データベース設定
  database: {
    clearExistingData: boolean
    batchSize: number
  }

  // 生成するデータ数
  dataCount: {
    predefinedContacts: number // 事前定義されたリアルなデータ
    multipleContactScenarios: number // 複数問い合わせシナリオ数
    randomContacts: number // ランダム生成データ
    totalContacts: number // 合計数
  }

  // 複数問い合わせ設定
  multipleContact: {
    includeScenarios: boolean // 事前定義シナリオを含むか
    enableRandomMultiple: boolean // ランダムデータでも複数問い合わせを作成するか
    multipleChance: number // ランダムデータで複数問い合わせになる確率 (0-1)
  }

  // 外部サービス設定
  external: {
    enableNotionSync: boolean
    enableSlackNotification: boolean
    delayBetweenRequests: number // ms
  }

  // 実行環境
  environment: 'development' | 'test' | 'staging'
}

export const defaultSeedConfig: SeedConfig = {
  database: {
    clearExistingData: true,
    batchSize: 5,
  },
  dataCount: {
    predefinedContacts: 3, // 事前定義されたリアルなデータ3件
    multipleContactScenarios: 2, // 複数問い合わせシナリオ2パターン
    randomContacts: 5, // ランダム生成データ5件
    totalContacts: 10, // 合計10件
  },
  multipleContact: {
    includeScenarios: true, // 事前定義シナリオを含む
    enableRandomMultiple: true, // ランダムでも複数問い合わせを作成
    multipleChance: 0.3, // 30%の確率で同じ人から複数問い合わせ
  },
  external: {
    enableNotionSync: true,
    enableSlackNotification: false, // 大量通知を避けるためデフォルトoff
    delayBetweenRequests: 1000, // 1秒間隔でAPI叩く
  },
  environment: 'development',
}

export const productionSeedConfig: SeedConfig = {
  ...defaultSeedConfig,
  database: {
    clearExistingData: false, // 本番では既存データを消さない
    batchSize: 3,
  },
  dataCount: {
    predefinedContacts: 1,
    multipleContactScenarios: 1, // 1パターンのみ
    randomContacts: 3,
    totalContacts: 6, // 合計6件程度
  },
  multipleContact: {
    includeScenarios: true,
    enableRandomMultiple: false, // 本番では複数問い合わせランダム生成しない
    multipleChance: 0.0,
  },
  external: {
    enableNotionSync: true,
    enableSlackNotification: true,
    delayBetweenRequests: 2000, // より慎重に
  },
  environment: 'staging',
}
