import assert from 'node:assert/strict'
import {
  ACCEPT_LABEL, ADJUST_DELIVERY_LABEL, ADJUST_MILESTONE_LABEL, APPROVE_MILESTONE_LABEL, DELIVER_LABEL, PAUSE_LABEL, REWORK_LABEL, SKIP_LABEL,
  acceptanceDetail, acceptanceLedger, acceptanceOutcome,
  briefMarkdown, deliveryDetail, deliveryLedger, deliveryOutcome,
  infoCheckLedger, intentOutcome, milestoneLedger, milestoneOutcome, numberPoints, readFlag,
  stripRecommended, validateAcceptance, validateDelivery, validateInfoCheck, validateMilestone,
} from '../lib/pure.js'

assert.equal(stripRecommended('开始执行（推荐）'), '开始执行')
assert.equal(stripRecommended('Approve (Recommended)'), 'Approve')
assert.equal(stripRecommended('按此方案执行（推荐）'), '按此方案执行')

assert.equal(readFlag({ get: () => false }, true), false)
assert.equal(readFlag({ get: () => true }, false), true)
assert.equal(readFlag(false, true), false)
assert.equal(readFlag(undefined, true), true)

const brief = validateInfoCheck({
  understanding: '给登录页加一个按钮，并把它做得和现有按钮一致。',
  questions: [
    {
      id: 'scope',
      header: '范围',
      question: '只做功能还是连同样式一起？',
      options: [
        { label: '功能和样式一起（推荐）', description: '一次做到可验收' },
        { label: '只做功能' },
      ],
    },
    {
      id: 'states',
      header: '状态',
      question: '需要覆盖哪些按钮状态？',
      options: [
        { label: 'hover / disabled / loading（推荐）' },
        { label: '只做默认态' },
      ],
      multi_select: true,
    },
  ],
  quality_bar: ['与现有按钮使用同一套 token', 'hover / disabled / loading 三态可辨'],
  out_of_scope: ['不改导航结构'],
  milestones: [{ id: 'm1', title: '功能可用' }, { id: 'm2', title: '视觉达标' }],
}, 3)
assert.equal(brief.qualityBar.length, 2)
assert.equal(brief.milestones[1].id, 'm2')

const markdown = briefMarkdown(brief)
assert.match(markdown, /【我的理解】/)
assert.match(markdown, /【完成标准】/)
assert.match(markdown, /【范围外】/)
assert.match(markdown, /【里程碑】/)
assert.match(markdown, /m1/)

assert.throws(() => validateInfoCheck({
  understanding: 'x',
  questions: [{ id: 'intent-brief', question: 'q' }],
  quality_bar: ['x'],
  milestones: [{ id: 'm1', title: 'x' }],
}, 3), /reserved/)

assert.throws(() => validateInfoCheck({
  understanding: 'x',
  questions: [
    { id: 'a', question: 'q1' },
    { id: 'a', question: 'q2' },
  ],
  quality_bar: ['x'],
  milestones: [{ id: 'm1', title: 'x' }],
}, 3), /duplicate/)

assert.throws(() => validateInfoCheck({
  understanding: 'x',
  questions: [{ id: 'a', question: 'q1' }],
  quality_bar: ['x'],
  milestones: [{ id: 'm1', title: 'x' }],
}, 0), /at most/)

assert.throws(() => validateInfoCheck({
  understanding: 'x',
  questions: [{ id: 'a', question: 'q1' }],
  quality_bar: ['x'],
  milestones: [{ id: 'm1', title: 'x' }],
}, 3), /at least 2/)

assert.equal(validateInfoCheck({
  understanding: 'x',
  questions: [{ id: 'a', question: 'q1' }],
  quality_bar: ['x'],
  milestones: [{ id: 'm1', title: 'x' }],
}, 1).questions.length, 1)

const milestone = validateMilestone({ milestone: 'm1', plan: '改按钮组件，补三态样式', impact: '登录页' })
assert.equal(milestone.milestone, 'm1')

