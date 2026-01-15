import {
  rand,
  randAlphaNumeric,
  randCompanyName,
  randEmail,
  randFullName,
  randIp,
  randNumber,
  randParagraph,
  randUrl,
  randUserName,
} from '@ngneat/falso'

// フォームで実際に使用される選択肢
const INQUIRY_TYPES = [
  'お仕事のご相談',
  '技術メンタリング',
  '技術相談・アドバイス',
  '講演・執筆依頼',
  'その他',
] as const

export interface SeedContactData {
  name: string
  email: string
  company: string
  twitterHandle?: string
  subject: string
  message: string
  ipAddress: string
  userAgent: string
  browserName: string
  browserVersion: string
  osName: string
  deviceType: string
  screenResolution: string
  timezone: string
  language: string
  referer: string
  sessionId: string
}

// 日本語を含むリアルなサンプルデータ
export const sampleContactData: SeedContactData[] = [
  {
    name: '田中太郎',
    email: 'tanaka.taro@tech-corp.jp',
    company: '株式会社テックコーポレーション',
    twitterHandle: 'tanaka_tech',
    subject: 'お仕事のご相談',
    message:
      'お世話になっております。弊社のコーポレートサイトのリニューアルを検討しており、ご相談させていただければと思います。特にモダンなデザインとSEO対策を重視したいと考えております。',
    ipAddress: '203.0.113.10',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    browserName: 'Chrome',
    browserVersion: '120.0.0.0',
    osName: 'Windows',
    deviceType: 'desktop',
    screenResolution: '1920x1080',
    timezone: 'Asia/Tokyo',
    language: 'ja-JP',
    referer: 'https://google.com/search?q=webサイト制作',
    sessionId: 'sess_1234567890',
  },
  {
    name: '佐藤花子',
    email: 'sato.hanako@startup-ventures.com',
    company: 'スタートアップベンチャーズ株式会社',
    twitterHandle: 'sato_startup',
    subject: '技術相談・アドバイス',
    message:
      'はじめまして。弊社では新規事業としてSaaSアプリケーションの開発を予定しております。Next.jsとTypeScriptを使った開発をお願いしたく、お見積もりをいただけますでしょうか。',
    ipAddress: '192.0.2.45',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
    browserName: 'Safari',
    browserVersion: '17.2',
    osName: 'macOS',
    deviceType: 'desktop',
    screenResolution: '2560x1440',
    timezone: 'Asia/Tokyo',
    language: 'ja-JP',
    referer: 'https://twitter.com/aromarious',
    sessionId: 'sess_2345678901',
  },
  {
    name: 'Mike Johnson',
    email: 'mike.j@global-tech.com',
    company: 'Global Tech Solutions',
    subject: 'お仕事のご相談',
    message:
      'Hello! We are a US-based tech company looking for a talented developer to collaborate on our upcoming project. We heard great things about your work and would love to discuss potential partnership opportunities.',
    ipAddress: '198.51.100.23',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101',
    browserName: 'Firefox',
    browserVersion: '121.0',
    osName: 'Windows',
    deviceType: 'desktop',
    screenResolution: '1440x900',
    timezone: 'America/New_York',
    language: 'en-US',
    referer: 'https://linkedin.com/in/aromarious',
    sessionId: 'sess_3456789012',
  },
]

