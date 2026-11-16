/**
 * Pure helpers for dsh-info-check: config flags, validation, brief rendering,
 * and ledger entries. No Cordis or Node APIs here so the module can be tested
 * in isolation.
 */

export const INTENT_BRIEF_ID = 'intent-brief'
export const MILESTONE_CONFIRM_ID = 'milestone-confirm'
export const ACCEPT_MILESTONE_ID = 'milestone-accept'
export const DELIVERY_CONFIRM_ID = 'delivery-confirm'

export const APPROVE_MILESTONE_LABEL = '按此方案执行（推荐）'
export const ADJUST_MILESTONE_LABEL = '先停下，我要调整'
export const ACCEPT_LABEL = '验收通过'
export const REWORK_LABEL = '需要返工'
export const DELIVER_LABEL = '确认并交付'
export const ADJUST_DELIVERY_LABEL = '需要调整'

const LABEL_SUFFIX = /\s*(?:\((?:recommended|推荐)\)|（(?:recommended|推荐)）)\s*$/iu

/** Whether a value is a schemastery volatile reference. */
export function isRef(value) {
  return typeof value === 'object' && value !== null && typeof value.get === 'function'
}

/** Read a boolean config field that may be a volatile reference. */
export function readFlag(value, fallback = true) {
  if (isRef(value)) {
    const current = value.get()
    return typeof current === 'boolean' ? current : fallback
  }
  return typeof value === 'boolean' ? value : fallback
}

/** Remove the client's recommended marker from an option label. */
export function stripRecommended(label) {
  return String(label).replace(LABEL_SUFFIX, '').trim()
}

/** Local timestamp used by the ledger. */
export function formatTime(date = new Date()) {
  const pad = n => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} `
    + `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function requireString(value, name) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`info_check: "${name}" must be a non-empty string`)
  }
  return value.trim()
}

function optionalString(value, name) {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string') throw new Error(`info_check: "${name}" must be a string when present`)
  return value.trim()
}

function stringArray(value, name, min) {
  if (value === undefined || value === null) {
    if (min === 0) return []
    throw new Error(`info_check: "${name}" must contain at least ${min} item(s)`)
  }
  if (!Array.isArray(value)) throw new Error(`info_check: "${name}" must be an array of strings`)
  const items = value.map((item, index) => requireString(item, `${name}[${index}]`))
  if (items.length < min) throw new Error(`info_check: "${name}" must contain at least ${min} item(s)`)
  return items
}

function milestoneList(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('info_check: "milestones" must contain at least one milestone')
  }
  if (value.length > 5) throw new Error('info_check: "milestones" accepts at most 5 entries')
  const ids = new Set()
  return value.map((entry, index) => {
    if (entry === null || typeof entry !== 'object') throw new Error(`info_check: milestones[${index}] must be an object`)
    const id = requireString(entry.id, `milestones[${index}].id`)
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(id)) throw new Error(`info_check: milestone id "${id}" must match [A-Za-z0-9_-]{1,40}`)
    if (ids.has(id)) throw new Error(`info_check: duplicate milestone id "${id}"`)
    ids.add(id)
    return { id, title: requireString(entry.title, `milestones[${index}].title`) }
  })
}

function questionList(value, maxQuestions) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('info_check: "questions" must contain at least one question')
  }
  if (value.length > maxQuestions) {
    throw new Error(`info_check: "questions" accepts at most ${maxQuestions} entries`)
  }
  const ids = new Set()
  return value.map((entry, index) => {
    if (entry === null || typeof entry !== 'object') throw new Error(`info_check: questions[${index}] must be an object`)
    const id = requireString(entry.id, `questions[${index}].id`)
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(id)) throw new Error(`info_check: question id "${id}" must match [A-Za-z0-9_-]{1,40}`)
    if (id === INTENT_BRIEF_ID) throw new Error(`info_check: question id "${INTENT_BRIEF_ID}" is reserved`)
    if (ids.has(id)) throw new Error(`info_check: duplicate question id "${id}"`)
    ids.add(id)
    const options = entry.options === undefined ? [] : entry.options
    if (!Array.isArray(options) || options.length > 5) {
      throw new Error(`info_check: questions[${index}].options must be an array of at most 5 entries`)
    }
    const labels = new Set()
    const normalizedOptions = options.map((option, optionIndex) => {
      if (option === null || typeof option !== 'object') {
        throw new Error(`info_check: questions[${index}].options[${optionIndex}] must be an object`)
      }
      const label = requireString(option.label, `questions[${index}].options[${optionIndex}].label`)
      if (labels.has(label)) throw new Error(`info_check: duplicate option label "${label}"`)
      labels.add(label)
      const description = optionalString(option.description, `questions[${index}].options[${optionIndex}].description`)
      return description === undefined ? { label } : { label, description }
    })
    const header = optionalString(entry.header, `questions[${index}].header`)
    const question = requireString(entry.question, `questions[${index}].question`)
    const multiSelect = entry.multi_select === true
    return {
      id,
      question,
      ...header === undefined ? {} : { header },
      ...normalizedOptions.length === 0 ? {} : { options: normalizedOptions },
      ...multiSelect ? { multiSelect } : {},
    }
  })
}