const ledger = infoCheckLedger(brief, {
  confirmed: true,
  editedBrief: '【我的理解】\n用户改过的理解。\n\n【完成标准】\n- 只改登录页按钮',
  answers: [{ id: 'scope', selected: ['功能和样式一起（推荐）'] }],
}, '2026-11-16 00:30:00')
assert.match(ledger, /意图核对/)
assert.match(ledger, /用户确认版/)
assert.match(ledger, /有修改/)
assert.match(ledger, /功能和样式一起/)
assert.match(ledger, /已确认/)

const sameLedger = infoCheckLedger(brief, {
  confirmed: true,
  editedBrief: briefMarkdown(brief),
  answers: [],
}, '2026-11-16 00:30:00')
assert.match(sameLedger, /无修改/)

const skipped = infoCheckLedger(brief, { confirmed: true, reason: 'skipped', editedBrief: '', answers: [] }, '2026-11-16 00:30:00')
assert.match(skipped, /关闭，按跳过处理/)

const milestoneEntry = milestoneLedger(milestone, { decision: 'timeout' }, '2026-11-16 00:31:00')
assert.match(milestoneEntry, /里程碑确认/)
assert.match(milestoneEntry, /自动跳过/)

const intent = intentOutcome({
  answers: [
    { id: 'intent-brief', selected: [], custom: '用户改过的核对单' },
    { id: 'scope', selected: ['功能和样式一起（推荐）'] },
  ],
})
assert.equal(intent.confirmed, true)
assert.equal(intent.reason, 'confirmed')
assert.equal(intent.editedBrief, '用户改过的核对单')
assert.equal(intent.answers.length, 1)
assert.equal(intent.answers[0].id, 'scope')

const intentSkipped = intentOutcome({ answers: [{ id: 'intent-brief', selected: [], custom: '  ' }] })
assert.equal(intentSkipped.confirmed, false)
assert.equal(intentSkipped.reason, 'skipped')

const approved = milestoneOutcome({ selected: [APPROVE_MILESTONE_LABEL], custom: '改过的方案' }, '原始方案')
assert.equal(approved.decision, 'approved')
assert.equal(approved.proceed, true)
assert.equal(approved.editedPlan, '改过的方案')

const approvedSame = milestoneOutcome({ selected: [APPROVE_MILESTONE_LABEL] }, '原始方案')
assert.equal(approvedSame.decision, 'approved')
assert.equal(approvedSame.editedPlan, undefined)

const adjusted = milestoneOutcome({ selected: [ADJUST_MILESTONE_LABEL], custom: '缩小范围' }, '原始方案')
assert.equal(adjusted.decision, 'adjust')
assert.equal(adjusted.proceed, false)
assert.equal(adjusted.feedback, '缩小范围')

const freeText = milestoneOutcome({ selected: [], custom: '我只想改这一处' }, '原始方案')
assert.equal(freeText.decision, 'adjust')
assert.equal(freeText.feedback, '我只想改这一处')

const skippedMilestone = milestoneOutcome({ selected: [] }, '原始方案')
assert.equal(skippedMilestone.decision, 'skipped')
assert.equal(skippedMilestone.proceed, true)

const editedMilestoneLedger = milestoneLedger(
  milestone,
  { decision: 'approved', editedPlan: '用户改过的方案' },
  '2026-11-16 00:31:00',
)
assert.match(editedMilestoneLedger, /用户确认的方案/)
assert.match(editedMilestoneLedger, /有修改/)

const acceptance = validateAcceptance({
  milestone: 'm1',
  summary: '按钮三态完成',
  evidence: 'npm test 通过',
  gaps: 'loading 文案待定',
  files: ['D:\\work\\index.js', 'D:\\work\\client.js'],
})
assert.equal(acceptance.milestone, 'm1')
assert.match(acceptanceDetail(acceptance), /【里程碑】/)
assert.match(acceptanceDetail(acceptance), /【验证证据】/)
assert.match(acceptanceDetail(acceptance), /【结果文件】/)
assert.match(acceptanceDetail(acceptance), /index\.js/)

