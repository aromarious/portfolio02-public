import type { TRPCRouterRecord } from '@trpc/server'
import { waitUntil } from '@vercel/functions'
import { z } from 'zod'

import type { ContactFormInput } from '@aromarious/validators'
import { ContactRepository, PersonRepository } from '@aromarious/db'
import { ContactDomainService, ExternalSyncDomainService } from '@aromarious/domain'
import {
  NotionContactRepository,
  NotionPersonRepository,
  NotionService,
  SlackNotificationService,
} from '@aromarious/external'
import { contactFormInputSchema } from '@aromarious/validators'

import { ContactApplicationService } from '../application'
import { publicProcedure } from '../trpc'

export const contactRouter = {
  submit: publicProcedure.input(contactFormInputSchema).mutation(async ({ input, ctx }) => {
    console.time('⏱️ contact.submit total')

    // 型安全性のため入力データをキャスト
    const typedInput = input as ContactFormInput

    console.time('⏱️ contact.submit initialization')
    // リポジトリインスタンスを作成
    const personRepo = new PersonRepository(ctx.db)
    const contactRepo = new ContactRepository(ctx.db)

    // ドメインサービスとオーケストレーターを作成
    const contactDomainService = new ContactDomainService(personRepo, contactRepo)
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
      contactRepo,
      personRepo,
      notionService,
      notionContactRepo,
      notionPersonRepo,
      slackNotifier
    )

    // アプリケーションサービスを作成
    const contactApplicationService = new ContactApplicationService(
      contactDomainService,
      externalSyncDomainService
    )
    console.timeEnd('⏱️ contact.submit initialization')

    // アプリケーションサービス経由で問い合わせを処理（ハイブリッド方式）
    const result = await contactApplicationService.submitInquiry(
      {
        name: typedInput.name,
        email: typedInput.email,
        company: typedInput.company,
        twitterHandle: typedInput.twitterHandle,
        subject: typedInput.subject,
        message: typedInput.message,
        // リクエストから取得した実際の値を使用
        ipAddress: ctx.request.ipAddress,
        userAgent: ctx.request.userAgent,
        browserName: typedInput.browserName || 'unknown',
        browserVersion: typedInput.browserVersion || 'unknown',
        osName: typedInput.osName || 'unknown',
        deviceType: typedInput.deviceType || 'desktop',
        screenResolution: typedInput.screenResolution || 'unknown',
        timezone: typedInput.timezone || 'Asia/Tokyo',
        language: typedInput.language || 'ja',
        referer: ctx.request.referer || typedInput.referer || '',
        sessionId: typedInput.sessionId || 'unknown',
        formDuration: typedInput.formDuration || 0,
        previousVisitAt: typedInput.previousVisitAt || new Date(),
      },
      // Vercel waitUntilコールバック渡し（バックグラウンド処理用）
      (promise: Promise<void>) => {
        try {
          waitUntil(promise)
          console.log('✅ External service notification scheduled in background')
        } catch (error) {
          console.error('⚠️ waitUntil registration failed, falling back to sync:', error)
        }
      }
    )

    console.timeEnd('⏱️ contact.submit total')
    return result
  }),

  resyncUnsynced: publicProcedure
    .input(
      z.object({
        includeNotion: z.boolean().optional().default(true),
        includeSlack: z.boolean().optional().default(true),
        limit: z.number().min(1).max(100).optional().default(50),
        createdAfter: z.date().optional(),
        createdBefore: z.date().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // リポジトリインスタンスを作成
      const personRepo = new PersonRepository(ctx.db)
      const contactRepo = new ContactRepository(ctx.db)

      // TODO: 実装予定
      const result = {
        success: true,
        message: '再同期機能は実装予定です',
        processed: 0,
        errors: [],
      }

      return result
    }),
} satisfies TRPCRouterRecord
