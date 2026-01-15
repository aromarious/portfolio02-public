#!/usr/bin/env node
/**
 * Environment Variables Comparison Script
 * Compares Vercel environment variables with local .envrc files
 *
 * Usage:
 *   node tooling/scripts/compare-env-vars.js                    # Markdown with resolved secrets (default)
 *   node tooling/scripts/compare-env-vars.js --console          # Console output
 *   node tooling/scripts/compare-env-vars.js --no-secrets       # Markdown without resolving secrets
 *
 * This script:
 * 1. Reads Vercel environment variables from .env.vercel
 * 2. Reads local environment variables from .envrc and test files
 * 3. Compares variables and shows differences
 * 4. Identifies missing variables in each environment
 * 5. Optionally outputs results as markdown table
 */

const fs = require('node:fs')
const path = require('node:path')
const { execSync } = require('node:child_process')

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
}

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`
}

function parseEnvFile(filePath, resolveSecrets = false) {
  if (!fs.existsSync(filePath)) {
    console.warn(colorize(`⚠️  File not found: ${filePath}`, 'yellow'))
    return {}
  }

  const content = fs.readFileSync(filePath, 'utf8')
  const vars = {}

  // Parse environment variables from file
  const lines = content.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()

    // Skip comments and empty lines
    if (trimmed.startsWith('#') || !trimmed) continue

    // Match export VAR=value or VAR=value patterns
    const match = trimmed.match(/^(?:export\s+)?([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (match) {
      const [, key, value] = match

      // Remove inline comments (everything after # outside of quotes)
      let cleanValue = value

      // Simple comment removal - split on # and take first part, then trim
      // This handles: VAR=value # comment
      // But preserves: VAR="value with # in quotes"
      if (!cleanValue.startsWith('"') && !cleanValue.startsWith("'")) {
        const commentIndex = cleanValue.indexOf('#')
        if (commentIndex !== -1) {
          cleanValue = cleanValue.substring(0, commentIndex).trim()
        }
      }

      // Remove quotes and handle special cases
      cleanValue = cleanValue.replace(/^["']|["']$/g, '')

      // Handle command substitution like $(security find-generic-password ...)
      if (cleanValue.includes('$(security find-generic-password')) {
        if (resolveSecrets) {
          try {
            // Extract the keychain command and execute it
            const keychainMatch = cleanValue.match(/\$\(security find-generic-password[^)]+\)/)
            if (keychainMatch) {
              const command = keychainMatch[0].slice(2, -1) // Remove $( and )
              const result = execSync(command, { encoding: 'utf-8' }).trim()
              cleanValue = result
            }
          } catch (error) {
            cleanValue = '[KEYCHAIN_ERROR]'
          }
        } else {
          cleanValue = '[KEYCHAIN_SECRET]'
        }
      } else if (cleanValue.includes('$(')) {
        if (resolveSecrets) {
          try {
            // Try to execute the command substitution
            const commandMatch = cleanValue.match(/\$\(([^)]+)\)/)
            if (commandMatch) {
              const command = commandMatch[1]
              const result = execSync(command, { encoding: 'utf-8' }).trim()
              cleanValue = cleanValue.replace(commandMatch[0], result)
            }
          } catch (error) {
            cleanValue = '[COMMAND_ERROR]'
          }
        } else {
          cleanValue = '[COMMAND_SUBSTITUTION]'
        }
      }

      // Handle environment variable substitution
      if (cleanValue.includes('${') && cleanValue.includes('}')) {
        if (resolveSecrets) {
          // Try to resolve environment variables
          cleanValue = cleanValue.replace(/\$\{([^}]+)\}/g, (match, varName) => {
            return process.env[varName] || vars[varName] || match
          })
        } else {
          cleanValue = '[VARIABLE_SUBSTITUTION]'
        }
      }

      vars[key] = cleanValue
    }
  }

  return vars
}

function getVercelVars(resolveSecrets = false, forcePull = false) {
  const environments = ['preview', 'production']
  const vercelVars = {}
  let hasAnyVars = false

  for (const env of environments) {
    try {
      // If forcePull is false, try to use existing .env.{environment} files first
      if (!forcePull) {
        const existingFile = path.join(process.cwd(), `.env.${env}`)
        if (fs.existsSync(existingFile)) {
          const envVars = parseEnvFile(existingFile, resolveSecrets)
          vercelVars[env] = envVars
          hasAnyVars = true
          continue
        }
      }

      // Try to pull environment variables from Vercel
      const tempFile = path.join(process.cwd(), `.env.vercel.${env}`)

      try {
        execSync(`vercel env pull ${tempFile} --environment ${env}`, {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
        })

        if (fs.existsSync(tempFile)) {
          const envVars = parseEnvFile(tempFile, resolveSecrets)
          vercelVars[env] = envVars
          hasAnyVars = true

          // Clean up temporary file
          fs.unlinkSync(tempFile)
        }
      } catch (pullError) {
        // If pull fails, try to use existing file for current environment
        if (env === 'preview') {
          const existingFile = path.join(process.cwd(), '.env.vercel')
          if (fs.existsSync(existingFile)) {
            const existingVars = parseEnvFile(existingFile, resolveSecrets)
            // Check if this is indeed preview environment
            if (existingVars.VERCEL_ENV === 'preview') {
              vercelVars[env] = existingVars
              hasAnyVars = true
            }
          }
        }
        vercelVars[env] = {}
      }
    } catch (error) {
      vercelVars[env] = {}
    }
  }

  // If no variables were found at all, fallback to existing .env.vercel
  if (!hasAnyVars) {
    const vercelFile = path.join(process.cwd(), '.env.vercel')
    if (fs.existsSync(vercelFile)) {
      const fallbackVars = parseEnvFile(vercelFile, resolveSecrets)
      const detectedEnv = fallbackVars.VERCEL_ENV || 'preview'
      vercelVars[detectedEnv] = fallbackVars
    }
  }

  return vercelVars
}

function getLocalVars(resolveSecrets = false) {
  const envrcFile = path.join(process.cwd(), '.envrc')
  return parseEnvFile(envrcFile, resolveSecrets)
}

function getTestVars(resolveSecrets = false) {
  const testFiles = [
    'tooling/vitest/setup/.envrc.test.integration',
    'tooling/vitest/setup/.envrc.test.e2e',
    'tooling/vitest/setup/.envrc.test.seed',
  ]

  const testVars = {}

  for (const file of testFiles) {
    const filePath = path.join(process.cwd(), file)
    const vars = parseEnvFile(filePath, resolveSecrets)
    const testType = path.basename(file).replace('.envrc.test.', '')
    testVars[testType] = vars
  }

  return testVars
}

function categorizeValues(values, key) {
  // values: array of [vercelDev, vercelPreview, vercelProd, local, integration, e2e, seed]
  const definedValues = values.filter((v) => v !== undefined)
  if (definedValues.length === 0) {
    return { uniqueValues: [], valueToEmoji: {} }
  }

  // Get unique values (masked for comparison)
  const maskedValues = definedValues.map((v) => maskSensitiveValue(key, v))
  const uniqueValues = [...new Set(maskedValues)]

  // Assign emojis to each unique value
  const emojis = ['🟦', '🟩', '🟨', '🟪', '🟫', '⬛', '⬜']
  const valueToEmoji = {}

  uniqueValues.forEach((value, index) => {
    valueToEmoji[value] = emojis[index] || '🔸'
  })

  return { uniqueValues, valueToEmoji }
}

function formatDetailedValue(value, key) {
  if (value === undefined) return ''

  const masked = maskSensitiveValue(key, value)
  const withInvisibles = formatValueWithInvisibles(masked)

  if (withInvisibles.length <= 20) {
    return withInvisibles
  }

  // Show first 8 + ... + last 8 characters
  const start = withInvisibles.slice(0, 8)
  const end = withInvisibles.slice(-8)
  return `${start}...${end}`
}

function maskSensitiveValue(key, value, showMasked = true) {
  const sensitiveKeys = [
    'AUTH_SECRET',
    'CRON_SECRET',
    'PASSWORD',
    'TOKEN',
    'SECRET',
    'KEY',
    'WEBHOOK',
    'POSTGRES_URL',
    'REDIS_URL',
    'KV_REST_API_TOKEN',
    'VERCEL_OIDC_TOKEN',
  ]

  const isSensitive = sensitiveKeys.some((sensitive) => key.includes(sensitive))

  if (
    isSensitive &&
    value &&
    value !== '[KEYCHAIN_SECRET]' &&
    value !== '[COMMAND_SUBSTITUTION]' &&
    showMasked
  ) {
    // Show first 3 and last 3 characters for debugging
    if (value.length > 10) {
      return `${value.slice(0, 3)}***${value.slice(-3)}`
    }
    return '***'
  }

  return value
}

function formatValueWithInvisibles(value) {
  if (!value) return value

  // Replace invisible characters with visible representations
  return value
    .replace(/\\n/g, '\\n🔸') // Escaped newline with indicator
    .replace(/\\r/g, '\\r🔸') // Escaped carriage return with indicator
    .replace(/\\t/g, '\\t🔸') // Escaped tab with indicator
    .replace(/\n/g, '\\n🔸') // Actual newline with indicator
    .replace(/\r/g, '\\r🔸') // Actual carriage return with indicator
    .replace(/\t/g, '\\t🔸') // Actual tab with indicator
    .replace(/\0/g, '\\0🔸') // Null character with indicator
    .replace(/\s$/g, (match) => `${match}🔹`) // Trailing whitespace with indicator
}

function hasInvisibleCharacters(value) {
  if (!value) return false
  return /[\n\r\t\0]|\\[nrt0]|\s$/.test(value)
}

function compareSecretValues(vercelValue, localValue) {
  // Direct comparison for exact match
  if (vercelValue === localValue) {
    return '✅ Identical'
  }

  // Handle common differences
  if (vercelValue && localValue) {
    // Remove trailing newlines and whitespace
    const vercelClean = vercelValue.replace(/\\n|\n/g, '').trim()
    const localClean = localValue.replace(/\\n|\n/g, '').trim()

    if (vercelClean === localClean) {
      return '✅ Same (whitespace diff)'
    }

    // Check if one is a subset of the other (base64 padding differences)
    if (vercelClean.replace(/=+$/, '') === localClean.replace(/=+$/, '')) {
      return '✅ Same (padding diff)'
    }

    return '❌ Different values'
  }

  return '❌ Different values'
}

function compareVariables(vercelVars, localVars, testVars) {
  // Flatten Vercel vars from {development: {...}, preview: {...}, production: {...}} structure
  const allVercelKeys = new Set()
  Object.values(vercelVars).forEach((envVars) => {
    Object.keys(envVars).forEach((key) => allVercelKeys.add(key))
  })

  const allKeys = new Set([
    ...allVercelKeys,
    ...Object.keys(localVars),
    ...Object.keys(testVars.integration || {}),
    ...Object.keys(testVars.e2e || {}),
    ...Object.keys(testVars.seed || {}),
  ])

  console.log(colorize('📊 ENVIRONMENT VARIABLES COMPARISON', 'bold'))
  console.log(colorize('='.repeat(80), 'dim'))
  console.log()

  // Summary stats
  console.log(colorize('📈 SUMMARY', 'bold'))
  console.log(colorize('-'.repeat(40), 'dim'))
  console.log(`${colorize('Vercel variables:', 'cyan')} ${Object.keys(vercelVars).length}`)
  console.log(`${colorize('Local (.envrc) variables:', 'cyan')} ${Object.keys(localVars).length}`)
  console.log(
    `${colorize('Integration test variables:', 'cyan')} ${Object.keys(testVars.integration || {}).length}`
  )
  console.log(
    `${colorize('E2E test variables:', 'cyan')} ${Object.keys(testVars.e2e || {}).length}`
  )
  console.log(
    `${colorize('Seed test variables:', 'cyan')} ${Object.keys(testVars.seed || {}).length}`
  )
  console.log(`${colorize('Total unique variables:', 'cyan')} ${allKeys.size}`)
  console.log()

  // Detailed comparison
  console.log(colorize('🔍 DETAILED COMPARISON', 'bold'))
  console.log(colorize('-'.repeat(80), 'dim'))

  const sortedKeys = Array.from(allKeys).sort()

  for (const key of sortedKeys) {
    // Get Vercel values from each environment
    const vercelDev = vercelVars.development?.[key]
    const vercelPreview = vercelVars.preview?.[key]
    const vercelProd = vercelVars.production?.[key]

    const localValue = localVars[key]
    const integrationValue = testVars.integration?.[key]
    const e2eValue = testVars.e2e?.[key]
    const seedValue = testVars.seed?.[key]

    console.log(colorize(`\n📋 ${key}`, 'bold'))

    // Show Vercel values for each environment
    if (vercelDev !== undefined) {
      console.log(
        `  ${colorize('Vercel Dev:', 'green')} ${formatValueWithInvisibles(maskSensitiveValue(key, vercelDev))}`
      )
    } else {
      console.log(`  ${colorize('Vercel Dev:', 'red')} ${colorize('MISSING', 'red')}`)
    }

    if (vercelPreview !== undefined) {
      console.log(
        `  ${colorize('Vercel Preview:', 'green')} ${formatValueWithInvisibles(maskSensitiveValue(key, vercelPreview))}`
      )
    } else {
      console.log(`  ${colorize('Vercel Preview:', 'red')} ${colorize('MISSING', 'red')}`)
    }

    if (vercelProd !== undefined) {
      console.log(
        `  ${colorize('Vercel Prod:', 'green')} ${formatValueWithInvisibles(maskSensitiveValue(key, vercelProd))}`
      )
    } else {
      console.log(`  ${colorize('Vercel Prod:', 'red')} ${colorize('MISSING', 'red')}`)
    }

    if (localValue !== undefined) {
      console.log(`  ${colorize('Local:', 'blue')} ${maskSensitiveValue(key, localValue)}`)
    } else {
      console.log(`  ${colorize('Local:', 'red')} ${colorize('MISSING', 'red')}`)
    }

    if (integrationValue !== undefined) {
      console.log(
        `  ${colorize('Integration:', 'magenta')} ${maskSensitiveValue(key, integrationValue)}`
      )
    } else {
      console.log(`  ${colorize('Integration:', 'dim')} ${colorize('not set', 'dim')}`)
    }

    if (e2eValue !== undefined) {
      console.log(`  ${colorize('E2E:', 'cyan')} ${maskSensitiveValue(key, e2eValue)}`)
    } else {
      console.log(`  ${colorize('E2E:', 'dim')} ${colorize('not set', 'dim')}`)
    }

    if (seedValue !== undefined) {
      console.log(`  ${colorize('Seed:', 'yellow')} ${maskSensitiveValue(key, seedValue)}`)
    } else {
      console.log(`  ${colorize('Seed:', 'dim')} ${colorize('not set', 'dim')}`)
    }

    // Value comparison status
    const hasAnyVercel =
      vercelDev !== undefined || vercelPreview !== undefined || vercelProd !== undefined
    const hasLocal = localValue !== undefined

    if (hasAnyVercel && hasLocal) {
      // Check if Vercel environments are consistent
      const vercelValues = [vercelDev, vercelPreview, vercelProd].filter((v) => v !== undefined)
      const uniqueVercelValues = [...new Set(vercelValues.map((v) => maskSensitiveValue(key, v)))]
      const localDisplay = maskSensitiveValue(key, localValue)

      if (uniqueVercelValues.length === 1 && uniqueVercelValues[0] === localDisplay) {
        console.log(`  ${colorize('Status:', 'green')} ${colorize('✅ ALL MATCH', 'green')}`)
      } else if (uniqueVercelValues.length > 1) {
        console.log(
          `  ${colorize('Status:', 'yellow')} ${colorize('⚠️  VERCEL ENVIRONMENTS DIFFER', 'yellow')}`
        )
      } else {
        console.log(
          `  ${colorize('Status:', 'yellow')} ${colorize('⚠️  VERCEL ≠ LOCAL', 'yellow')}`
        )
      }
    } else if (hasAnyVercel && !hasLocal) {
      console.log(`  ${colorize('Status:', 'red')} ${colorize('❌ MISSING IN LOCAL', 'red')}`)
    } else if (!hasAnyVercel && hasLocal) {
      console.log(`  ${colorize('Status:', 'red')} ${colorize('❌ MISSING IN VERCEL', 'red')}`)
    }
  }

  console.log()
  console.log(colorize('🔍 ANALYSIS COMPLETE', 'bold'))
  console.log(colorize('='.repeat(80), 'dim'))

  // Missing variables summary
  const missingInVercel = Object.keys(localVars).filter(
    (key) =>
      !vercelVars.development?.[key] && !vercelVars.preview?.[key] && !vercelVars.production?.[key]
  )
  const missingInLocal = [...allVercelKeys].filter((key) => !localVars[key])

  if (missingInVercel.length > 0) {
    console.log(colorize(`\n❌ Missing in Vercel (${missingInVercel.length}):`, 'red'))
    missingInVercel.forEach((key) => console.log(`  • ${key}`))
  }

  if (missingInLocal.length > 0) {
    console.log(colorize(`\n❌ Missing in Local (${missingInLocal.length}):`, 'red'))
    missingInLocal.forEach((key) => console.log(`  • ${key}`))
  }

  if (missingInVercel.length === 0 && missingInLocal.length === 0) {
    console.log(colorize('\n✅ All variables are present in both environments', 'green'))
  }
}

// Special variables analysis
function analyzeSpecialVariables(vercelVars, localVars) {
  console.log(colorize('\n🔧 SPECIAL VARIABLES ANALYSIS', 'bold'))
  console.log(colorize('-'.repeat(80), 'dim'))

  // Database URLs
  const dbVars = ['POSTGRES_URL', 'REDIS_URL', 'KV_URL']
  for (const dbVar of dbVars) {
    if (vercelVars[dbVar] && localVars[dbVar]) {
      console.log(`\n${colorize(`${dbVar}:`, 'cyan')}`)
      console.log(`  Vercel: ${maskSensitiveValue(dbVar, vercelVars[dbVar])}`)
      console.log(`  Local:  ${maskSensitiveValue(dbVar, localVars[dbVar])}`)

      // Check if they're different environments
      if (vercelVars[dbVar].includes('supabase') && localVars[dbVar].includes('localhost')) {
        console.log(
          `  ${colorize('Status:', 'green')} ${colorize('✓ Expected difference (Cloud vs Local)', 'green')}`
        )
      }
    }
  }

  // Webhook URLs
  const webhookVars = ['SLACK_WEBHOOK_URL', 'SLACK_SECURITY_WEBHOOK']
  for (const webhookVar of webhookVars) {
    if (vercelVars[webhookVar] && localVars[webhookVar]) {
      console.log(`\n${colorize(`${webhookVar}:`, 'cyan')}`)
      console.log(`  Vercel: ${maskSensitiveValue(webhookVar, vercelVars[webhookVar])}`)
      console.log(`  Local:  ${maskSensitiveValue(webhookVar, localVars[webhookVar])}`)
    }
  }

  // Secrets
  const secretVars = ['AUTH_SECRET', 'CRON_SECRET']
  for (const secretVar of secretVars) {
    if (vercelVars[secretVar] && localVars[secretVar]) {
      console.log(`\n${colorize(`${secretVar}:`, 'cyan')}`)
      console.log(`  Vercel: ${maskSensitiveValue(secretVar, vercelVars[secretVar])}`)
      console.log(`  Local:  ${maskSensitiveValue(secretVar, localVars[secretVar])}`)

      // Check for common issues
      if (vercelVars[secretVar].includes('\\n') || vercelVars[secretVar].includes('\n')) {
        console.log(
          `  ${colorize('Warning:', 'yellow')} ${colorize('Vercel value contains newline characters', 'yellow')}`
        )
      }
    }
  }
}

// Markdown table generation with secret resolution
function generateMarkdownTable(
  vercelVars,
  localVars,
  testVars,
  resolveSecrets = false,
  isDetailedMode = false
) {
  // If resolveSecrets is true, re-fetch local vars with secrets resolved
  if (resolveSecrets) {
    localVars = getLocalVars(true)
    testVars = getTestVars(true)
  }
  // Handle both old single vercel vars and new multi-environment structure
  const vercelEnvs = Object.keys(vercelVars)
  const allVercelKeys = new Set()

  // Collect all keys from all Vercel environments
  for (const env of vercelEnvs) {
    if (vercelVars[env] && typeof vercelVars[env] === 'object') {
      Object.keys(vercelVars[env]).forEach((key) => allVercelKeys.add(key))
    }
  }

  const allKeys = new Set([
    ...allVercelKeys,
    ...Object.keys(localVars),
    ...Object.keys(testVars.integration || {}),
    ...Object.keys(testVars.e2e || {}),
    ...Object.keys(testVars.seed || {}),
  ])

  const sortedKeys = Array.from(allKeys).sort()

  let markdown = '# Environment Variables Comparison Report\n\n'

  // Summary
  markdown += '## Summary\n\n'
  markdown += `| Environment | Variable Count |\n`
  markdown += `|-------------|---------------|\n`

  // Add Vercel environments
  for (const env of vercelEnvs) {
    const envVars = vercelVars[env] || {}
    const envName = `Vercel ${env.charAt(0).toUpperCase() + env.slice(1)}`
    markdown += `| ${envName} | ${Object.keys(envVars).length} |\n`
  }

  markdown += `| Local (.envrc) | ${Object.keys(localVars).length} |\n`
  markdown += `| Integration Test | ${Object.keys(testVars.integration || {}).length} |\n`
  markdown += `| E2E Test | ${Object.keys(testVars.e2e || {}).length} |\n`
  markdown += `| Seed Test | ${Object.keys(testVars.seed || {}).length} |\n`
  markdown += `| **Total Unique** | **${allKeys.size}** |\n\n`

  // Detailed comparison table
  markdown += '## Detailed Comparison\n\n'

  // Dynamic header based on available Vercel environments
  const vercelHeaders = vercelEnvs
    .map((env) => `Vercel ${env.charAt(0).toUpperCase() + env.slice(1)}`)
    .join(' | ')
  markdown += `| Variable | ${vercelHeaders} | Local | Integration | E2E | Seed | Status |\n`
  markdown += `|----------|${vercelEnvs.map(() => '--------').join('|')}|-------|-------------|-----|------|--------|\n`

  for (const key of sortedKeys) {
    // Get Vercel values from each environment (no development - not deployable)
    const vercelPreviewValue = vercelVars.preview?.[key]
    const vercelProdValue = vercelVars.production?.[key]

    const localValue = localVars[key]
    const integrationValue = testVars.integration?.[key]
    const e2eValue = testVars.e2e?.[key]
    const seedValue = testVars.seed?.[key]

    // Get categorization info for this variable
    const allValues = [
      vercelPreviewValue,
      vercelProdValue,
      localValue,
      integrationValue,
      e2eValue,
      seedValue,
    ]
    const { uniqueValues, valueToEmoji } = categorizeValues(allValues, key)

    // Format values based on display mode
    const formatValue = (value, showValueText = false) => {
      if (value === undefined) return ''

      const masked = maskSensitiveValue(key, value)
      const emoji = valueToEmoji[masked] || '🔸'

      if (isDetailedMode || showValueText) {
        return formatDetailedValue(value, key)
      } else {
        // Default categorized mode - show emoji + short value or just emoji
        const withInvisibles = formatValueWithInvisibles(masked)

        if (withInvisibles.length <= 20) {
          return `${emoji} ${withInvisibles}` // Emoji + short value
        }

        // For long values, show emoji + first/last characters
        const start = withInvisibles.slice(0, 8)
        const end = withInvisibles.slice(-8)
        return `${emoji} ${start}...${end}`
      }
    }

    const vercelPreviewDisplay = formatValue(vercelPreviewValue)
    const vercelProdDisplay = formatValue(vercelProdValue)
    const localDisplay = formatValue(localValue)
    const integrationDisplay = formatValue(integrationValue)
    const e2eDisplay = formatValue(e2eValue)
    const seedDisplay = formatValue(seedValue)

    // Status shows number of unique values
    let status = ''
    if (uniqueValues.length === 0) {
      status = '⚪ 未設定'
    } else if (uniqueValues.length === 1) {
      status = '🟢 同一'
    } else {
      status = `🔀 ${uniqueValues.length}種類`
    }

    // Highlight important variables
    const importantVars = ['SLACK', 'NOTION', 'CRON']
    const isImportant = importantVars.some((prefix) => key.includes(prefix))
    const keyDisplay = isImportant ? `**\`${key}\`** ⚠️` : `\`${key}\``

    markdown += `| ${keyDisplay} | ${vercelPreviewDisplay} | ${vercelProdDisplay} | ${localDisplay} | ${integrationDisplay} | ${e2eDisplay} | ${seedDisplay} | ${status} |\n`
  }

  // Missing variables analysis
  const missingInVercel = Object.keys(localVars).filter((key) => !vercelVars[key])
  const missingInLocal = Object.keys(vercelVars).filter((key) => !localVars[key])

  markdown += '\n## Missing Variables Analysis\n\n'

  if (missingInVercel.length > 0) {
    markdown += `### Missing in Vercel (${missingInVercel.length})\n\n`
    for (const key of missingInVercel) {
      markdown += `- \`${key}\`\n`
    }
    markdown += '\n'
  }

  if (missingInLocal.length > 0) {
    markdown += `### Missing in Local (${missingInLocal.length})\n\n`
    for (const key of missingInLocal) {
      markdown += `- \`${key}\`\n`
    }
    markdown += '\n'
  }

  // Special variables analysis
  markdown += '## Special Variables Analysis\n\n'

  // Secrets with newline issues
  const secretsWithNewlines = []
  for (const secretVar of ['AUTH_SECRET', 'CRON_SECRET', 'SLACK_SECURITY_WEBHOOK']) {
    if (
      vercelVars[secretVar] &&
      (vercelVars[secretVar].includes('\\n') || vercelVars[secretVar].includes('\n'))
    ) {
      secretsWithNewlines.push(secretVar)
    }
  }

  if (secretsWithNewlines.length > 0) {
    markdown += '### Variables with Newline Issues\n\n'
    markdown +=
      '⚠️ The following Vercel variables contain newline characters that may cause issues:\n\n'
    for (const secret of secretsWithNewlines) {
      markdown += `- \`${secret}\`\n`
    }
    markdown += '\n'
  }

  // Database URLs comparison
  markdown += '### Database Configuration\n\n'
  markdown += '| Variable | Environment | Purpose |\n'
  markdown += '|----------|-------------|----------|\n'

  if (vercelVars['POSTGRES_URL']) {
    const isSupabase = vercelVars['POSTGRES_URL'].includes('supabase')
    markdown += `| \`POSTGRES_URL\` | Vercel (${isSupabase ? 'Supabase' : 'Other'}) | Production database |\n`
  }

  if (localVars['POSTGRES_URL']) {
    const isLocalhost =
      localVars['POSTGRES_URL'] === '[VARIABLE_SUBSTITUTION]' ||
      localVars['POSTGRES_URL'].includes('localhost')
    markdown += `| \`POSTGRES_URL\` | Local (${isLocalhost ? 'Docker' : 'External'}) | Development database |\n`
  }

  markdown += '\n---\n\n'
  markdown += `*Report generated on ${new Date().toISOString()}*\n`

  return markdown
}