// 同じ人からの複数問い合わせパターン
export const multipleContactScenarios: SeedContactData[][] = [
  // 田中太郎からの追加問い合わせ
  [
    {
      name: '田中太郎',
      email: 'tanaka.taro@tech-corp.jp',
      company: '株式会社テックコーポレーション',
      twitterHandle: 'tanaka_tech',
      subject: 'その他',
      message:
        '先日はお忙しい中、ご回答いただきありがとうございました。予算についてもう少し詳しくお聞きしたいことがあります。また、制作期間についてもご相談があります。',
      ipAddress: '203.0.113.10',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      browserName: 'Chrome',
      browserVersion: '120.0.0.0',
      osName: 'Windows',
      deviceType: 'desktop',
      screenResolution: '1920x1080',
      timezone: 'Asia/Tokyo',
      language: 'ja-JP',
      referer: 'https://direct-access',
      sessionId: 'sess_1234567891',
    },
    {
      name: '田中太郎',
      email: 'tanaka.taro@tech-corp.jp',
      company: '株式会社テックコーポレーション',
      twitterHandle: 'tanaka_tech',
      subject: 'お仕事のご相談',
      message:
        'いつもお世話になっております。社内で検討した結果、ぜひお願いしたいということになりました。正式に契約を進めさせていただければと思います。',
      ipAddress: '203.0.113.10',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      browserName: 'Chrome',
      browserVersion: '120.0.0.0',
      osName: 'Windows',
      deviceType: 'desktop',
      screenResolution: '1920x1080',
      timezone: 'Asia/Tokyo',
      language: 'ja-JP',
      referer: 'https://bookmark',
      sessionId: 'sess_1234567892',
    },
  ],

  // 佐藤花子からの追加問い合わせ
  [
    {
      name: '佐藤花子',
      email: 'sato.hanako@startup-ventures.com',
      company: 'スタートアップベンチャーズ株式会社',
      twitterHandle: 'sato_startup',
      subject: '技術メンタリング',
      message:
        'SaaSの件でご相談です。バックエンドにPythonかNode.jsか迷っているのですが、どちらがおすすめでしょうか？スケーラビリティとメンテナンス性を重視したいです。',
      ipAddress: '192.0.2.45',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
      browserName: 'Safari',
      browserVersion: '17.2',
      osName: 'macOS',
      deviceType: 'desktop',
      screenResolution: '2560x1440',
      timezone: 'Asia/Tokyo',
      language: 'ja-JP',
      referer: 'https://direct-access',
      sessionId: 'sess_2345678902',
    },
  ],

  // Mike Johnsonからの追加問い合わせ
  [
    {
      name: 'Mike Johnson',
      email: 'mike.j@global-tech.com',
      company: 'Global Tech Solutions',
      subject: 'その他',
      message:
        'Hi again! I wanted to follow up on our previous conversation about the collaboration opportunity. Our team is very excited about potentially working with you. Could we schedule a video call next week?',
      ipAddress: '198.51.100.23',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101',
      browserName: 'Firefox',
      browserVersion: '121.0',
      osName: 'Windows',
      deviceType: 'desktop',
      screenResolution: '1440x900',
      timezone: 'America/New_York',
      language: 'en-US',
      referer: 'https://email-link',
      sessionId: 'sess_3456789013',
    },
    {
      name: 'Mike Johnson',
      email: 'mike.j@global-tech.com',
      company: 'Global Tech Solutions',
      subject: 'お仕事のご相談',
      message:
        'Hope you are doing well! Quick question about the project timeline we discussed. Our board is asking for more specific dates. When would be the earliest we could start?',
      ipAddress: '198.51.100.23',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101',
      browserName: 'Firefox',
      browserVersion: '121.0',
      osName: 'Windows',
      deviceType: 'desktop',
      screenResolution: '1440x900',
      timezone: 'America/New_York',
      language: 'en-US',
      referer: 'https://direct-access',
      sessionId: 'sess_3456789014',
    },
  ],
]

// ランダムなサンプルデータを生成する関数
export function generateRandomContactData(count: number): SeedContactData[] {
  return Array.from({ length: count }, () => ({
    name: randFullName(),
    email: randEmail(),
    company: randCompanyName(),
    twitterHandle: randUserName()
      .replace(/[^a-zA-Z0-9_]/g, '')
      .substring(0, 15),
    subject: rand(INQUIRY_TYPES),
    message: randParagraph({ length: 2 }).join(' '),
    ipAddress: randIp(),
    userAgent: generateUserAgent(),
    browserName: rand(['Chrome', 'Firefox', 'Safari', 'Edge']),
    browserVersion: generateSemver(),
    osName: rand(['Windows', 'macOS', 'Linux']),
    deviceType: rand(['desktop', 'mobile', 'tablet']),
    screenResolution: rand(['1920x1080', '1440x900', '2560x1440', '1366x768']),
    timezone: rand(['Asia/Tokyo', 'America/New_York', 'Europe/London']),
    language: rand(['ja-JP', 'en-US', 'en-GB']),
    referer: randUrl(),
    sessionId: `sess_${randAlphaNumeric({ length: 10 })}`,
  }))
}

