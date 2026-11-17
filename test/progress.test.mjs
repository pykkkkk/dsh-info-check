import assert from 'node:assert/strict'
import {
  applyProgressEvent, createProgressState, normalizeProgress,
} from '../lib/progress.js'

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

console.log('dsh-info-check progress tests: ok')
