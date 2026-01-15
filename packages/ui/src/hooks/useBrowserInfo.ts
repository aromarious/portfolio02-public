import { useEffect, useState } from 'react'

interface BrowserInfo {
  browserName: string
  browserVersion: string
  osName: string
  deviceType: 'desktop' | 'mobile' | 'tablet'
  screenResolution: string
  language: string
  timezone: string
}

interface SessionInfo {
  sessionId: string
  userAgent: string
  referer: string
  previousVisitAt: Date
  formStartTime: number
}

const getBrowserInfo = (): BrowserInfo => {
  if (typeof window === 'undefined') {
    return {
      browserName: 'unknown',
      browserVersion: 'unknown',
      osName: 'unknown',
      deviceType: 'desktop',
      screenResolution: '0x0',
      language: 'unknown',
      timezone: 'unknown',
    }
  }

  const ua = navigator.userAgent
  let browserName = 'unknown'
  let browserVersion = 'unknown'
  let osName = 'unknown'
  let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop'

  // ブラウザとバージョンの検出
  if (ua.indexOf('Chrome') > -1) {
    browserName = 'Chrome'
    browserVersion = ua.match(/Chrome\/(\d+\.\d+)/)?.[1] ?? 'unknown'
  } else if (ua.indexOf('Firefox') > -1) {
    browserName = 'Firefox'
    browserVersion = ua.match(/Firefox\/(\d+\.\d+)/)?.[1] ?? 'unknown'
  } else if (ua.indexOf('Safari') > -1) {
    browserName = 'Safari'
    browserVersion = ua.match(/Version\/(\d+\.\d+)/)?.[1] ?? 'unknown'
  } else if (ua.indexOf('MSIE') > -1 || ua.indexOf('Trident') > -1) {
    browserName = 'Internet Explorer'
    browserVersion = ua.match(/(?:MSIE |rv:)(\d+\.\d+)/)?.[1] ?? 'unknown'
  } else if (ua.indexOf('Edge') > -1) {
    browserName = 'Edge'
    browserVersion = ua.match(/Edge\/(\d+\.\d+)/)?.[1] ?? 'unknown'
  }

  // OS検出
  if (ua.indexOf('Windows') > -1) {
    osName = 'Windows'
  } else if (ua.indexOf('Mac') > -1) {
    osName = 'MacOS'
  } else if (ua.indexOf('Linux') > -1) {
    osName = 'Linux'
  } else if (ua.indexOf('Android') > -1) {
    osName = 'Android'
    deviceType = 'mobile'
  } else if (ua.indexOf('iPhone') > -1 || ua.indexOf('iPad') > -1) {
    osName = 'iOS'
    deviceType = ua.indexOf('iPad') > -1 ? 'tablet' : 'mobile'
  }

  // タブレット検出（簡易版）
  if (deviceType === 'desktop' && window.innerWidth <= 1024 && window.innerWidth > 480) {
    deviceType = 'tablet'
  } else if (deviceType === 'desktop' && window.innerWidth <= 480) {
    deviceType = 'mobile'
  }

  return {
    browserName,
    browserVersion,
    osName,
    deviceType,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }
}

const generateSessionId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

export const useBrowserInfo = () => {
  const [browserInfo, setBrowserInfo] = useState<BrowserInfo | null>(null)
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // ブラウザとデバイス情報の収集
      const info = getBrowserInfo()
      setBrowserInfo(info)

      // セッションIDの取得または生成
      let sessionId = localStorage.getItem('contactFormSessionId')
      if (!sessionId) {
        sessionId = generateSessionId()
        localStorage.setItem('contactFormSessionId', sessionId)
      }

      // 前回訪問時間の取得
      const previousVisitStr = localStorage.getItem('lastVisitTime')
      const previousVisitAt = previousVisitStr
        ? new Date(Number.parseInt(previousVisitStr, 10))
        : new Date()

      // 今回の訪問時間を記録
      localStorage.setItem('lastVisitTime', Date.now().toString())

      // セッション情報の設定
      setSessionInfo({
        sessionId,
        userAgent: navigator.userAgent,
        referer: document.referrer || '',
        previousVisitAt,
        formStartTime: Date.now(),
      })
    }
  }, [])

  return {
    browserInfo,
    sessionInfo,
    isLoading: !browserInfo || !sessionInfo,
  }
}