/** Validate and normalize info_check arguments. */
export function validateInfoCheck(args, maxQuestions) {
  if (args === null || typeof args !== 'object') throw new Error('info_check expects an object')
  return {
    understanding: requireString(args.understanding, 'understanding'),
    qualityBar: stringArray(args.quality_bar, 'quality_bar', 1),
    outOfScope: stringArray(args.out_of_scope ?? [], 'out_of_scope', 0),
    milestones: milestoneList(args.milestones),
    questions: questionList(args.questions, maxQuestions),
  }
}

/** Validate and normalize confirm_milestone arguments. */
export function validateMilestone(args) {
  if (args === null || typeof args !== 'object') throw new Error('confirm_milestone expects an object')
  const milestone = requireString(args.milestone, 'milestone')
  const plan = requireString(args.plan, 'plan')
  const impact = optionalString(args.impact, 'impact')
  return { milestone, plan, ...impact === undefined ? {} : { impact } }
}

/** Validate and normalize accept_milestone arguments. */
export function validateAcceptance(args) {
  if (args === null || typeof args !== 'object') throw new Error('accept_milestone expects an object')
  const milestone = requireString(args.milestone, 'milestone')
  const summary = requireString(args.summary, 'summary')
  const evidence = requireString(args.evidence, 'evidence')
  const gaps = optionalString(args.gaps, 'gaps')
  return {
    milestone,
    summary,
    evidence,
    ...gaps === undefined || gaps === '' ? {} : { gaps },
  }
}

/** Validate and normalize confirm_delivery arguments. */
export function validateDelivery(args) {
  if (args === null || typeof args !== 'object') throw new Error('confirm_delivery expects an object')
  const completion = requireString(args.completion, 'completion')
  const delivered = requireString(args.delivered, 'delivered')
  const evidence = optionalString(args.evidence, 'evidence')
  const gaps = optionalString(args.gaps, 'gaps')
  return {
    completion,
    delivered,
    ...gaps === undefined || gaps === '' ? {} : { gaps },
    ...evidence === undefined || evidence === '' ? {} : { evidence },
  }
}

/** Render each non-empty line as its own numbered paragraph. */
export function numberPoints(text) {
  const points = String(text ?? '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line !== '')
    .map(line => line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, ''))
  return points.map((point, index) => `${index + 1}. ${point}`).join('\n\n')
}

/** Brief shown in the editable card and in the tool card. */
export function briefMarkdown(brief) {
  const lines = ['【我的理解】', '', numberPoints(brief.understanding), '', '【完成标准】', '']
  lines.push(numberPoints(brief.qualityBar.join('\n')))
  if (brief.outOfScope.length > 0) {
    lines.push('', '【范围外】', '')
    lines.push(numberPoints(brief.outOfScope.join('\n')))
  }
  lines.push('', '【里程碑】', '')
  brief.milestones.forEach((milestone, index) => {
    lines.push(`${index + 1}. ${milestone.id} — ${milestone.title}`)
  })
  return lines.join('\n')
}

/** Detail sections for the milestone acceptance card. */
export function acceptanceDetail(args) {
  let text = `【里程碑】\n\n${args.milestone}\n\n【完成内容】\n\n${numberPoints(args.summary)}\n\n【验证证据】\n\n${numberPoints(args.evidence)}`
  if (args.gaps !== undefined) text += `\n\n【未完成或风险】\n\n${numberPoints(args.gaps)}`
  return text
}

/** Detail sections for the final delivery confirmation card. */
export function deliveryDetail(args) {
  let text = `【完成程度】\n\n${numberPoints(args.completion)}\n\n【交付内容】\n\n${numberPoints(args.delivered)}`
  if (args.gaps !== undefined) text += `\n\n【未完成或限制】\n\n${numberPoints(args.gaps)}`
  if (args.evidence !== undefined) text += `\n\n【验证】\n\n${numberPoints(args.evidence)}`
  return text
}

function indentBlock(text) {
  return text.split('\n').map(line => `    ${line}`).join('\n')
}