function showHelp() {
  console.log(`
Environment Variables Comparison Script
Compares Vercel environment variables with local .envrc files

Usage:
  node tooling/scripts/compare-env-vars.js [options]

Options:
  --help, -h          Show this help message
  --console           Use console output instead of markdown (default: markdown)
  --no-secrets        Don't resolve secrets from Keychain (default: resolve secrets)
  --detailed          Show first/last characters for long values (markdown only)
                     Default: Emoji categorization for status
  --force-pull        Always pull fresh data from Vercel, ignore existing .env files

Examples:
  node tooling/scripts/compare-env-vars.js
    Default: Markdown table with emoji categorization (uses .env files if exist)

  node tooling/scripts/compare-env-vars.js --force-pull
    Always fetch fresh data from Vercel via 'vercel env pull'

  node tooling/scripts/compare-env-vars.js --detailed
    Markdown table with detailed value display (first/last chars)

  node tooling/scripts/compare-env-vars.js --console
    Console output with resolved secrets

  node tooling/scripts/compare-env-vars.js --no-secrets
    Markdown table without resolving secrets (shows [KEYCHAIN_SECRET])

  node tooling/scripts/compare-env-vars.js --console --no-secrets
    Console output without resolving secrets

  node tooling/scripts/compare-env-vars.js --force-pull --detailed
    Force pull from Vercel and show detailed values

Features:
  • Compares environment variables across 5 environments:
    - Vercel (.env.vercel)
    - Local (.envrc)
    - Integration Test (.envrc.test.integration)
    - E2E Test (.envrc.test.e2e)
    - Seed Test (.envrc.test.seed)
  
  • Secret resolution from macOS Keychain for accurate comparison
  
  • Detailed status reporting:
    ✅ Identical - Values are exactly the same (secrets resolved)
    ✅ Identical (masked) - Masked values appear the same (secrets not resolved)
    ✅ Same (whitespace diff) - Same values with different whitespace
    ✅ Same (padding diff) - Same base64 values with different padding
    ⚠️ Different - Values are different (may be expected)
    Missing in Local/Vercel - Variable not found in environment
    Not set - Variable not found in either environment

  • Value Categorization (default mode):
    🟦🟩🟨🟪🟫⬛⬜ - Color-coded emojis for different values
    🟢 同一 - All environments have the same value
    🔀 2種類/3種類... - Number of different values found
    ⚪ 未設定 - Not set in any environment

  • Invisible character visualization:
    🔸 Indicates newlines (\\n), carriage returns (\\r), tabs (\\t), nulls (\\0)
    🔹 Indicates trailing whitespace
    📄 Indicates long value (content exists)

  • Special analysis for common issues:
    - Variables with newline characters
    - Database URL configuration differences
    - Missing variables summary
`)
}

