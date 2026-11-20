/** Pure budget validation, rendering, ledger and standard helpers. */

export const MAX_BUDGET_STANDARD_CHARS = 2000

export const BUDGET_PROPOSAL_ID = 'budget-proposal'
export const BUDGET_REVIEW_ID = 'budget-review'
export const BUDGET_SETTLEMENT_ID = 'budget-settlement'
export const SIGN_BUDGET_LABEL = '签约并开始'
export const BUDGET_PLAN_CONFIRM_LABEL = '确认预算方案'
export const ADJUST_BUDGET_LABEL = '要求调整'
export const APPROVE_BUDGET_LABEL = '批准并继续'
export const DENY_BUDGET_LABEL = '不追加，继续'
export const PAUSE_BUDGET_LABEL = '暂停任务'
export const SATISFIED_BUDGET_LABEL = '满意'
export const NEUTRAL_BUDGET_LABEL = '一般'
export const DISSATISFIED_BUDGET_LABEL = '不满意'

const MANUAL_START = '<!-- dsh-info-check:budget-manual:start -->'
const MANUAL_END = '<!-- dsh-info-check:budget-manual:end -->'

function text(value, name, max = 1200) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${name} must be a non-empty string`)
  return value.trim().slice(0, max)
}

function optional(value, max = 1200) {
  return typeof value === 'string' && value.trim() !== '' ? value.trim().slice(0, max) : undefined
}

function points(value, name) {
  const number = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(number) || number < 0) throw new Error(`${name} must be a non-negative integer`)
  return number
}

function list(value, name, min = 1, max = 12, each = 200) {
  if (!Array.isArray(value) || value.length < min || value.length > max) {
    throw new Error(`${name} must contain ${min}–${max} entries`)
  }
  return value.map((entry, index) => text(entry, `${name}[${index}]`, each))
}

export function validateBudgetProposal(args) {
  if (args === null || typeof args !== 'object') throw new Error('confirm_budget expects an object')
  return {
    amount: points(args.amount, 'amount'),
    breakdown: list(args.breakdown, 'breakdown'),
    ...(optional(args.assumptions, 1500) === undefined ? {} : { assumptions: optional(args.assumptions, 1500) }),
    ...(optional(args.risks, 1500) === undefined ? {} : { risks: optional(args.risks, 1500) }),
    ...(optional(args.notes, 800) === undefined ? {} : { notes: optional(args.notes, 800) }),
  }
}

export function validateBudgetReview(args) {
  if (args === null || typeof args !== 'object') throw new Error('review_budget expects an object')
  const review = {
    milestone: text(args.milestone, 'milestone', 160),
    spent: points(args.spent, 'spent'),
    requestedExtra: points(args.requestedExtra ?? 0, 'requestedExtra'),
    ...(optional(args.notes, 800) === undefined ? {} : { notes: optional(args.notes, 800) }),
  }
  if (args.breakdown !== undefined) review.breakdown = list(args.breakdown, 'breakdown', 1, 12, 200)
  return review
}

export function validateBudgetSettlement(args) {
  if (args === null || typeof args !== 'object') throw new Error('settle_budget expects an object')
  return {
    finalSpent: points(args.finalSpent, 'finalSpent'),
    summary: text(args.summary, 'summary', 1200),
    ...(optional(args.notes, 800) === undefined ? {} : { notes: optional(args.notes, 800) }),
  }
}

export function validateBudgetPlan(args) {
  if (args === null || typeof args !== 'object') throw new Error('confirm_budget expects an object')
  const total = points(args.total, 'total')
  if (!Array.isArray(args.milestones) || args.milestones.length < 1 || args.milestones.length > 30) {
    throw new Error('milestones must contain 1–30 entries')
  }
  const seen = new Set()
  const milestones = args.milestones.map((entry, index) => {
    if (entry === null || typeof entry !== 'object') throw new Error(`milestones[${index}] must be an object`)
    const id = text(entry.id, `milestones[${index}].id`, 80)
    if (seen.has(id)) throw new Error(`duplicate milestone id: ${id}`)
    seen.add(id)
    return {
      id,
      title: text(entry.title, `milestones[${index}].title`, 240),
      amount: points(entry.amount, `milestones[${index}].amount`),
    }
  })
  const sum = milestones.reduce((value, entry) => value + entry.amount, 0)
  if (sum > total) throw new Error('milestone budgets must not exceed the total budget')
  const round = args.round === undefined ? 1 : Number(args.round)
  if (round !== 1 && round !== 2) throw new Error('round must be 1 or 2')
  return {
    total,
    milestones,
    round,
    ...(optional(args.adjustment, 1500) === undefined ? {} : { adjustment: optional(args.adjustment, 1500) }),
    ...(optional(args.assumptions, 1500) === undefined ? {} : { assumptions: optional(args.assumptions, 1500) }),
    ...(optional(args.risks, 1500) === undefined ? {} : { risks: optional(args.risks, 1500) }),
    ...(optional(args.notes, 800) === undefined ? {} : { notes: optional(args.notes, 800) }),
  }
}

export function budgetPlanDetail(plan) {
  const sum = plan.milestones.reduce((value, entry) => value + entry.amount, 0)
  let out = `【总预算】\n\n${plan.total} 预算点`
  out += `\n\n【里程碑预算】\n\n${plan.milestones.map((entry, index) => `${index + 1}. ${entry.id} — ${entry.title}：${entry.amount} 预算点`).join('\n')}`
  out += `\n\n【合计】\n\n已分配 ${sum}；未分配 ${plan.total - sum} 预算点`
  if (plan.round === 2 && plan.adjustment !== undefined) out += `\n\n【乙方调整说明】\n\n${plan.adjustment}`
  if (plan.assumptions !== undefined) out += `\n\n【假设】\n\n${plan.assumptions}`
  if (plan.risks !== undefined) out += `\n\n【风险】\n\n${plan.risks}`
  if (plan.notes !== undefined) out += `\n\n【备注】\n\n${plan.notes}`
  return out
}

export function budgetPlanLedger(plan, decision, feedback) {
  const sum = plan.milestones.reduce((value, entry) => value + entry.amount, 0)
  return [
    `### 预算方案 · 第 ${plan.round} 轮`,
    '',
    `- 总预算：${plan.total} 预算点`,
    `- 里程碑预算：${plan.milestones.map(entry => `${entry.id}=${entry.amount}`).join('；')}`,
    `- 合计：${sum} 预算点`,
    ...(plan.adjustment === undefined ? [] : ['', `- 乙方调整：${plan.adjustment}`]),
    '',
    ledgerDecision(decision, feedback),
  ].join('\n')
}

