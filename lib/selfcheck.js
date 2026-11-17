/**
 * Offline installation self-check shared by the CLI script and the DSH command.
 * No network, no third-party dependencies, no user/session data.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const REQUIRED_FILES = [
  'package.json',
  'index.js',
  'client.js',
  'lib/pure.js',
  'cordis.patch.yml',
  'locale/en.json',
  'locale/zh.json',
  'README.md',
  'README.zh.md',
  'LICENSE',
  'icon.svg',
  'scripts/self-check.mjs',
  'scripts/self-check.ps1',
]

const MIN_SIZES = {
  'index.js': 1000,
  'client.js': 10000,
  'lib/pure.js': 2000,
  'cordis.patch.yml': 20,
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function check(id, status, detail) {
  return { id, status, detail }
}

function compareVersions(left, right) {
  const parse = value => {
    const [core, prerelease = ''] = String(value).split('-', 2)
    return {
      parts: core.split('.').map(part => Number(part) || 0),
      prerelease,
    }
  }
  const a = parse(left)
  const b = parse(right)
  for (let index = 0; index < 3; index += 1) {
    if (a.parts[index] !== b.parts[index]) return a.parts[index] < b.parts[index] ? -1 : 1
  }
  if (a.prerelease === b.prerelease) return 0
  if (a.prerelease === '') return 1
  if (b.prerelease === '') return -1
  return a.prerelease < b.prerelease ? -1 : 1
}

function satisfiesRange(version, range) {
  if (typeof range !== 'string' || range.trim() === '') return true
  const tokens = range.trim().split(/\s+/)
  for (const token of tokens) {
    const match = /^(>=|>|<=|<|=)?\s*(\S+)$/.exec(token)
    if (match === null) return true
    const operator = match[1] ?? ''
    const target = match[2]
    const comparison = compareVersions(version, target)
    if (operator === '>=' && comparison < 0) return false
    if (operator === '>' && comparison <= 0) return false
    if (operator === '<=' && comparison > 0) return false
    if (operator === '<' && comparison >= 0) return false
    if ((operator === '=' || operator === '') && comparison !== 0) return false
  }
  return true
}

function detectDshVersion(explicit) {
  if (typeof explicit === 'string' && explicit.trim() !== '') return explicit.trim()
  if (typeof process.env.DSH_VERSION === 'string' && process.env.DSH_VERSION.trim() !== '') {
    return process.env.DSH_VERSION.trim()
  }
  if (typeof process.env.DSH_INSTALL_DIR === 'string' && process.env.DSH_INSTALL_DIR.trim() !== '') {
    try {
      return readJson(join(process.env.DSH_INSTALL_DIR, 'package.json')).version
    } catch {
      return undefined
    }
  }
  return undefined
}

function checkSyntax(relative, root, checks) {
  const full = join(root, relative)
  try {
    execFileSync(process.execPath, ['--check', full], { stdio: 'ignore' })
    checks.push(check(`syntax:${relative}`, 'pass', 'parses'))
  } catch (error) {
    checks.push(check(`syntax:${relative}`, 'fail', `syntax error: ${error.message}`))
  }
}

/**
 * Inspect one installed package directory.
 * @param {{ root: string, dshVersion?: string, checkSyntax?: boolean }} options
 * @returns {object} structured report
 */
