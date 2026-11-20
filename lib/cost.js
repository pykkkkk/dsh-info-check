/**
 * Cost lookup for budget cards.
 *
 * Preferred source: @kenz1117/dsh-ui-usage-billing's local HTTP API
 * (`/api/billing/usage-stats`), which reports real CNY cost aggregated from
 * persisted session logs. If that plugin is absent, estimate from token usage
 * stored in the DSH session log, using configurable CNY-per-million rates.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { zstdDecompressSync } from 'node:zlib'

const ZSTD_MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd])
const DEFAULT_INPUT_CNY_PER_MTOK = 2
const DEFAULT_OUTPUT_CNY_PER_MTOK = 8
const DEFAULT_CACHE_READ_CNY_PER_MTOK = 0.5

export async function readBillingCost(sessionId) {
  const base = process.env.DSH_WEB_URL
  if (typeof base !== 'string' || base.trim() === '') return undefined
  try {
    const response = await fetch(new URL('/api/billing/usage-stats', base), {
      signal: AbortSignal.timeout(3500),
    })
    if (!response.ok) return undefined
    const data = await response.json()
    const rows = Array.isArray(data?.bySession) ? data.bySession : []
    const row = rows.find(item => item !== null && typeof item === 'object' && String(item.id) === String(sessionId))
    if (row === undefined) return undefined
    return {
      cny: Math.round((Number(row.cost) || 0) * 100) / 100,
      calls: Number(row.calls) || 0,
      source: 'dsh-ui-usage-billing',
      version: typeof data.pluginVersion === 'string' ? data.pluginVersion : undefined,
    }
  } catch {
    return undefined
  }
}

function findSessionFile(sessionId) {
  const home = process.env.DSH_HOME
  if (typeof home !== 'string' || home.trim() === '') return undefined
  const root = join(home, 'sessions')
  if (!existsSync(root)) return undefined
  const target = `session-${String(sessionId)}`
  const stack = [root]
  while (stack.length > 0) {
    const current = stack.pop()
    let entries
    try {
      entries = readdirSync(current, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      if (entry.name === target) {
        const file = join(current, entry.name, 'session.v4.jsonl.zstd')
        if (existsSync(file)) return file
      }
      stack.push(join(current, entry.name))
    }
  }
  return undefined
}

function decompressFrames(file) {
  const buffer = readFileSync(file)
  const positions = []
  for (let index = 0; index <= buffer.length - 4; index += 1) {
    if (buffer[index] === ZSTD_MAGIC[0]
      && buffer[index + 1] === ZSTD_MAGIC[1]
      && buffer[index + 2] === ZSTD_MAGIC[2]
      && buffer[index + 3] === ZSTD_MAGIC[3]) {
      positions.push(index)
    }
  }
  let text = ''
  for (let index = 0; index < positions.length; index += 1) {
    const start = positions[index]
    const end = positions[index + 1] ?? buffer.length
    try {
      text += zstdDecompressSync(buffer.subarray(start, end)).toString('utf8')
    } catch {
      // A truncated final frame cannot be recovered; keep the completed ones.
    }
  }
  return text
}

function rate(name, fallback) {
  const value = Number(process.env[name])
  return Number.isFinite(value) && value >= 0 ? value : fallback
}

export function readTokenEstimate(sessionId) {
  const file = findSessionFile(sessionId)
  if (file === undefined) return undefined
  const text = decompressFrames(file)
  const totals = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }
  let seen = 0
  for (const line of text.split('\n')) {
    if (line === '') continue
    let event
    try {
      event = JSON.parse(line)
    } catch {
      continue
    }
    if (event?.type !== 'assistant/message' || event.data?.usage === null || typeof event.data?.usage !== 'object') continue
    const usage = event.data.usage
    if (!Number.isFinite(Number(usage.inputTokens))) continue
    seen += 1
    totals.input += Number(usage.inputTokens) || 0
    totals.output += Number(usage.outputTokens) || 0
    totals.cacheRead += Number(usage.cacheReadTokens) || 0
    totals.cacheWrite += Number(usage.cacheWriteTokens) || 0
  }
  if (seen === 0) return undefined
  const inputRate = rate('DSH_INFO_CHECK_INPUT_CNY_PER_MTOK', DEFAULT_INPUT_CNY_PER_MTOK)
  const outputRate = rate('DSH_INFO_CHECK_OUTPUT_CNY_PER_MTOK', DEFAULT_OUTPUT_CNY_PER_MTOK)
  const cacheRate = rate('DSH_INFO_CHECK_CACHE_READ_CNY_PER_MTOK', DEFAULT_CACHE_READ_CNY_PER_MTOK)
  const cny = (totals.input * inputRate
    + totals.output * outputRate
    + totals.cacheRead * cacheRate
    + totals.cacheWrite * inputRate) / 1_000_000
  return {
    cny: Math.round((cny + Number.EPSILON) * 100) / 100,
    source: 'token-estimate',
    tokens: totals,
    calls: seen,
    rates: { inputRate, outputRate, cacheRate },
  }
}

export async function readCost(sessionId) {
  return (await readBillingCost(sessionId)) ?? readTokenEstimate(sessionId)
}
