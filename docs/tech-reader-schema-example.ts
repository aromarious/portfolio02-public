// TechReader用のDrizzleスキーマ設計例
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import { foreignKey, index, pgTable, uniqueIndex } from 'drizzle-orm/pg-core'
import { z } from 'zod/v4'

// better-authのUsersテーブルを参照
// 実際の実装時は @aromarious/auth から import
// import { UserTable } from '@aromarious/auth'

// 書籍マスターテーブル（全ユーザー共通）
export const BookMasterTable = pgTable(
  'book_master',
  (t) => ({
    id: t.uuid('id').notNull().primaryKey().defaultRandom(),
    isbn: t.varchar('isbn', { length: 20 }), // ISBN（重複防止キー）
    title: t.varchar('title', { length: 255 }).notNull(),
    author: t.varchar('author', { length: 255 }),
    publisher: t.varchar('publisher', { length: 255 }),
    description: t.text('description'),
    publishedYear: t.integer('published_year'),
    totalPages: t.integer('total_pages'),
    language: t.varchar('language', { length: 10 }).default('ja'),
    createdAt: t.timestamp('created_at').defaultNow().notNull(),
    updatedAt: t
      .timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  }),
  (table) => [
    uniqueIndex('book_master_isbn_unique').on(table.isbn),
    index('book_master_title_idx').on(table.title),
  ],
)

