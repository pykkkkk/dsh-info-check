import assert from 'node:assert/strict'
import {
  applyProgressEvent, createProgressState, normalizeProgress,
} from '../lib/progress.js'
import { hasDeliverableNewer } from '../lib/acceptance.js'

let state = createProgressState(true)
state = applyProgressEvent(state, {
  type: 'tool/call',
  time: 100,
  data: {
    name: 'info_check',
    callId: 'call-info',
    arguments: JSON.stringify({
      milestones: [
        { id: 'm1', title: 'First' },
        { id: 'm2', title: 'Second' },
      ],
    }),
  },
})
assert.equal(state.phase, 'planned')
assert.equal(state.milestones.length, 2)
assert.equal(state.active, 'm1')

state = applyProgressEvent(state, {
  type: 'tool/call', time: 110, data: { name: 'confirm_milestone', callId: 'call-plan', arguments: '{}' },
})
assert.equal(state.phase, 'working')
assert.equal(state.locked, true)

state = applyProgressEvent(state, {
  type: 'tool/call',
  time: 115,
  data: {
    name: 'info_check',
    callId: 'call-info-2',
    arguments: JSON.stringify({ milestones: [{ id: 'm3', title: 'Third' }] }),
  },
})
assert.equal(state.milestones.length, 2)
assert.equal(state.locked, true)
assert.deepEqual(state.accepted, [])
state = applyProgressEvent(state, {
  type: 'tool/call',
  time: 116,
  data: { name: 'accept_milestone', callId: 'call-unknown', arguments: JSON.stringify({ milestone: 'm3' }) },
})
assert.equal(state.milestones.length, 2)
assert.equal(state.phase, 'working')

state = applyProgressEvent(state, {
  type: 'tool/call',
  time: 120,
  data: { name: 'accept_milestone', callId: 'call-accept-1', arguments: JSON.stringify({ milestone: 'm1' }) },
})
assert.equal(state.phase, 'accepting')
assert.equal(state.pendingMilestone, 'm1')

state = applyProgressEvent(state, {
  type: 'tool/result',
  time: 130,
  data: {
    message: {
      toolCallId: 'call-accept-1',
      content: [{ type: 'text', text: JSON.stringify({ decision: 'accepted', proceed: true }) }],
    },
  },
})
assert.equal(state.phase, 'working')
assert.deepEqual(state.accepted, ['m1'])
assert.equal(state.active, 'm2')

state = applyProgressEvent(state, {
  type: 'tool/call',
  time: 140,
  data: { name: 'accept_milestone', callId: 'call-accept-2', arguments: JSON.stringify({ milestone: 'm2' }) },
})
state = applyProgressEvent(state, {
  type: 'tool/result',
  time: 150,
  data: {
    message: {
      toolCallId: 'call-accept-2',
      content: [{ type: 'text', text: JSON.stringify({ decision: 'rework', proceed: false }) }],
    },
  },
})
assert.deepEqual(state.accepted, ['m1'])
assert.equal(state.phase, 'working')
assert.equal(state.active, 'm2')

state = applyProgressEvent(state, {
  type: 'tool/call', time: 160, data: { name: 'confirm_delivery', callId: 'call-deliver', arguments: '{}' },
})
assert.equal(state.phase, 'delivering')
state = applyProgressEvent(state, {
  type: 'tool/result',
  time: 170,
  data: {
    message: {
      toolCallId: 'call-deliver',
      content: [{ type: 'text', text: JSON.stringify({ decision: 'confirmed', proceed: true }) }],
    },
  },
})
assert.equal(state.phase, 'delivered')
assert.deepEqual(state.accepted, ['m1', 'm2'])

state = applyProgressEvent(state, {
  type: 'command/run', data: { name: 'dsh-info-check', args: 'off' },
})
assert.equal(state.enabled, false)
state = normalizeProgress(state, true)
assert.equal(state.enabled, false)

const stats = {
  'old.js': { mtimeMs: 100 },
  'new.js': { mtimeMs: 300 },
}
assert.equal(hasDeliverableNewer(['old.js'], 200, file => stats[file]), false)
assert.equal(hasDeliverableNewer(['old.js', 'new.js'], 200, file => stats[file]), true)
assert.equal(hasDeliverableNewer([], 200, file => stats[file]), false)
assert.equal(hasDeliverableNewer(['missing.js'], 200, () => { throw new Error('ENOENT') }), false)

console.log('dsh-info-check progress tests: ok')