// Main execution
function main() {
  // Check for help flag first
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    showHelp()
    return
  }

  // Default to markdown mode and resolve secrets, unless explicitly overridden
  const isConsoleMode = process.argv.includes('--console')
  const isMarkdownMode = !isConsoleMode
  const resolveSecrets = !process.argv.includes('--no-secrets')

  // Value display options (for markdown mode)
  const isDetailedMode = process.argv.includes('--detailed') // show first/last chars
  const isCategorizedMode = !isDetailedMode // emoji categorization (default)

  try {
    if (isConsoleMode) {
      console.log(colorize('🚀 Starting environment variables comparison...', 'bold'))
      if (resolveSecrets) {
        console.log(colorize('🔐 Resolving secrets from Keychain...', 'yellow'))
      }
      console.log()
    }

    const forcePull = process.argv.includes('--force-pull')
    const vercelVars = getVercelVars(resolveSecrets, forcePull)
    const localVars = getLocalVars(resolveSecrets)
    const testVars = getTestVars(resolveSecrets)

    // Check if we have any Vercel variables at all
    const totalVercelVars = Object.values(vercelVars).reduce((total, envVars) => {
      return total + (typeof envVars === 'object' ? Object.keys(envVars).length : 0)
    }, 0)

    if (totalVercelVars === 0) {
      const message = '❌ No Vercel variables found. Make sure .env.vercel exists.'
      if (isMarkdownMode) {
        console.log(
          `# Error\n\n${message}\n\n💡 Run "vercel env pull" to download Vercel environment variables.`
        )
      } else {
        console.error(colorize(message, 'red'))
        console.log(
          colorize('💡 Run "vercel env pull" to download Vercel environment variables.', 'yellow')
        )
      }
      return
    }

    if (Object.keys(localVars).length === 0) {
      const message = '❌ No local variables found. Make sure .envrc exists.'
      if (isMarkdownMode) {
        console.log(`# Error\n\n${message}`)
      } else {
        console.error(colorize(message, 'red'))
      }
      return
    }

    if (isMarkdownMode) {
      const markdown = generateMarkdownTable(
        vercelVars,
        localVars,
        testVars,
        resolveSecrets,
        isDetailedMode
      )
      console.log(markdown)
    } else {
      compareVariables(vercelVars, localVars, testVars)
      analyzeSpecialVariables(vercelVars, localVars)
      console.log(colorize('\n✅ Environment variables comparison completed!', 'green'))
    }
  } catch (error) {
    const message = `❌ Error during comparison: ${error.message}`
    if (isMarkdownMode) {
      console.log(`# Error\n\n${message}`)
    } else {
      console.error(colorize(message, 'red'))
    }
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = {
  parseEnvFile,
  getVercelVars,
  getLocalVars,
  getTestVars,
  compareVariables,
  analyzeSpecialVariables,
  generateMarkdownTable,
}
