/**
 * Pure retrospective and quality-standard helpers.
 * No Node, Cordis, network, or model calls: callers persist the strings.
 */

export const QUALITY_UPDATE_EVERY = 3
export const MAX_STANDARD_CHARS = 2400
export const MAX_RECENT_TASKS = 20

const MANUAL_START = '<!-- dsh-info-check:manual:start -->'
const MANUAL_END = '<!-- dsh-info-check:manual:end -->'

function unique(items, limit = 5) {
  const seen = new Set()
  const result = []
  for (const item of items) {
    const text = String(item ?? '').trim()
    if (text === '' || seen.has(text)) continue
    seen.add(text)
    result.push(text)
    if (result.length >= limit) break
  }
  return result
}

function short(text, limit = 160) {
  const value = String(text ?? '').replace(/\s+/g, ' ').trim()
  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value
}

function eventDecision(event) {
  return typeof event?.decision === 'string' ? event.decision : 'unknown'
}

/** Build one task's review from ledger events. */
export function analyzeTask(events) {
  const list = Array.isArray(events) ? events : []
  const acceptances = list.filter(event => event?.type === 'acceptance')
  const deliveries = list.filter(event => event?.type === 'delivery')
  const lastDelivery = deliveries.length === 0 ? undefined : deliveries[deliveries.length - 1]
  const accepted = acceptances.filter(event => eventDecision(event) === 'accepted').length
  const reworked = acceptances.filter(event => eventDecision(event) === 'rework').length
  const paused = acceptances.filter(event => eventDecision(event) === 'paused').length
  const skipped = acceptances.filter(event => eventDecision(event) === 'skipped' || eventDecision(event) === 'timeout').length
  const adjustments = deliveries.filter(event => eventDecision(event) === 'adjust').length
  const feedback = unique(acceptances
    .filter(event => eventDecision(event) === 'rework')
    .map(event => short(event.feedback)))
  const adjustmentsFeedback = unique(deliveries
    .filter(event => eventDecision(event) === 'adjust')
    .map(event => short(event.feedback)))
  const notes = unique(list.map(event => short(event.notes, 120)).filter(text => text !== ''), 4)
  const suggestions = []

  if (reworked > 0) suggestions.push('验收前先补齐可复核的验证证据，并把改动范围说清楚。')
  if (adjustments > 0) suggestions.push('交付前检查完成程度、限制和验证是否齐全，再发起交付确认。')
  if (paused > 0) suggestions.push('把里程碑拆小，并在阶段内主动汇报进度，减少中途暂停。')
  if (reworked === 0 && adjustments === 0) suggestions.push('保持当前的证据和交付说明标准。')
  if (feedback.length > 0) suggestions.push(`优先回应这几次返工原因：${feedback.slice(0, 2).join('；')}`)
  if (adjustmentsFeedback.length > 0) suggestions.push(`优先回应交付调整原因：${adjustmentsFeedback.slice(0, 2).join('；')}`)

  return {
    milestones: acceptances.length,
    accepted,
    reworked,
    paused,
    skipped,
    adjustments,
    delivery: lastDelivery === undefined ? 'none' : eventDecision(lastDelivery),
    feedback,
    adjustmentsFeedback,
    notes,
    suggestions: unique(suggestions, 4),
  }
}

/** Append one task review to the single retrospectives markdown file. */
export function appendRetrospective(existing, taskNumber, date, summary) {
  const body = String(existing ?? '')
  const section = [
    `## 复盘 ${taskNumber} · ${date}`,
    '',
    `- 任务结果：${summary.delivery === 'confirmed' ? '已确认交付' : summary.delivery}`,
    `- 里程碑：共 ${summary.milestones} 个；验收通过 ${summary.accepted} 个；返工 ${summary.reworked} 个；暂停 ${summary.paused} 个；跳过 ${summary.skipped} 个`,
    `- 交付调整：${summary.adjustments} 次`,
    `- 用户反馈：${summary.feedback.length === 0 && summary.adjustmentsFeedback.length === 0 ? '无' : [...summary.feedback, ...summary.adjustmentsFeedback].join('；')}`,
    `- 用户备注：${summary.notes.length === 0 ? '无' : summary.notes.join('；')}`,
    '- 改进建议：',
    ...summary.suggestions.map((item, index) => `  ${index + 1}. ${item}`),
  ].join('\n')

  if (body.trim() === '') {
    return `# 任务复盘记录\n\n${section}\n`
  }
  return `${body.trimEnd()}\n\n${section}\n`
}

