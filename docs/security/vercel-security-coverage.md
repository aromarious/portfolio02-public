# Vercel自動セキュリティ保護範囲

## Vercelデプロイ時の自動防御状況

| 攻撃の種類                                                                 | 自動防御 | 対策レイヤー   | 備考                                 |
| -------------------------------------------------------------------------- | -------- | -------------- | ------------------------------------ |
| **DDoS攻撃**                                                               |          |                |                                      |
| [UDP Flood](./attacks/ddos-attacks.md#udp-flood)                           | ✅       | L3/L4          | L3/L4 DDoS保護で自動ブロック         |
| [SYN Flood](./attacks/ddos-attacks.md#syn-flood)                           | ✅       | L3/L4          | インフラ層で自動軽減                 |
| [ICMP Flood](./attacks/ddos-attacks.md#icmp-flood)                         | ✅       | L3/L4          | ネットワーク層で自動処理             |
| [HTTP Flood](./attacks/ddos-attacks.md#http-flood)                         | ⚠️       | L7             | 基本的な保護のみ、大規模攻撃は限定的 |
| [Slowloris](./attacks/ddos-attacks.md#slowloris)                           | ⚠️       | L4/L7          | 部分的な保護、完全ではない           |
| [POST攻撃](./attacks/ddos-attacks.md#post攻撃)                             | ⚠️       | L7             | 基本的な保護のみ                     |
| **Bot攻撃**                                                                |          |                |                                      |
| [スクレイピング](./attacks/bot-attacks.md#スクレイピング)                  | ❌       | L7             | 検知・ブロック機能なし               |
| [ブルートフォース](./attacks/bot-attacks.md#ブルートフォース)              | ❌       | L7             | レート制限なし                       |
| [スパム投稿](./attacks/bot-attacks.md#スパム投稿)                          | ❌       | L7             | 入力検証なし                         |
| [プロキシ経由攻撃](./attacks/bot-attacks.md#プロキシ経由攻撃)              | ❌       | L7             | IP制限なし                           |
| [分散型Bot](./attacks/bot-attacks.md#分散型bot)                            | ❌       | L7             | Bot検知機能なし                      |
| **API攻撃**                                                                |          |                |                                      |
| [認証バイパス](./attacks/api-attacks.md#認証バイパス)                      | ❌       | アプリ層       | アプリケーション層で対応必要         |
| [パラメータ改ざん](./attacks/api-attacks.md#パラメータ改ざん)              | ❌       | アプリ層       | 入力検証が必要                       |
| [N+1クエリ誘発](./attacks/api-attacks.md#n1クエリ誘発)                     | ❌       | アプリ層       | アプリケーション設計に依存           |
| [大量データ取得](./attacks/api-attacks.md#大量データ取得)                  | ❌       | L7/アプリ層    | レート制限が必要                     |
| **認証・認可攻撃**                                                         |          |                |                                      |
| [パスワード総当たり](./attacks/auth-attacks.md#パスワード総当たり)         | ❌       | L7             | レート制限が必要                     |
| [トークン推測](./attacks/auth-attacks.md#トークン推測)                     | ❌       | アプリ層       | アプリケーション側で対応             |
| [セッション固定](./attacks/auth-attacks.md#セッション固定)                 | ❌       | アプリ層       | セッション管理に依存                 |
| [セッションハイジャック](./attacks/auth-attacks.md#セッションハイジャック) | ⚠️       | L4/L7          | HTTPS強制のみ                        |
| **コード注入攻撃**                                                         |          |                |                                      |
| [Reflected XSS](./attacks/injection-attacks.md#reflected-xss)              | ❌       | L7/アプリ層    | CSP設定が必要                        |
| [Stored XSS](./attacks/injection-attacks.md#stored-xss)                    | ❌       | アプリ層       | 入力検証・サニタイゼーション必要     |
| [DOM-based XSS](./attacks/injection-attacks.md#dom-based-xss)              | ❌       | クライアント層 | クライアント側対応必要               |
| [SQL Injection](./attacks/injection-attacks.md#sql-injection)              | ❌       | アプリ層       | ORM使用やパラメータ化必要            |
| [UNION攻撃](./attacks/injection-attacks.md#union攻撃)                      | ❌       | アプリ層       | SQL Injection対策に含む              |
| [Command Injection](./attacks/injection-attacks.md#command-injection)      | ❌       | アプリ層       | 入力検証が必要                       |
| [Template Injection](./attacks/injection-attacks.md#template-injection)    | ❌       | アプリ層       | テンプレート処理の安全化必要         |

セキュリティ保護カバー範囲比較

各攻撃に対する保護状況

| 攻撃の種類                                                                 | Vercel自動 | 自製Middleware | Railway | Cloudflare | Arcjet |
| -------------------------------------------------------------------------- | ---------- | -------------- | ------- | ---------- | ------ |
| **DDoS攻撃**                                                               |            |                |         |            |        |
| [UDP Flood](./attacks/ddos-attacks.md#udp-flood)                           | ✅         | ❌             | ❌      | ✅         | ❌     |
| [SYN Flood](./attacks/ddos-attacks.md#syn-flood)                           | ✅         | ❌             | ❌      | ✅         | ❌     |
| [ICMP Flood](./attacks/ddos-attacks.md#icmp-flood)                         | ✅         | ❌             | ❌      | ✅         | ❌     |
| [HTTP Flood](./attacks/ddos-attacks.md#http-flood)                         | ⚠️         | ✅             | ❌      | ✅         | ✅     |
| [Slowloris](./attacks/ddos-attacks.md#slowloris)                           | ⚠️         | ⚠️             | ❌      | ✅         | ✅     |
| [POST攻撃](./attacks/ddos-attacks.md#post攻撃)                             | ⚠️         | ✅             | ❌      | ✅         | ✅     |
| **Bot攻撃**                                                                |            |                |         |            |        |
| [スクレイピング](./attacks/bot-attacks.md#スクレイピング)                  | ❌         | ✅             | ❌      | ⚠️         | ✅     |
| [ブルートフォース](./attacks/bot-attacks.md#ブルートフォース)              | ❌         | ✅             | ❌      | ⚠️         | ✅     |
| [スパム投稿](./attacks/bot-attacks.md#スパム投稿)                          | ❌         | ✅             | ❌      | ⚠️         | ✅     |
| [プロキシ経由攻撃](./attacks/bot-attacks.md#プロキシ経由攻撃)              | ❌         | ✅             | ❌      | ✅         | ✅     |
| [分散型Bot](./attacks/bot-attacks.md#分散型bot)                            | ❌         | ✅             | ❌      | ✅         | ✅     |
| **API攻撃**                                                                |            |                |         |            |        |
| [認証バイパス](./attacks/api-attacks.md#認証バイパス)                      | ❌         | ✅             | ❌      | ❌         | ⚠️     |
| [パラメータ改ざん](./attacks/api-attacks.md#パラメータ改ざん)              | ❌         | ⚠️             | ❌      | ❌         | ✅     |
| [N+1クエリ誘発](./attacks/api-attacks.md#n1クエリ誘発)                     | ❌         | ⚠️             | ❌      | ❌         | ❌     |
| [大量データ取得](./attacks/api-attacks.md#大量データ取得)                  | ❌         | ✅             | ❌      | ✅         | ✅     |
| **認証・認可攻撃**                                                         |            |                |         |            |        |
| [パスワード総当たり](./attacks/auth-attacks.md#パスワード総当たり)         | ❌         | ✅             | ❌      | ⚠️         | ✅     |
| [トークン推測](./attacks/auth-attacks.md#トークン推測)                     | ❌         | ✅             | ❌      | ❌         | ⚠️     |
| [セッション固定](./attacks/auth-attacks.md#セッション固定)                 | ❌         | ⚠️             | ❌      | ❌         | ❌     |
| [セッションハイジャック](./attacks/auth-attacks.md#セッションハイジャック) | ⚠️         | ⚠️             | ❌      | ✅         | ❌     |
| **コード注入攻撃**                                                         |            |                |         |            |        |
| [Reflected XSS](./attacks/injection-attacks.md#reflected-xss)              | ❌         | ⚠️             | ❌      | ⚠️         | ✅     |
| [Stored XSS](./attacks/injection-attacks.md#stored-xss)                    | ❌         | ❌             | ❌      | ❌         | ✅     |
| [DOM-based XSS](./attacks/injection-attacks.md#dom-based-xss)              | ❌         | ⚠️             | ❌      | ❌         | ❌     |
| [SQL Injection](./attacks/injection-attacks.md#sql-injection)              | ❌         | ⚠️             | ❌      | ⚠️         | ✅     |
| [UNION攻撃](./attacks/injection-attacks.md#union攻撃)                      | ❌         | ⚠️             | ❌      | ⚠️         | ✅     |
| [Command Injection](./attacks/injection-attacks.md#command-injection)      | ❌         | ⚠️             | ❌      | ⚠️         | ✅     |
| [Template Injection](./attacks/injection-attacks.md#template-injection)    | ❌         | ❌             | ❌      | ❌         | ✅     |

## 凡例

### 自動防御レベル

- ✅ **完全保護**: Vercelのインフラ層で自動的に防御
- ⚠️ **部分保護**: 基本的な防御はあるが、完全ではない
- ❌ **保護なし**: アプリケーション層での実装が必要

### 対策レイヤー

- **L3/L4**: ネットワーク・トランスポート層（インフラ対応）
- **L7**: アプリケーション層HTTP（Middleware・WAF対応）
- **アプリ層**: アプリケーションロジック層（コード実装必要）
- **クライアント層**: ブラウザ・フロントエンド側（CSP・JS対応）

## 結論

**Vercelで自動保護されるのは主にインフラ層（L3/L4）のDDoS攻撃のみ**。アプリケーション層の攻撃に対しては、Next.js Middlewareやライブラリを使った追加実装が必要です。

## 追加実装が必要な主要項目

1. **レート制限**: `@upstash/ratelimit` + Next.js Middleware
2. **Bot検知**: Arcjet等のサードパーティサービス
3. **入力検証**: Zod schema + サニタイゼーション
4. **セキュリティヘッダー**: CSP, XSS Protection等
5. **認証保護**: better-auth + セッション管理
