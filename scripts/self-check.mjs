#!/usr/bin/env node
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { formatSelfCheck, runSelfCheck } from '../lib/selfcheck.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)

if (args.includes('--help') || args.includes('-h')) {
  console.log(`dsh-info-check self-check

Usage: node scripts/self-check.mjs [options]

Options:
  --json                 Print a machine-readable report
  --dsh-version <ver>    Check against this DSH version
  --help, -h             Show this help

The check is offline and only inspects the installed package files.
`)
  process.exit(0)
}

let dshVersion
const versionIndex = args.indexOf('--dsh-version')
if (versionIndex !== -1) {
  dshVersion = args[versionIndex + 1]
  if (dshVersion === undefined) {
    console.error('self-check: --dsh-version requires a value')
    process.exit(2)
  }
}

const report = runSelfCheck({ root, dshVersion, checkSyntax: true })
if (args.includes('--json')) {
  console.log(JSON.stringify(report, null, 2))
} else {
  console.log(formatSelfCheck(report))
}
process.exit(report.ok ? 0 : 1)