function numbered(items) {
  return items.map((item, index) => `${index + 1}. ${item}`).join('\n')
}

export function budgetProposalDetail(proposal) {
  let out = `【预算】\n\n${proposal.amount} 预算点`
  out += `\n\n【预算分解】\n\n${numbered(proposal.breakdown)}`
  if (proposal.assumptions !== undefined) out += `\n\n【预算假设】\n\n${proposal.assumptions}`
  if (proposal.risks !== undefined) out += `\n\n【超支风险】\n\n${proposal.risks}`
  if (proposal.notes !== undefined) out += `\n\n【备注】\n\n${proposal.notes}`
  return out
}

export function budgetReviewDetail(review, budget) {
  const available = budget.initial.amount + budget.extra - review.spent
  let out = `【里程碑】\n\n${review.milestone}`
  out += `\n\n【当前预算】\n\n初始 ${budget.initial.amount}；已批准追加 ${budget.extra}；累计已用 ${review.spent}；剩余 ${available} 预算点`
  if (review.requestedExtra > 0) out += `\n\n【本次追加请求】\n\n${review.requestedExtra} 预算点`
  if (review.breakdown !== undefined) out += `\n\n【本阶段使用】\n\n${numbered(review.breakdown)}`
  if (review.notes !== undefined) out += `\n\n【说明】\n\n${review.notes}`
  return out
}