/** Create the persisted quality-state object. */
export function createQualityState() {
  return { version: 1, taskCount: 0, summaries: [], standardUpdatedAt: null }
}

/** Add one task summary; keep only the recent window. */
export function recordTask(state, summary, now) {
  const current = state !== null && typeof state === 'object' ? state : createQualityState()
  const summaries = [...(Array.isArray(current.summaries) ? current.summaries : []), summary]
  return {
    version: 1,
    taskCount: (Number(current.taskCount) || 0) + 1,
    summaries: summaries.slice(-MAX_RECENT_TASKS),
    standardUpdatedAt: current.standardUpdatedAt ?? null,
    lastTaskAt: now,
  }
}

export function shouldUpdateQualityStandard(state) {
  const count = Number(state?.taskCount) || 0
  return count > 0 && count % QUALITY_UPDATE_EVERY === 0
}

/** Extract the editable manual block from an existing standard. */
export function extractManualStandard(text) {
  const match = new RegExp(`${MANUAL_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([\\s\\S]*?)${MANUAL_END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).exec(String(text ?? ''))
  if (match === null) return ''
  return match[1].trim()
}

/** Build a concise, deterministic standard from the stored task summaries. */
export function buildQualityStandard(state, manualText = '') {
  const summaries = Array.isArray(state?.summaries) ? state.summaries : []
  const tasks = summaries.length
  const total = summaries.reduce((accumulator, item) => {
    accumulator.milestones += Number(item.milestones) || 0
    accumulator.accepted += Number(item.accepted) || 0
    accumulator.reworked += Number(item.reworked) || 0
    accumulator.paused += Number(item.paused) || 0
    accumulator.adjustments += Number(item.adjustments) || 0
    return accumulator
  }, { milestones: 0, accepted: 0, reworked: 0, paused: 0, adjustments: 0 })

  const rules = [
    '验收前给出可复核的验证证据；把未完成项、风险和限制写清楚。',
    '每个里程碑只承诺当前阶段能完成的内容，不把后续工作混进当前验收。',
  ]
  if (total.reworked > 0) rules.push('发生返工后，先复述改动和新增证据，再重新发起验收。')
  if (total.adjustments > 0) rules.push('交付前检查完成程度、交付内容、限制和验证是否齐全。')
  if (total.paused > 0) rules.push('里程碑拆小，阶段内主动汇报，减少中途暂停。')

  const feedback = unique(summaries.flatMap(item => [
    ...(Array.isArray(item.feedback) ? item.feedback : []),
    ...(Array.isArray(item.adjustmentsFeedback) ? item.adjustmentsFeedback : []),
  ]), 3)
  if (feedback.length > 0) rules.push(`用户指出过的重点：${feedback.map(item => short(item, 100)).join('；')}`)

  const manual = String(manualText ?? '').trim()
  const lines = [
    '# 用户工作质量标准',
    '',
    `- 数据来源：最近 ${tasks} 次有记录的复盘（累计 ${Number(state?.taskCount) || tasks} 次任务）。`,
    `- 里程碑统计：验收 ${total.milestones} 次，通过 ${total.accepted} 次，返工 ${total.reworked} 次，暂停 ${total.paused} 次，交付调整 ${total.adjustments} 次。`,
    '',
    '## 执行规则',
    '',
    ...rules.map((rule, index) => `${index + 1}. ${rule}`),
    '',
    '## 手工补充',
    '',
    MANUAL_START,
    manual === '' ? '（可在这里补充你的个人标准）' : manual,
    MANUAL_END,
  ]
  let text = lines.join('\n').trim() + '\n'
  if (text.length > MAX_STANDARD_CHARS) {
    text = `${text.slice(0, MAX_STANDARD_CHARS - 2).trimEnd()}\n…`
  }
  return text
}
