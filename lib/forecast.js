/**
 * Transparent token/CNY forecast for a task book.
 *
 * The estimator is deliberately simple and auditable:
 * - per milestone base input/output tokens;
 * - complexity, file count and test count multipliers;
 * - quality multiplier;
 * - revision/context overhead (ACEM-style revision factor);
 * - current model price from dsh-ui-usage-billing, with a cache-hit share;
 * - a reserve for overruns.
 *
 * It is an estimate, not a bill. The card exposes token counts, unit prices,
 * assumptions and an uncertainty band so the client can challenge it.
 */

const DEFAULT_MODEL = 'flash'
const FALLBACK_RATES = {
  key: DEFAULT_MODEL,
  name: 'DeepSeek Flash (fallback)',
  currency: 'CNY',
  input: 2,
  cacheHit: 0.04,
  output: 8,
  source: 'fallback',
}

const COMPLEXITY = { low: 0.65, medium: 1, high: 1.6 }
const QUALITY = { pass: 0.8, good: 1, perfect: 1.25 }
const BASE_INPUT = 250000
const BASE_OUTPUT = 20000
const FILE_INPUT = 20000
const FILE_OUTPUT = 3000
const TEST_INPUT = 12000
const TEST_OUTPUT = 1500
const REVISION_FACTOR = 1.18
const CACHE_HIT_SHARE = 0.35
const RESERVE_SHARE = 0.15
const CONFIDENCE = 0.35

function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100
}

function isPeak(price, date) {
  if (date === null || typeof price?.peakHours !== 'string') return true
  const hour = date.getHours()
  for (const part of price.peakHours.split('/')) {
    const match = /^\s*(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})\s*$/.exec(part)
    if (match === null) continue
    const start = Number(match[1]) + Number(match[2]) / 60
    const end = Number(match[3]) + Number(match[4]) / 60
    if (hour + date.getMinutes() / 60 >= start && hour + date.getMinutes() / 60 < end) return true
  }
  return false
}

async function readRates(model) {
  const base = process.env.DSH_WEB_URL
  if (typeof base === 'string' && base.trim() !== '') {
    try {
      const response = await fetch(new URL('/api/billing/pricing', base), { signal: AbortSignal.timeout(3500) })
      if (response.ok) {
        const data = await response.json()
        const catalog = Array.isArray(data?.catalog) ? data.catalog : []
        const aliases = data?.aliases !== null && typeof data?.aliases === 'object' ? data.aliases : {}
        const wanted = aliases[model] ?? model
        const row = catalog.find(item => item?.key === wanted || item?.key === model)
        if (row?.price !== null && typeof row?.price === 'object') {
          const peak = isPeak(row, new Date())
          const price = peak ? row.price : (row.price.offPeak ?? row.price)
          return {
            key: row.key,
            name: row.name ?? row.key,
            currency: price.currency ?? row.price.currency ?? 'CNY',
            input: Number(price.input) || 0,
            cacheHit: Number(price.cacheHit ?? price.input) || 0,
            output: Number(price.output) || 0,
            source: 'dsh-ui-usage-billing',
            peak,
          }
        }
      }
    } catch {
      // Fall through to the built-in price.
    }
  }
  return FALLBACK_RATES
}

export async function forecastBudget({ model = DEFAULT_MODEL, quality = 'good', milestones = [] } = {}) {
  const rates = await readRates(model)
  const q = QUALITY[quality] ?? 1
  const perMilestone = milestones.map(item => {
    const c = COMPLEXITY[item.complexity] ?? 1
    const files = Math.max(0, Number(item.files) || 0)
    const tests = Math.max(0, Number(item.tests) || 0)
    const input = Math.round((BASE_INPUT + files * FILE_INPUT + tests * TEST_INPUT) * c * q * REVISION_FACTOR)
    const output = Math.round((BASE_OUTPUT + files * FILE_OUTPUT + tests * TEST_OUTPUT) * c * q * REVISION_FACTOR)
    const cached = Math.round(input * CACHE_HIT_SHARE)
    const uncached = input - cached
    const cny = round2((uncached * rates.input + cached * rates.cacheHit + output * rates.output) / 1_000_000)
    return {
      id: item.id,
      title: item.title,
      inputTokens: input,
      outputTokens: output,
      cacheReadTokens: cached,
      cny,
    }
  })
  const inputTokens = perMilestone.reduce((sum, item) => sum + item.inputTokens, 0)
  const outputTokens = perMilestone.reduce((sum, item) => sum + item.outputTokens, 0)
  const cacheReadTokens = perMilestone.reduce((sum, item) => sum + item.cacheReadTokens, 0)
  const baseCny = round2(perMilestone.reduce((sum, item) => sum + item.cny, 0))
  const reserveCny = round2(baseCny * RESERVE_SHARE)
  const totalCny = round2(baseCny + reserveCny)
  return {
    model: rates.key,
    modelName: rates.name,
    currency: 'CNY',
    quality,
    rates: { input: rates.input, cacheHit: rates.cacheHit, output: rates.output, source: rates.source, peak: rates.peak },
    inputTokens,
    outputTokens,
    cacheReadTokens,
    totalTokens: inputTokens + outputTokens,
    baseCny,
    reserveCny,
    totalCny,
    confidence: CONFIDENCE,
    assumptions: [
      '每个里程碑的基础输入/输出 token + 文件/测试增量',
      `复杂度系数 low=${COMPLEXITY.low} / medium=${COMPLEXITY.medium} / high=${COMPLEXITY.high}`,
      `质量系数 pass=${QUALITY.pass} / good=${QUALITY.good} / perfect=${QUALITY.perfect}`,
      `执行修订/上下文系数 ${REVISION_FACTOR}`,
      `缓存命中假设 ${Math.round(CACHE_HIT_SHARE * 100)}%`,
      `备用金 ${Math.round(RESERVE_SHARE * 100)}%`,
    ],
    perMilestone,
  }
}