// 同じ人からの複数問い合わせを含むランダムデータ生成
export function generateRandomMultipleContactData(count: number): SeedContactData[] {
  const result: SeedContactData[] = []
  const multiContactChance = 0.3 // 30%の確率で同じ人から複数問い合わせ

  let remaining = count

  while (remaining > 0) {
    if (remaining > 1 && Math.random() < multiContactChance) {
      // 同じ人から2-3件の問い合わせを作成
      const contactCount = Math.min(randNumber({ min: 2, max: 3 }), remaining)
      const basePerson = {
        name: randFullName(),
        email: randEmail(),
        company: randCompanyName(),
        twitterHandle: randUserName()
          .replace(/[^a-zA-Z0-9_]/g, '')
          .substring(0, 15),
        ipAddress: randIp(),
        userAgent: generateUserAgent(),
        browserName: rand(['Chrome', 'Firefox', 'Safari', 'Edge']),
        browserVersion: generateSemver(),
        osName: rand(['Windows', 'macOS', 'Linux']),
        deviceType: rand(['desktop', 'mobile', 'tablet']),
        screenResolution: rand(['1920x1080', '1440x900', '2560x1440', '1366x768']),
        timezone: rand(['Asia/Tokyo', 'America/New_York', 'Europe/London']),
        language: rand(['ja-JP', 'en-US', 'en-GB']),
      }

      // 同じ人からの複数問い合わせを生成
      for (let i = 0; i < contactCount; i++) {
        result.push({
          ...basePerson,
          subject: rand(INQUIRY_TYPES),
          message: randParagraph({ length: 2 }).join(' '),
          referer:
            i === 0
              ? randUrl()
              : rand(['https://direct-access', 'https://bookmark', 'https://email-link']),
          sessionId: `sess_${randAlphaNumeric({ length: 10 })}`,
        })
      }

      remaining -= contactCount
    } else {
      // 単発の問い合わせを作成
      result.push({
        name: randFullName(),
        email: randEmail(),
        company: randCompanyName(),
        twitterHandle: randUserName()
          .replace(/[^a-zA-Z0-9_]/g, '')
          .substring(0, 15),
        subject: rand(INQUIRY_TYPES),
        message: randParagraph({ length: 2 }).join(' '),
        ipAddress: randIp(),
        userAgent: generateUserAgent(),
        browserName: rand(['Chrome', 'Firefox', 'Safari', 'Edge']),
        browserVersion: generateSemver(),
        osName: rand(['Windows', 'macOS', 'Linux']),
        deviceType: rand(['desktop', 'mobile', 'tablet']),
        screenResolution: rand(['1920x1080', '1440x900', '2560x1440', '1366x768']),
        timezone: rand(['Asia/Tokyo', 'America/New_York', 'Europe/London']),
        language: rand(['ja-JP', 'en-US', 'en-GB']),
        referer: randUrl(),
        sessionId: `sess_${randAlphaNumeric({ length: 10 })}`,
      })

      remaining--
    }
  }

  return result
}

// 独自実装：UserAgent生成
function generateUserAgent(): string {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
  ]
  return rand(userAgents)
}

// 独自実装：セマンティックバージョン生成
function generateSemver(): string {
  const major = randNumber({ min: 1, max: 20 })
  const minor = randNumber({ min: 0, max: 20 })
  const patch = randNumber({ min: 0, max: 20 })
  return `${major}.${minor}.${patch}`
}
