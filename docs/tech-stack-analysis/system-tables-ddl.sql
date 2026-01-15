-- システム情報管理テーブル
CREATE TABLE system_info (
    system_id VARCHAR(50) PRIMARY KEY,
    system_name VARCHAR(200) NOT NULL,
    system_type VARCHAR(100),
    description TEXT,
    technology_stack TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- システム別回答管理テーブル
CREATE TABLE system_responses (
    response_id INTEGER PRIMARY KEY,
    system_id VARCHAR(50) NOT NULL,
    question_id INTEGER NOT NULL,
    is_implemented BOOLEAN DEFAULT FALSE,
    implementation_status VARCHAR(50),
    implementation_details TEXT,
    priority VARCHAR(20),
    response_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (system_id) REFERENCES system_info(system_id),
    FOREIGN KEY (question_id) REFERENCES question_master(question_id),
    UNIQUE (system_id, question_id)
);

-- システム情報の初期データ
INSERT INTO system_info (system_id, system_name, system_type, description, technology_stack) VALUES
('pf1', 'ポートフォリオサイト（ContactFormシステム）', '個人開発・ポートフォリオ', 
 '企業レベルのContactFormシステムを実装したポートフォリオサイト。99.9%高速化されたセキュリティシステム、確実な外部サービス連携を実現。',
 'T3 Turbo, Next.js 15, React 19, TypeScript, tRPC v11, Drizzle ORM, PostgreSQL, Redis, Vercel'),
('general_web', '一般的なWebシステム', '企業・中規模Webアプリケーション',
 '一般的な企業向けWebアプリケーションの標準的な実装',
 '様々な技術スタック'),
('startup_mvp', 'スタートアップMVP', 'スタートアップ・MVP',
 'スピード重視のMVP開発における実装',
 'Next.js, Firebase/Supabase, Vercel/Netlify');

-- インデックスの作成
CREATE INDEX idx_system_responses_system_id ON system_responses(system_id);
CREATE INDEX idx_system_responses_question_id ON system_responses(question_id);
CREATE INDEX idx_system_responses_is_implemented ON system_responses(is_implemented);