function questionIndex(brief) {
  const index = new Map()
  index.set(INTENT_BRIEF_ID, { header: 'dsh-info-check · 需求核对', question: '请先修改下面的核对单；确认无误后勾选“我已确认”，再进入细节确认。' })
  for (const question of brief.questions) index.set(question.id, question)
  return index
}

function answerLines(answers, questions) {
  const detailAnswers = (Array.isArray(answers) ? answers : []).filter(item => item.id !== INTENT_BRIEF_ID)
  if (detailAnswers.length === 0) return ['  - （无）']
  const lines = []
  for (const item of detailAnswers) {
    const selected = Array.isArray(item.selected) ? item.selected : []
    const parts = []
    if (selected.length > 0) parts.push(selected.join(' / '))
    if (typeof item.custom === 'string' && item.custom.trim() !== '') parts.push(`自定义：${item.custom.trim()}`)
    const meta = questions.get(item.id)
    const label = meta === undefined
      ? `\`${item.id}\``
      : `${meta.header === undefined ? '' : `[${meta.header}] `}${meta.question}`
    lines.push(`  - ${label}`)
    lines.push(`    - 回答：${parts.length === 0 ? '（跳过）' : parts.join('；')}`)
  }
  return lines
}

/** Interpret one submitted answer batch for info_check. */
export function intentOutcome(answer) {
  const answers = Array.isArray(answer?.answers) ? answer.answers : []
  const brief = answers.find(item => item.id === INTENT_BRIEF_ID)
  const editedBrief = typeof brief?.custom === 'string' ? brief.custom.trim() : ''
  if (editedBrief === '') {
    return { confirmed: false, reason: 'skipped', answers }
  }
  const details = answers
    .filter(item => item.id !== INTENT_BRIEF_ID)
    .map(item => ({
      id: item.id,
      selected: [...(Array.isArray(item.selected) ? item.selected : [])],
      ...item.custom === undefined ? {} : { custom: item.custom },
    }))
  return { confirmed: true, reason: 'confirmed', editedBrief, answers: details }
}

/** Interpret one submitted answer batch for confirm_milestone. */
export function milestoneOutcome(item, plan) {
  const custom = typeof item?.custom === 'string' ? item.custom.trim() : ''
  const selected = Array.isArray(item?.selected) ? item.selected : []
  const approved = selected.some(label => stripRecommended(label) === stripRecommended(APPROVE_MILESTONE_LABEL))
  const askedAdjust = selected.some(label => stripRecommended(label) === stripRecommended(ADJUST_MILESTONE_LABEL))
  if (approved) {
    const editedPlan = custom !== '' && custom !== String(plan).trim() ? custom : undefined
    return {
      decision: 'approved',
      proceed: true,
      ...(editedPlan === undefined ? {} : { editedPlan }),
    }
  }
  if (askedAdjust) {
    return {
      decision: 'adjust',
      proceed: false,
      ...(custom === '' ? {} : { feedback: custom }),
    }
  }
  if (custom !== '') {
    return { decision: 'adjust', proceed: false, feedback: custom }
  }
  return { decision: 'skipped', proceed: true }
}

/** Interpret one submitted answer batch for accept_milestone. */
export function acceptanceOutcome(item) {
  const custom = typeof item?.custom === 'string' ? item.custom.trim() : ''
  const selected = Array.isArray(item?.selected) ? item.selected : []
  const approved = selected.some(label => stripRecommended(label) === ACCEPT_LABEL)
  const rework = selected.some(label => stripRecommended(label) === REWORK_LABEL)
  if (approved) return { decision: 'accepted', proceed: true }
  if (rework) {
    return { decision: 'rework', proceed: false, ...(custom === '' ? {} : { feedback: custom }) }
  }
  if (custom !== '') return { decision: 'rework', proceed: false, feedback: custom }
  return { decision: 'skipped', proceed: true }
}

/** Interpret one submitted answer batch for confirm_delivery. */
export function deliveryOutcome(item) {
  const custom = typeof item?.custom === 'string' ? item.custom.trim() : ''
  const selected = Array.isArray(item?.selected) ? item.selected : []
  const confirmed = selected.some(label => stripRecommended(label) === DELIVER_LABEL)
  const adjust = selected.some(label => stripRecommended(label) === ADJUST_DELIVERY_LABEL)
  if (confirmed) return { decision: 'confirmed', proceed: true }
  if (adjust) {
    return { decision: 'adjust', proceed: false, ...(custom === '' ? {} : { feedback: custom }) }
  }
  if (custom !== '') return { decision: 'adjust', proceed: false, feedback: custom }
  return { decision: 'skipped', proceed: true }
}

