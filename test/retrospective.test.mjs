import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  MAX_STANDARD_CHARS, analyzeTask, appendRetrospective, buildQualityStandard,
  createQualityState, extractManualStandard, recordTask, shouldUpdateQualityStandard,
} from '../lib/retrospective.js'
import { RetrospectiveStore } from '../lib/retrospective-store.js'
import { conflictsWithPreviousAcceptance } from '../lib/acceptance.js'

assert.equal(conflictsWithPreviousAcceptance({ turn: 5, milestone: 'm1' }, 5, 'm2'), true)
assert.equal(conflictsWithPreviousAcceptance({ turn: 5, milestone: 'm1' }, 5, 'm1'), false)
assert.equal(conflictsWithPreviousAcceptance({ turn: 5, milestone: 'm1' }, 6, 'm2'), false)
assert.equal(conflictsWithPreviousAcceptance(undefined, 5, 'm2'), false)

const events = [
  { type: 'acceptance', decision: 'accepted', milestone: 'm1', notes: '先给证据' },
  { type: 'acceptance', decision: 'rework', milestone: 'm2', feedback: '验证证据不够' },
  { type: 'acceptance', decision: 'paused', milestone: 'm2' },
  { type: 'delivery', decision: 'adjust', feedback: '限制写得不清楚' },
  { type: 'delivery', decision: 'confirmed' },
]
const summary = analyzeTask(events)
assert.equal(summary.milestones, 3)
assert.equal(summary.accepted, 1)
assert.equal(summary.reworked, 1)
assert.equal(summary.paused, 1)
assert.equal(summary.adjustments, 1)
assert.equal(summary.feedback[0], '验证证据不够')
assert.equal(summary.adjustmentsFeedback[0], '限制写得不清楚')
assert.ok(summary.suggestions.length >= 2)

const first = appendRetrospective('', 1, '2026-11-17 10:00:00', summary)
const second = appendRetrospective(first, 2, '2026-11-17 11:00:00', summary)
assert.match(first, /# 任务复盘记录/)
assert.match(second, /## 复盘 1/)
assert.match(second, /## 复盘 2/)
assert.equal((second.match(/## 复盘 /g) ?? []).length, 2)

let state = createQualityState()
assert.equal(shouldUpdateQualityStandard(state), false)
state = recordTask(state, summary, '2026-11-17T02:00:00.000Z')
state = recordTask(state, summary, '2026-11-17T03:00:00.000Z')
assert.equal(shouldUpdateQualityStandard(state), false)
state = recordTask(state, summary, '2026-11-17T04:00:00.000Z')
assert.equal(shouldUpdateQualityStandard(state), true)
const standard = buildQualityStandard(state, '手工规则：先跑回归。')
assert.match(standard, /用户工作质量标准/)
assert.match(standard, /手工规则：先跑回归/)
assert.equal(extractManualStandard(standard), '手工规则：先跑回归。')
assert.ok(standard.length <= MAX_STANDARD_CHARS)
assert.ok(buildQualityStandard(state, 'x'.repeat(MAX_STANDARD_CHARS + 500)).length <= MAX_STANDARD_CHARS)

const directory = await mkdtemp(join(tmpdir(), 'dsh-info-check-retrospective-'))
try {
  const ctx = { workingDirectory: { get: () => directory } }
  const store = new RetrospectiveStore(ctx, () => ({ path: '.dsh-info-check/ledger.md' }))
  const written = await store.record({}, events)
  assert.equal(written.status, 'written')
  assert.equal(written.taskNumber, 1)
  assert.equal(written.standardUpdated, false)
  await store.record({}, events)
  const third = await store.record({}, events)
  assert.equal(third.taskNumber, 3)
  assert.equal(third.standardUpdated, true)

  const reviews = await readFile(join(directory, '.dsh-info-check', 'retrospectives.md'), 'utf8')
  assert.equal((reviews.match(/## 复盘 /g) ?? []).length, 3)
  const quality = await readFile(join(directory, '.dsh-info-check', 'quality-standard.md'), 'utf8')
  assert.match(quality, /手工补充/)
  assert.match(store.standardFor({}), /用户工作质量标准/)
  await writeFile(join(directory, '.dsh-info-check', 'quality-standard.md'), quality.replace('（可在这里补充你的个人标准）', '手工规则：先跑回归。'), 'utf8')
  await store.record({}, events)
  await store.record({}, events)
  const sixth = await store.record({}, events)
  assert.equal(sixth.standardUpdated, true)
  assert.equal(await store.rebuildStandard({}), true)
  assert.match(await readFile(join(directory, '.dsh-info-check', 'quality-standard.md'), 'utf8'), /手工规则：先跑回归/)
  const saved = JSON.parse(await readFile(join(directory, '.dsh-info-check', 'quality-state.json'), 'utf8'))
  assert.equal(saved.taskCount, 6)
} finally {
  await rm(directory, { recursive: true, force: true })
}

console.log('dsh-info-check retrospective tests: ok')