const accepted = acceptanceOutcome({ selected: [ACCEPT_LABEL], custom: '请顺手补上暗色模式' })
assert.equal(accepted.decision, 'accepted')
assert.equal(accepted.proceed, true)
assert.equal(accepted.notes, '请顺手补上暗色模式')

const rework = acceptanceOutcome({ selected: [REWORK_LABEL] })
assert.equal(rework.decision, 'rework')
assert.equal(rework.proceed, false)

const paused = acceptanceOutcome({ selected: [PAUSE_LABEL], custom: '先整理进度' })
assert.equal(paused.decision, 'paused')
assert.equal(paused.proceed, false)
assert.equal(paused.notes, '先整理进度')

const acceptLedger = acceptanceLedger(acceptance, accepted, '2026-11-16 02:10:00')
assert.match(acceptLedger, /里程碑验收/)
assert.match(acceptLedger, /验收通过/)
assert.match(acceptLedger, /用户备注/)
assert.match(acceptLedger, /结果文件/)
assert.match(acceptLedger, /index\.js/)

const delivery = validateDelivery({
  completion: '90%：功能和样式完成，loading 文案未定',
  delivered: 'index.js / client.js',
  gaps: 'loading 文案',
  evidence: 'syntax + smoke',
})
assert.match(deliveryDetail(delivery), /【完成程度】/)
assert.match(deliveryDetail(delivery), /【交付内容】/)

const confirmed = deliveryOutcome({ selected: [DELIVER_LABEL], custom: '交付前再跑一次 smoke' })
assert.equal(confirmed.decision, 'confirmed')
assert.equal(confirmed.proceed, true)
assert.equal(confirmed.notes, '交付前再跑一次 smoke')

const adjustDelivery = deliveryOutcome({ selected: [ADJUST_DELIVERY_LABEL], custom: '再补 loading' })
assert.equal(adjustDelivery.decision, 'adjust')
assert.equal(adjustDelivery.proceed, false)
assert.equal(adjustDelivery.feedback, '再补 loading')

const deliveryLog = deliveryLedger(delivery, adjustDelivery, '2026-11-16 02:11:00')
assert.match(deliveryLog, /交付确认/)
assert.match(deliveryLog, /需要调整/)

assert.equal(numberPoints('- 第一点\n- 第二点'), '1. 第一点\n\n2. 第二点')
assert.equal(numberPoints('先做这个\n\n再做那个'), '1. 先做这个\n\n2. 再做那个')
assert.equal(numberPoints('1. 唯一一点'), '1. 唯一一点')
assert.equal(
  numberPoints('1. 运行：\n\n```sh\nnpm test\n```\n\n2. 验证'),
  '1. 运行：\n\n```sh\nnpm test\n```\n\n2. 验证',
)
assert.equal(numberPoints('# 方案\n- 第一点'), '# 方案\n\n1. 第一点')

const skipIntent = intentOutcome({ answers: [{ id: 'intent-brief', selected: [SKIP_LABEL] }] })
assert.equal(skipIntent.confirmed, true)
assert.equal(skipIntent.reason, 'skipped')
assert.equal(milestoneOutcome({ selected: [SKIP_LABEL] }, 'plan').decision, 'skipped')
assert.equal(milestoneOutcome({ selected: [SKIP_LABEL] }, 'plan').proceed, true)
assert.equal(acceptanceOutcome({ selected: [SKIP_LABEL] }).decision, 'skipped')
assert.equal(acceptanceOutcome({ selected: [SKIP_LABEL] }).proceed, true)
assert.equal(deliveryOutcome({ selected: [SKIP_LABEL] }).decision, 'skipped')
assert.equal(deliveryOutcome({ selected: [SKIP_LABEL] }).proceed, true)
assert.match(
  infoCheckLedger(brief, { confirmed: true, reason: 'skipped', editedBrief: '', answers: [] }),
  /关闭，按跳过处理/,
)

console.log('dsh-info-check pure tests: ok')
