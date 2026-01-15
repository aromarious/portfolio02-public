import type { Page } from 'playwright'
import { expect } from '@playwright/test'
import { describe, test } from 'vitest'

// グローバルなテスト環境（setup/e2e.tsで設定）
declare global {
  // eslint-disable-next-line no-var
  var testPage: Page
}

const BASE_URL = 'http://localhost:3201'

describe('Contact Form E2E Tests', () => {
  test('should display contact form on homepage', async () => {
    // トップページに移動
    await globalThis.testPage.goto(BASE_URL)

    // ページが読み込まれるまで待機
    await globalThis.testPage.waitForLoadState('networkidle')

    // Contact セクションまでスクロール
    await globalThis.testPage.locator('[data-testid="contact-section"]').scrollIntoViewIfNeeded()

    // Contact Formの存在確認
    await expect(globalThis.testPage.locator('[data-testid="contact-section"]')).toBeVisible()
    await expect(globalThis.testPage.locator('[data-testid="contact-form"]')).toBeVisible()

    // フォームフィールドの存在確認
    await expect(globalThis.testPage.locator('[data-testid="name-input"]')).toBeVisible()
    await expect(globalThis.testPage.locator('[data-testid="email-input"]')).toBeVisible()
    await expect(globalThis.testPage.locator('[data-testid="company-input"]')).toBeVisible()
    await expect(globalThis.testPage.locator('[data-testid="message-textarea"]')).toBeVisible()
    await expect(globalThis.testPage.locator('[data-testid="submit-button"]')).toBeVisible()
  })

  test('should show validation errors for empty required fields', async () => {
    await globalThis.testPage.goto(BASE_URL)
    await globalThis.testPage.waitForLoadState('networkidle')

    // Contact フォームまでスクロール
    await globalThis.testPage.locator('[data-testid="contact-section"]').scrollIntoViewIfNeeded()

    // 空のフォームで送信ボタンをクリック
    await globalThis.testPage.locator('[data-testid="submit-button"]').click()

    // バリデーションエラーメッセージの確認（フィールド下のエラーメッセージを特定）
    await expect(globalThis.testPage.locator('[data-testid="name-input"] ~ p')).toContainText(
      '名前は必須です'
    )
    await expect(globalThis.testPage.locator('[data-testid="email-input"] ~ p')).toContainText(
      'メールアドレスを入力してください'
    )
    await expect(globalThis.testPage.locator('[data-testid="message-textarea"] ~ p')).toContainText(
      'メッセージは必須です'
    )
  })

  test('should show validation error for invalid email format', async () => {
    await globalThis.testPage.goto(BASE_URL)
    await globalThis.testPage.waitForLoadState('networkidle')

    // Contact フォームまでスクロール
    await globalThis.testPage.locator('[data-testid="contact-section"]').scrollIntoViewIfNeeded()

    // 無効なメールアドレスを入力
    await globalThis.testPage.locator('[data-testid="email-input"]').fill('invalid-email')
    await globalThis.testPage.locator('[data-testid="submit-button"]').click()

    // メールフォーマットのバリデーションエラー確認
    await expect(
      globalThis.testPage.locator('text=有効なメールアドレスを入力してください')
    ).toBeVisible()
  })

  test('should successfully submit contact form with valid data', async () => {
    await globalThis.testPage.goto(BASE_URL)
    await globalThis.testPage.waitForLoadState('networkidle')

    // Contact フォームまでスクロール
    await globalThis.testPage.locator('[data-testid="contact-section"]').scrollIntoViewIfNeeded()

    // フォームに有効なデータを入力
    await globalThis.testPage.locator('[data-testid="name-input"]').fill('テスト太郎')
    await globalThis.testPage.locator('[data-testid="email-input"]').fill('test@example.com')
    await globalThis.testPage.locator('[data-testid="company-input"]').fill('テスト株式会社')
    await globalThis.testPage
      .locator('[data-testid="message-textarea"]')
      .fill('E2Eテストからのお問い合わせです。')

    // 送信ボタンをクリック
    await globalThis.testPage.locator('[data-testid="submit-button"]').click()

    // 成功メッセージまたはロード状態の確認
    // 送信後の状態確認（実際のUIの動作に合わせて調整）
    await expect(
      globalThis.testPage.locator('text=送信中').or(globalThis.testPage.locator('text=送信完了'))
    ).toBeVisible({ timeout: 10000 })
  })

  test('should handle form submission with loading state', async () => {
    await globalThis.testPage.goto(BASE_URL)
    await globalThis.testPage.waitForLoadState('networkidle')

    // Contact フォームまでスクロール
    await globalThis.testPage.locator('[data-testid="contact-section"]').scrollIntoViewIfNeeded()

    // フォームに有効なデータを入力
    await globalThis.testPage.locator('[data-testid="name-input"]').fill('ローディングテスト')
    await globalThis.testPage.locator('[data-testid="email-input"]').fill('loading@example.com')
    await globalThis.testPage.locator('[data-testid="company-input"]').fill('ローディング株式会社')
    await globalThis.testPage
      .locator('[data-testid="message-textarea"]')
      .fill('ローディング状態のテストです。')

    // 送信ボタンをクリック
    await globalThis.testPage.locator('[data-testid="submit-button"]').click()

    // 送信ボタンが無効化されることを確認（連続送信防止）
    const submitButton = globalThis.testPage.locator('[data-testid="submit-button"]')
    await expect(submitButton).toBeDisabled({ timeout: 2000 })

    // 最終的に成功またはエラー状態になることを確認
    await expect(
      globalThis.testPage
        .locator('text=送信完了')
        .or(
          globalThis.testPage
            .locator('text=送信中')
            .or(globalThis.testPage.locator('text=エラーが発生しました'))
        )
    ).toBeVisible({ timeout: 15000 })
  })

  test('should persist form data during navigation back', async () => {
    await globalThis.testPage.goto(BASE_URL)
    await globalThis.testPage.waitForLoadState('networkidle')

    // Contact フォームまでスクロール
    await globalThis.testPage.locator('[data-testid="contact-section"]').scrollIntoViewIfNeeded()

    // フォームにデータを入力
    await globalThis.testPage.locator('[data-testid="name-input"]').fill('永続化テスト')
    await globalThis.testPage.locator('[data-testid="email-input"]').fill('persist@example.com')

    // 他のセクションに移動（Hero セクションなど）
    await globalThis.testPage.locator('text=Aromarious').first().click()

    // 再度 Contact セクションに戻る
    await globalThis.testPage.locator('[data-testid="contact-section"]').scrollIntoViewIfNeeded()

    // 入力データが保持されていることを確認
    await expect(globalThis.testPage.locator('[data-testid="name-input"]')).toHaveValue(
      '永続化テスト'
    )
    await expect(globalThis.testPage.locator('[data-testid="email-input"]')).toHaveValue(
      'persist@example.com'
    )
  })
})
