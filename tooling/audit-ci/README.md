# @aromarious/audit-ci-config

Security audit configuration for CI/CD pipelines using audit-ci.

## Overview

This package provides audit-ci configuration for detecting security vulnerabilities in dependencies during CI/CD processes.

## Configuration

### audit-ci.jsonc

Main configuration file that defines:
- **Vulnerability levels**: Critical/High vulnerabilities cause build failure
- **Allowlist**: Known low-risk vulnerabilities for development environment
- **Package manager**: PNPM support
- **Report format**: Summary output for CI environments

## Usage

### CI Environment (Automatic)
```yaml
# GitHub Actions
- name: Security Audit Check
  run: npx audit-ci@^7 --config ./tooling/audit-ci/audit-ci.jsonc
```

### Local Environment (Manual)
```bash
# From project root
npx audit-ci@^7 --config ./tooling/audit-ci/audit-ci.jsonc

# Using package scripts
cd tooling/audit-ci
pnpm audit
pnpm audit:strict  # Include moderate vulnerabilities
```

## Configuration Details

### Vulnerability Levels
- **Critical/High**: Build failure (blocks PR merge)
- **Moderate/Low**: Warning only (with allowlist)

### Current Allowlist
- `GHSA-67mh-4wv8-2f99`: esbuild CORS issue (development only)
- `GHSA-hq75-xg7r-rx6c`: better-call cache issue (no CDN usage)

## Integration

Part of ARO-77: PR时セキュリティチェック・CI統合
- Complements ARO-73: Dependabot weekly automation
- Real-time vulnerability checking during PR process
- Enterprise-level security CI integration