export function runSelfCheck(options) {
  const root = options?.root
  if (typeof root !== 'string' || root.trim() === '') {
    throw new Error('self-check requires a package root')
  }
  const checks = []
  const warnings = []
  let pkg
  try {
    pkg = readJson(join(root, 'package.json'))
  } catch (error) {
    return {
      package: { name: undefined, version: undefined },
      checks: [check('package.json', 'fail', `cannot read/parse package.json: ${error.message}`)],
      passed: 0,
      failed: 1,
      warnings: 0,
      ok: false,
    }
  }

  const passed = () => checks.filter(item => item.status === 'pass').length
  const failed = () => checks.filter(item => item.status === 'fail').length
  const warn = (id, detail) => {
    warnings.push(check(id, 'warn', detail))
    checks.push(check(id, 'warn', detail))
  }

  if (pkg.name === 'dsh-info-check') {
    checks.push(check('package name', 'pass', pkg.name))
  } else {
    checks.push(check('package name', 'fail', `expected dsh-info-check, got ${String(pkg.name)}`))
  }
  if (typeof pkg.version === 'string' && /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(pkg.version)) {
    checks.push(check('package version', 'pass', pkg.version))
  } else {
    checks.push(check('package version', 'fail', 'missing or invalid semver version'))
  }
  if (pkg.private === true) {
    checks.push(check('publishable package', 'fail', 'package.json still has private: true'))
  } else {
    checks.push(check('publishable package', 'pass', 'private is not true'))
  }

  const nodeRange = typeof pkg.engines?.node === 'string' ? pkg.engines.node : ''
  const nodeVersion = process.versions.node
  if (nodeRange === '') {
    warn('node engine', 'engines.node is not declared')
  } else if (satisfiesRange(nodeVersion, nodeRange)) {
    checks.push(check('node engine', 'pass', `Node ${nodeVersion} satisfies ${nodeRange}`))
  } else {
    checks.push(check('node engine', 'fail', `Node ${nodeVersion} does not satisfy ${nodeRange}`))
  }

  const dshRange = typeof pkg.engines?.dsh === 'string' ? pkg.engines.dsh : ''
  const dshVersion = detectDshVersion(options?.dshVersion)
  if (dshRange === '') {
    warn('dsh engine', 'engines.dsh is not declared')
  } else if (dshVersion === undefined) {
    warn('dsh engine', `engines.dsh=${dshRange}; DSH version not detected`)
  } else if (satisfiesRange(dshVersion, dshRange)) {
    checks.push(check('dsh engine', 'pass', `DSH ${dshVersion} satisfies ${dshRange}`))
  } else {
    warn('dsh engine', `DSH ${dshVersion} does not satisfy ${dshRange}`)
  }

  for (const relative of REQUIRED_FILES) {
    const full = join(root, relative)
    try {
      const info = statSync(full)
      if (!info.isFile() || info.size === 0) {
        checks.push(check(`file:${relative}`, 'fail', 'missing or empty'))
      } else if (MIN_SIZES[relative] !== undefined && info.size < MIN_SIZES[relative]) {
        checks.push(check(`file:${relative}`, 'fail', `too small (${info.size} bytes)`))
      } else {
        checks.push(check(`file:${relative}`, 'pass', `${info.size} bytes`))
      }
    } catch {
      checks.push(check(`file:${relative}`, 'fail', 'missing'))
    }
  }

  try {
    const patch = readFileSync(join(root, 'cordis.patch.yml'), 'utf8')
    if (/id:\s*['"]?dsh-info-check['"]?/.test(patch) && /name:\s*['"]dsh-info-check['"]/.test(patch)) {
      checks.push(check('bundle patch row', 'pass', 'id/name match dsh-info-check'))
    } else {
      checks.push(check('bundle patch row', 'fail', 'cordis.patch.yml id/name mismatch'))
    }
  } catch (error) {
    checks.push(check('bundle patch row', 'fail', `cannot read patch: ${error.message}`))
  }

  try {
    const client = readFileSync(join(root, 'client.js'), 'utf8')
    if (/id:\s*['"]dsh-info-check['"]/.test(client)) {
      checks.push(check('client loader id', 'pass', 'dsh-info-check'))
    } else {
      checks.push(check('client loader id', 'fail', 'client.js loader id mismatch'))
    }
  } catch (error) {
    checks.push(check('client loader id', 'fail', `cannot read client.js: ${error.message}`))
  }

  for (const relative of ['locale/en.json', 'locale/zh.json']) {
    try {
      const value = readJson(join(root, relative))
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        checks.push(check(`json:${relative}`, 'pass', 'valid JSON object'))
      } else {
        checks.push(check(`json:${relative}`, 'fail', 'not a JSON object'))
      }
    } catch (error) {
      checks.push(check(`json:${relative}`, 'fail', `invalid JSON: ${error.message}`))
    }
  }

  if (options?.checkSyntax !== false) {
    for (const relative of ['index.js', 'client.js', 'lib/pure.js', 'scripts/self-check.mjs']) {
      checkSyntax(relative, root, checks)
    }
  }

  const failedCount = failed()
  const warningCount = warnings.length
  return {
    package: {
      name: pkg.name,
      version: pkg.version,
      node: nodeVersion,
      dsh: dshVersion,
      dshRange,
      nodeRange,
    },
    checks,
    passed: passed(),
    failed: failedCount,
    warnings: warningCount,
    ok: failedCount === 0,
  }
}

/** Human-readable summary; no local install path is printed. */
export function formatSelfCheck(report) {
  const lines = [
    'dsh-info-check self-check',
    `Package: ${report.package.name ?? 'unknown'}@${report.package.version ?? 'unknown'}`,
    `Node: ${report.package.node ?? 'unknown'}`,
    `DSH: ${report.package.dsh ?? 'not detected'}`,
    '',
  ]
  for (const item of report.checks) {
    const marker = item.status === 'pass' ? 'PASS' : item.status === 'warn' ? 'WARN' : 'FAIL'
    lines.push(`[${marker}] ${item.id}: ${item.detail}`)
  }
  lines.push('')
  lines.push(`Summary: ${report.passed} passed, ${report.failed} failed, ${report.warnings} warnings`)
  return lines.join('\n')
}
