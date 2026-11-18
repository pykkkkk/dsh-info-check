import assert from 'node:assert/strict'
import { conflictsWithPreviousAcceptance, hasDeliverableNewer } from '../lib/acceptance.js'

assert.equal(conflictsWithPreviousAcceptance({ turn: 7, milestone: 'm1' }, 7, 'm2'), true)
assert.equal(conflictsWithPreviousAcceptance({ turn: 7, milestone: 'm1' }, 7, 'm1'), false)
assert.equal(conflictsWithPreviousAcceptance({ turn: 7, milestone: 'm1' }, 8, 'm2'), false)

const stats = new Map([
  ['old.js', { mtimeMs: 100 }],
  ['new.js', { mtimeMs: 250 }],
])
assert.equal(hasDeliverableNewer(['old.js'], 200, file => stats.get(file)), false)
assert.equal(hasDeliverableNewer(['old.js', 'new.js'], 200, file => stats.get(file)), true)
assert.equal(hasDeliverableNewer(['missing.js'], 200, () => { throw new Error('ENOENT') }), false)
assert.equal(hasDeliverableNewer([], 200, file => stats.get(file)), false)

console.log('dsh-info-check acceptance tests: ok')
