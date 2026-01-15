import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(dirname, '../../../')

/**
 * Load environment variables from .envrc test file using direnv
 */
export function loadTestEnv(envFileName: string): boolean {
  const envFile = path.resolve(dirname, envFileName)

  if (process.env.CI) {
    console.log(`Skipping direnv load in CI environment for ${envFileName}`)
    return true
  }

  if (fs.existsSync(envFile)) {
    console.log(`Loading test environment from ${envFileName} via direnv`)

    // Get environment variables using node -e for clean JSON output
    const envDiff = execSync(
      `direnv exec ${rootDir} bash -c '
      node -e "console.log(JSON.stringify({before: process.env}))"
      source ${envFile}
      node -e "console.log(JSON.stringify({after: process.env}))"
    '`,
      {
        encoding: 'utf-8',
        cwd: rootDir,
      }
    )

    // Parse the two JSON lines
    const lines = envDiff
      .trim()
      .split('\n')
      .filter((line) => line.startsWith('{'))
    const beforeData = JSON.parse(lines[0]) as { before: Record<string, string> }
    const afterData = JSON.parse(lines[1]) as { after: Record<string, string> }

    const beforeEnvObj = beforeData.before
    const afterEnvObj = afterData.after

    // Find new or changed variables
    const changedVars = Object.entries(afterEnvObj)
      .filter(([key, value]) => beforeEnvObj[key] !== value)
      .map(([key, value]) => {
        process.env[key] = value
        return key
      })

    console.log(`Test environment loaded: ${changedVars.join(', ')}`)
    return true
  }

  console.warn(`${envFileName} file not found, using fallback environment setup`)
  return false
}