export function budgetSettlementDetail(settlement, budget) {
  const total = budget.initial.amount + budget.extra
  const variance = settlement.finalSpent - total
  let out = `【预算结算】\n\n初始预算 ${budget.initial.amount}；批准追加 ${budget.extra}；总预算 ${total} 预算点`
  out += `\n\n【实际使用】\n\n${settlement.finalSpent} 预算点`
  out += `\n\n【差额】\n\n${variance === 0 ? '持平' : variance > 0 ? `超支 ${variance}` : `结余 ${-variance}`} 预算点`
  out += `\n\n【说明】\n\n${settlement.summary}`
  if (settlement.notes !== undefined) out += `\n\n【备注】\n\n${settlement.notes}`
  return out
}

function ledgerDecision(decision, feedback) {
  return `**用户决定**：${decision}${feedback === undefined ? '' : `\n\n**用户反馈**：${feedback}`}\n`
}

export function budgetProposalLedger(proposal, decision, feedback) {
  return [
    '### 预算签约',
    '',
    `- 报价：${proposal.amount} 预算点`,
    `- 分解：${proposal.breakdown.join('；')}`,
    '',
    ledgerDecision(decision, feedback),
  ].join('\n')
}

export function budgetReviewLedger(review, decision, feedback) {
  return [
    `### 预算审核 · ${review.milestone}`,
    '',
    `- 累计已用：${review.spent} 预算点`,
    `- 本次追加：${review.requestedExtra} 预算点`,
    '',
    ledgerDecision(decision, feedback),
  ].join('\n')
}

export function budgetSettlementLedger(settlement, rating) {
  return [
    '### 预算结算',
    '',
    `- 实际使用：${settlement.finalSpent} 预算点`,
    `- 评价：${rating}`,
    '',
    `**说明**：${settlement.summary}`,
    ...(settlement.notes === undefined ? [] : ['', `**备注**：${settlement.notes}`]),
    '',
  ].join('\n')
}

export function extractBudgetManualStandard(text) {
  const match = new RegExp(`${MANUAL_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([\\s\\S]*?)${MANUAL_END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).exec(String(text ?? ''))
  return match === null ? '' : match[1].trim()
}

export function formatBudgetStandard(history, manualText = '') {
  const tasks = Array.isArray(history) ? history : []
  const count = tasks.length
  const initial = count === 0 ? 0 : Math.round(tasks.reduce((sum, item) => sum + (Number(item.initial) || 0), 0) / count)
  const spent = count === 0 ? 0 : Math.round(tasks.reduce((sum, item) => sum + (Number(item.finalSpent) || 0), 0) / count)
  const extraTasks = tasks.filter(item => (Number(item.extra) || 0) > 0).length
  const ratings = tasks.map(item => Number(item.rating)).filter(value => value >= 1 && value <= 3)
  const rating = ratings.length === 0 ? 0 : ratings.reduce((sum, value) => sum + value, 0) / ratings.length
  const rules = [
    '初始报价要覆盖任务书全部里程碑，并留出合理缓冲。',
    '预算分解要能让甲方看出钱花在哪里；不要把未承诺的工作算进报价。',
  ]
  if (count > 0) rules.push(`历史平均初始报价约 ${initial} 预算点，平均实际使用约 ${spent} 预算点。`)
  if (extraTasks > 0) rules.push(`有 ${extraTasks} 次任务发生预算追加；下次报价前先说明不确定性。`)
  if (ratings.length > 0) rules.push(`预算评价均值约 ${rating.toFixed(1)}/3；评价偏低时优先压缩非核心工作。`)
  const manual = String(manualText ?? '').trim()
  const lines = [
    '# 用户预算标准',
    '',
    `- 数据来源：本地已完成结算的 ${count} 次任务。`,
    `- 平均初始报价：${initial} 预算点；平均实际使用：${spent} 预算点。`,
    '',
    '## 报价规则',
    '',
    ...rules.map((rule, index) => `${index + 1}. ${rule}`),
    '',
    '## 手工补充',
    '',
    MANUAL_START,
    manual === '' ? '（可在这里补充你的预算偏好）' : manual,
    MANUAL_END,
  ]
  let out = lines.join('\n').trim() + '\n'
  if (out.length > MAX_BUDGET_STANDARD_CHARS) {
    out = `${out.slice(0, MAX_BUDGET_STANDARD_CHARS - 2).trimEnd()}\n…`
  }
  return out
}