// ユーザー個別の書籍管理
export const UserBookTable = pgTable(
  'user_book',
  (t) => ({
    id: t.uuid('id').notNull().primaryKey().defaultRandom(),
    userId: t.uuid('user_id').notNull(), // UserTable.id を参照
    bookMasterId: t.uuid('book_master_id').references(() => BookMasterTable.id),

    // ユーザー独自設定
    customTitle: t.varchar('custom_title', { length: 255 }), // 独自タイトル（任意）
    personalNotes: t.text('personal_notes'), // 書籍全体への個人メモ
    targetCompletionDate: t.date('target_completion_date'), // 読了目標日
    priority: t.varchar('priority', { length: 10 }).default('normal'), // high/normal/low

    // 手動入力用（book_master_idがnullの場合）
    manualTitle: t.varchar('manual_title', { length: 255 }),
    manualAuthor: t.varchar('manual_author', { length: 255 }),

    createdAt: t.timestamp('created_at').defaultNow().notNull(),
    updatedAt: t
      .timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  }),
  (table) => [
    // 外部キー制約
    foreignKey({
      columns: [table.userId],
      foreignColumns: [
        /* UserTable.id */
      ], // 実装時はUserTableを参照
      name: 'user_book_user_id_fk',
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
    foreignKey({
      columns: [table.bookMasterId],
      foreignColumns: [BookMasterTable.id],
      name: 'user_book_book_master_fk',
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
    // 同じユーザーが同じ書籍マスターを重複登録防止
    uniqueIndex('user_book_user_master_unique').on(table.userId, table.bookMasterId),
    index('user_book_user_id_idx').on(table.userId),
  ],
)

// ユーザー個別のセクション管理
export const UserBookSectionTable = pgTable(
  'user_book_section',
  (t) => ({
    id: t.uuid('id').notNull().primaryKey().defaultRandom(),
    userBookId: t
      .uuid('user_book_id')
      .notNull()
      .references(() => UserBookTable.id),

    title: t.varchar('title', { length: 255 }).notNull(),
    sectionNumber: t.varchar('section_number', { length: 20 }), // "1", "1-1", "コラム1"
    description: t.text('description'), // セクションの説明

    // コード有無・難易度
    hasCode: t.boolean('has_code').default(false),
    difficulty: t.varchar('difficulty', { length: 10 }), // easy/medium/hard
    estimatedMinutes: t.integer('estimated_minutes'), // 読了予想時間

    // 順序管理
    sortOrder: t.integer('sort_order').default(0), // 表示順序

    createdAt: t.timestamp('created_at').defaultNow().notNull(),
    updatedAt: t
      .timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  }),
  (table) => [
    foreignKey({
      columns: [table.userBookId],
      foreignColumns: [UserBookTable.id],
      name: 'user_book_section_user_book_fk',
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
    // 同じ書籍内でのセクション番号重複防止
    uniqueIndex('user_book_section_number_unique').on(table.userBookId, table.sectionNumber),
    index('user_book_section_user_book_idx').on(table.userBookId),
    index('user_book_section_sort_order_idx').on(table.userBookId, table.sortOrder),
  ],
)

// 読書進捗管理
export const ReadingProgressTable = pgTable(
  'reading_progress',
  (t) => ({
    id: t.uuid('id').notNull().primaryKey().defaultRandom(),
    userId: t.uuid('user_id').notNull(), // UserTable.id を参照
    userBookId: t
      .uuid('user_book_id')
      .notNull()
      .references(() => UserBookTable.id),
    sectionId: t
      .uuid('section_id')
      .notNull()
      .references(() => UserBookSectionTable.id),

    // 進捗状況
    status: t.varchar('status', { length: 20 }).default('unread'), // unread/reading/completed/skipped

    // TechReaderの核となる機能
    codeExecuted: t.boolean('code_executed').default(false),
    understanding: t.integer('understanding'), // 1-5段階

    // 学習記録
    notes: t.text('notes'),
    reviewFlag: t.boolean('review_flag').default(false),

    // 時間管理
    startedAt: t.timestamp('started_at'),
    completedAt: t.timestamp('completed_at'),
    timeSpentMinutes: t.integer('time_spent_minutes'), // 実際の学習時間

    createdAt: t.timestamp('created_at').defaultNow().notNull(),
    updatedAt: t
      .timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  }),
  (table) => [
    // 外部キー制約
    foreignKey({
      columns: [table.userId],
      foreignColumns: [
        /* UserTable.id */
      ], // 実装時はUserTableを参照
      name: 'reading_progress_user_id_fk',
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
    foreignKey({
      columns: [table.userBookId],
      foreignColumns: [UserBookTable.id],
      name: 'reading_progress_user_book_fk',
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
    foreignKey({
      columns: [table.sectionId],
      foreignColumns: [UserBookSectionTable.id],
      name: 'reading_progress_section_fk',
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
    // 同じユーザー・セクションの進捗は1つまで
    uniqueIndex('reading_progress_user_section_unique').on(table.userId, table.sectionId),
    index('reading_progress_user_id_idx').on(table.userId),
    index('reading_progress_review_flag_idx').on(table.userId, table.reviewFlag),
    index('reading_progress_status_idx').on(table.userId, table.status),
  ],
)

// 学習統計・分析用（将来拡張）
export const LearningStatsTable = pgTable(
  'learning_stats',
  (t) => ({
    id: t.uuid('id').notNull().primaryKey().defaultRandom(),
    userId: t.uuid('user_id').notNull(),
    userBookId: t
      .uuid('user_book_id')
      .notNull()
      .references(() => UserBookTable.id),

    // 統計データ
    totalSections: t.integer('total_sections').default(0),
    completedSections: t.integer('completed_sections').default(0),
    codeExecutedSections: t.integer('code_executed_sections').default(0),
    averageUnderstanding: t.numeric('average_understanding', { precision: 3, scale: 2 }),
    totalTimeMinutes: t.integer('total_time_minutes').default(0),

    // 日付
    lastStudiedAt: t.timestamp('last_studied_at'),

    createdAt: t.timestamp('created_at').defaultNow().notNull(),
    updatedAt: t
      .timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  }),
  (table) => [
    // 外部キー制約
    foreignKey({
      columns: [table.userId],
      foreignColumns: [
        /* UserTable.id */
      ], // 実装時はUserTableを参照
      name: 'learning_stats_user_id_fk',
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
    foreignKey({
      columns: [table.userBookId],
      foreignColumns: [UserBookTable.id],
      name: 'learning_stats_user_book_fk',
    })
      .onDelete('cascade')
      .onUpdate('cascade'),
    uniqueIndex('learning_stats_user_book_unique').on(table.userId, table.userBookId),
    index('learning_stats_user_id_idx').on(table.userId),
  ],
)

// Type definitions
export type BookMasterSelectModel = InferSelectModel<typeof BookMasterTable>
export type BookMasterInsertModel = InferInsertModel<typeof BookMasterTable>

export type UserBookSelectModel = InferSelectModel<typeof UserBookTable>
export type UserBookInsertModel = InferInsertModel<typeof UserBookTable>

export type UserBookSectionSelectModel = InferSelectModel<typeof UserBookSectionTable>
export type UserBookSectionInsertModel = InferInsertModel<typeof UserBookSectionTable>

export type ReadingProgressSelectModel = InferSelectModel<typeof ReadingProgressTable>
export type ReadingProgressInsertModel = InferInsertModel<typeof ReadingProgressTable>

export type LearningStatsSelectModel = InferSelectModel<typeof LearningStatsTable>
export type LearningStatsInsertModel = InferInsertModel<typeof LearningStatsTable>

// Validation schemas（Zodでバリデーション用）
export const CreateUserBookSchema = z.object({
  bookMasterId: z.string().uuid().optional(),
  customTitle: z.string().max(255).optional(),
  personalNotes: z.string().optional(),
  targetCompletionDate: z.date().optional(),
  priority: z.enum(['high', 'normal', 'low']).default('normal'),

  // 手動入力用
  manualTitle: z.string().max(255).optional(),
  manualAuthor: z.string().max(255).optional(),
})

export const CreateSectionSchema = z.object({
  title: z.string().min(1).max(255),
  sectionNumber: z.string().max(20),
  description: z.string().optional(),
  hasCode: z.boolean().default(false),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  estimatedMinutes: z.number().int().positive().optional(),
  sortOrder: z.number().int().default(0),
})

export const UpdateProgressSchema = z.object({
  status: z.enum(['unread', 'reading', 'completed', 'skipped']).default('unread'),
  codeExecuted: z.boolean().default(false),
  understanding: z.number().int().min(1).max(5).optional(),
  notes: z.string().optional(),
  reviewFlag: z.boolean().default(false),
  timeSpentMinutes: z.number().int().positive().optional(),
})
