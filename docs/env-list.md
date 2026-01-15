# Environment Variables Comparison Report

## Summary

| Environment       | Variable Count |
| ----------------- | -------------- |
| Vercel Preview    | 34             |
| Vercel Production | 34             |
| Local (.envrc)    | 16             |
| Integration Test  | 13             |
| E2E Test          | 13             |
| Seed Test         | 13             |
| **Total Unique**  | **42**         |

## Detailed Comparison

| Variable                         | Vercel Preview         | Vercel Production      | Local                  | Integration            | E2E                    | Seed                   | Status   |
| -------------------------------- | ---------------------- | ---------------------- | ---------------------- | ---------------------- | ---------------------- | ---------------------- | -------- |
| `APP_NAME`                       |                        |                        | 🟦 portfolio02         | 🟦 portfolio02         | 🟦 portfolio02         | 🟦 portfolio02         | 🟢 同一  |
| `AUTH_SECRET`                    | 🟦 p+b\*\*\*mk=        | 🟦 p+b\*\*\*mk=        | 🟦 p+b\*\*\*mk=        | 🟦 p+b\*\*\*mk=        | 🟦 p+b\*\*\*mk=        | 🟦 p+b\*\*\*mk=        | 🟢 同一  |
| **`CRON_SECRET`** ⚠️             | 🟦 4HZ\*\*\*Kc=        | 🟦 4HZ\*\*\*Kc=        | 🟦 4HZ\*\*\*Kc=        |                        |                        |                        | 🟢 同一  |
| `DB_HOST`                        |                        |                        | 🟦 localhost           | 🟦 localhost           | 🟦 localhost           | 🟦 localhost           | 🟢 同一  |
| `DB_NAME`                        |                        |                        | 🟦 postgres            | 🟦 postgres            | 🟦 postgres            | 🟦 postgres            | 🟢 同一  |
| `DB_PASSWORD`                    |                        |                        | 🟦 \*\*\*              | 🟦 \*\*\*              | 🟦 \*\*\*              | 🟦 \*\*\*              | 🟢 同一  |
| `DB_PORT`                        |                        |                        | 🟦 5432                | 🟩 5433                | 🟩 5433                | 🟦 5432                | 🔀 2種類 |
| `DB_USER`                        |                        |                        | 🟦 postgres...fospigjv | 🟦 postgres...fospigjv | 🟦 postgres...fospigjv | 🟦 postgres...fospigjv | 🟢 同一  |
| `ENABLE_REAL_API_TESTS`          |                        |                        |                        | 🟦 true                | 🟦 true                | 🟦 true                | 🟢 同一  |
| `KV_REST_API_READ_ONLY_TOKEN`    | 🟦 AkA\*\*\*1vg        | 🟦 AkA\*\*\*1vg        |                        |                        |                        |                        | 🟢 同一  |
| `KV_REST_API_TOKEN`              | 🟦 AUA\*\*\*xMA        | 🟦 AUA\*\*\*xMA        | 🟦 AUA\*\*\*xMA        |                        |                        |                        | 🟢 同一  |
| `KV_REST_API_URL`                | 🟦 https://...stash.io | 🟦 https://...stash.io | 🟩 https://...tash.io/ |                        |                        |                        | 🔀 2種類 |
| `KV_URL`                         | 🟦 rediss:/....io:6379 | 🟦 rediss:/....io:6379 |                        |                        |                        |                        | 🟢 同一  |
| `NODE_ENV`                       |                        |                        |                        | 🟦 test                | 🟦 test                | 🟩 development         | 🔀 2種類 |
| **`NOTION_API_TOKEN`** ⚠️        | 🟦 ntn\*\*\*5Zz        | 🟦 ntn\*\*\*5Zz        | 🟦 ntn\*\*\*5Zz        | 🟦 ntn\*\*\*5Zz        | 🟦 ntn\*\*\*5Zz        | 🟦 ntn\*\*\*5Zz        | 🟢 同一  |
| **`NOTION_PARENT_PAGE_ID`** ⚠️   | 🟦 21d4fb77...a5dd67e6 | 🟩 21d4fb77...9bb32e2e | 🟦 21d4fb77...a5dd67e6 | 🟦 21d4fb77...a5dd67e6 | 🟦 21d4fb77...a5dd67e6 | 🟦 21d4fb77...a5dd67e6 | 🔀 2種類 |
| `NX_DAEMON`                      | 🟦 false               | 🟦 false               |                        |                        |                        |                        | 🟢 同一  |
| `POSTGRES_URL`                   | 🟦 pos\*\*\*cel        | 🟦 pos\*\*\*cel        | 🟩 pos\*\*\*res        | 🟩 pos\*\*\*res        | 🟩 pos\*\*\*res        | 🟩 pos\*\*\*res        | 🔀 2種類 |
| `REDIS_URL`                      | 🟦 red\*\*\*379        | 🟦 red\*\*\*379        |                        |                        |                        |                        | 🟢 同一  |
| `SECURITY_MODE`                  | 🟦 DRY_RUN             | 🟦 DRY_RUN             | 🟩 LIVE                |                        |                        |                        | 🔀 2種類 |
| **`SLACK_SECURITY_WEBHOOK`** ⚠️  | 🟦 htt\*\*\*LXh        | 🟩 htt\*\*\*2jA        | 🟦 htt\*\*\*LXh        |                        |                        |                        | 🔀 2種類 |
| **`SLACK_WEBHOOK_URL`** ⚠️       | 🟦 htt\*\*\*LXh        | 🟩 htt\*\*\*2jA        | 🟦 htt\*\*\*LXh        | 🟦 htt\*\*\*LXh        | 🟦 htt\*\*\*LXh        | 🟦 htt\*\*\*LXh        | 🔀 2種類 |
| `TURBO_CACHE`                    | 🟦 remote:rw           | 🟦 remote:rw           |                        |                        |                        |                        | 🟢 同一  |
| `TURBO_DOWNLOAD_LOCAL_ENABLED`   | 🟦 true                | 🟦 true                |                        |                        |                        |                        | 🟢 同一  |
| `TURBO_REMOTE_ONLY`              | 🟦 true                | 🟦 true                |                        |                        |                        |                        | 🟢 同一  |
| `TURBO_RUN_SUMMARY`              | 🟦 true                | 🟦 true                |                        |                        |                        |                        | 🟢 同一  |
| `VERCEL`                         | 🟦 1                   | 🟦 1                   |                        |                        |                        |                        | 🟢 同一  |
| `VERCEL_ENV`                     | 🟦 preview             | 🟩 production          |                        |                        |                        |                        | 🔀 2種類 |
| `VERCEL_GIT_COMMIT_AUTHOR_LOGIN` | 🟦                     | 🟦                     |                        |                        |                        |                        | 🟢 同一  |
| `VERCEL_GIT_COMMIT_AUTHOR_NAME`  | 🟦                     | 🟦                     |                        |                        |                        |                        | 🟢 同一  |
| `VERCEL_GIT_COMMIT_MESSAGE`      | 🟦                     | 🟦                     |                        |                        |                        |                        | 🟢 同一  |
| `VERCEL_GIT_COMMIT_REF`          | 🟦                     | 🟦                     |                        |                        |                        |                        | 🟢 同一  |
| `VERCEL_GIT_COMMIT_SHA`          | 🟦                     | 🟦                     |                        |                        |                        |                        | 🟢 同一  |
| `VERCEL_GIT_PREVIOUS_SHA`        | 🟦                     | 🟦                     |                        |                        |                        |                        | 🟢 同一  |
| `VERCEL_GIT_PROVIDER`            | 🟦                     | 🟦                     |                        |                        |                        |                        | 🟢 同一  |
| `VERCEL_GIT_PULL_REQUEST_ID`     | 🟦                     | 🟦                     |                        |                        |                        |                        | 🟢 同一  |
| `VERCEL_GIT_REPO_ID`             | 🟦                     | 🟦                     |                        |                        |                        |                        | 🟢 同一  |
| `VERCEL_GIT_REPO_OWNER`          | 🟦                     | 🟦                     |                        |                        |                        |                        | 🟢 同一  |
| `VERCEL_GIT_REPO_SLUG`           | 🟦                     | 🟦                     |                        |                        |                        |                        | 🟢 同一  |
| `VERCEL_OIDC_TOKEN`              | 🟦 eyJ\*\*\*NFg        | 🟩 eyJ\*\*\*pLg        |                        |                        |                        |                        | 🔀 2種類 |
| `VERCEL_TARGET_ENV`              | 🟦 preview             | 🟩 production          |                        |                        |                        |                        | 🔀 2種類 |
| `VERCEL_URL`                     | 🟦                     | 🟦                     |                        |                        |                        |                        | 🟢 同一  |

## Missing Variables Analysis

### Missing in Vercel (16)

- `APP_NAME`
- `AUTH_SECRET`
- `CRON_SECRET`
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `POSTGRES_URL`
- `SLACK_WEBHOOK_URL`
- `NOTION_API_TOKEN`
- `NOTION_PARENT_PAGE_ID`
- `SECURITY_MODE`
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `SLACK_SECURITY_WEBHOOK`

### Missing in Local (2)

- `preview`
- `production`

## Special Variables Analysis

### Database Configuration

| Variable       | Environment    | Purpose              |
| -------------- | -------------- | -------------------- |
| `POSTGRES_URL` | Local (Docker) | Development database |

---

_Report generated on 2025-07-07T01:10:46.083Z_