/** One ledger section for an info_check outcome. */
export function infoCheckLedger(brief, outcome, time = formatTime()) {
  const lines = [`### 意图核对 · ${time}`, '']
  const edited = typeof outcome.editedBrief === 'string' ? outcome.editedBrief.trim() : ''
  if (edited !== '') {
    const original = briefMarkdown(brief).trim()
    lines.push('- 核对单（用户确认版）：', '', indentBlock(edited), '')
    lines.push(`- 与 agent 原始版本：${edited === original ? '无修改' : '有修改（以用户确认版为准）'}`)
  } else {
    lines.push('- 核对单（agent 原始版）：', '', indentBlock(briefMarkdown(brief)), '')
  }
  lines.push('- 核对项与回答：', ...answerLines(outcome.answers, questionIndex(brief)))
  const result = outcome.confirmed
    ? '已确认'
    : outcome.reason === 'cancelled'
      ? '已取消（用户关闭了核对卡）'
      : outcome.reason === 'skipped'
        ? '未确认（用户没有提交核对单）'
        : '需要调整（用户要求修改核对单）'
  lines.push(`- 结果：${result}`)
  if (typeof outcome.feedback === 'string' && outcome.feedback.trim() !== '') {
    lines.push(`- 用户反馈：${outcome.feedback.trim()}`)
  }
  return lines.join('\n')
}

/** One ledger section for a confirm_milestone outcome. */
export function milestoneLedger(args, outcome, time = formatTime()) {
  const decision = {
    approved: '按此方案执行',
    adjust: '需要调整',
    skipped: '用户跳过确认',
    timeout: '倒计时结束，自动跳过',
    cancelled: '已取消（用户关闭了确认卡）',
  }[outcome.decision] ?? outcome.decision
  const lines = [`### 里程碑确认 · ${args.milestone} · ${time}`, '']
  const edited = typeof outcome.editedPlan === 'string' ? outcome.editedPlan.trim() : ''
  if (edited !== '') {
    lines.push('**用户确认的方案**', '', indentBlock(edited), '')
    lines.push(`**与 agent 原始版本**：${edited === args.plan.trim() ? '无修改' : '有修改（以用户确认版为准）'}`, '')
  } else {
    lines.push('**方案**', '', args.plan, '')
  }
  if (args.impact !== undefined && args.impact !== '') {
    lines.push(`**影响范围**：${args.impact}`, '')
  }
  lines.push(`**用户决定**：${decision}`)
  if (typeof outcome.feedback === 'string' && outcome.feedback.trim() !== '') {
    lines.push('', `**用户反馈**：${outcome.feedback.trim()}`)
  }
  return lines.join('\n')
}

/** One ledger section for an accept_milestone outcome. */
export function acceptanceLedger(args, outcome, time = formatTime()) {
  const decision = {
    accepted: '验收通过',
    rework: '需要返工',
    skipped: '用户跳过验收',
    timeout: '倒计时结束，自动通过',
    cancelled: '已取消（用户关闭了验收卡）',
  }[outcome.decision] ?? outcome.decision
  const lines = [`### 里程碑验收 · ${args.milestone} · ${time}`, '']
  lines.push('**完成内容**', '', args.summary, '', '**验证证据**', '', args.evidence, '')
  if (args.gaps !== undefined) lines.push('**未完成或风险**', '', args.gaps, '')
  lines.push(`**用户决定**：${decision}`)
  if (typeof outcome.feedback === 'string' && outcome.feedback.trim() !== '') {
    lines.push('', `**用户反馈**：${outcome.feedback.trim()}`)
  }
  return lines.join('\n')
}

/** One ledger section for a confirm_delivery outcome. */
export function deliveryLedger(args, outcome, time = formatTime()) {
  const decision = {
    confirmed: '确认并交付',
    adjust: '需要调整',
    skipped: '用户跳过确认，自动交付',
    timeout: '倒计时结束，自动交付',
    cancelled: '已取消（用户关闭了交付确认卡）',
  }[outcome.decision] ?? outcome.decision
  const lines = [`### 交付确认 · ${time}`, '']
  lines.push('**完成程度**', '', args.completion, '', '**交付内容**', '', args.delivered, '')
  if (args.gaps !== undefined) lines.push('**未完成或限制**', '', args.gaps, '')
  if (args.evidence !== undefined) lines.push('**验证**', '', args.evidence, '')
  lines.push(`**用户决定**：${decision}`)
  if (typeof outcome.feedback === 'string' && outcome.feedback.trim() !== '') {
    lines.push('', `**用户反馈**：${outcome.feedback.trim()}`)
  }
  return lines.join('\n')
}
