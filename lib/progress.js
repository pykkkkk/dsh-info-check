/**
 * Pure reducer for the per-session milestone progress projection.
 * The projection persists this object; the client turns it into the bar.
 */

export const PROGRESS_STATE_VERSION = 2

/** Parse the editable brief's milestone list, including user-added rows. */
export function parseMilestonesFromBrief(text) {
  const source = String(text ?? '')
  const section = /【里程碑】([\s\S]*?)(?=\n【[^】]+】|$)/.exec(source)
  if (section === null) return []
  const seen = new Set()
  const result = []
  for (const line of section[1].split(/\r?\n/)) {
    const match = /^\s*\d+[.)]\s*([A-Za-z0-9_-]{1,40})\s*(?:[—–-]\s*)?(.*)$/.exec(line)
    if (match === null || seen.has(match[1])) continue
    seen.add(match[1])
    result.push({ id: match[1], title: (match[2] || match[1]).trim().slice(0, 120) })
  }
  return result
}

function asString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function parseJson(value) {
  if (typeof value !== 'string' || value.trim() === '') return undefined
  try {
    return JSON.parse(value)
  } catch {
    return undefined
  }
}

function textBlocks(content) {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content
    .map(block => (block !== null && typeof block === 'object' && typeof block.text === 'string' ? block.text : ''))
    .filter(Boolean)
    .join('\n')
}

function resultDecision(message) {
  if (message === null || typeof message !== 'object') return undefined
  const value = parseJson(textBlocks(message.content))
  return typeof value?.decision === 'string' ? value.decision : undefined
}

function cleanMilestones(value) {
  if (!Array.isArray(value)) return []
  const seen = new Set()
  const result = []
  for (const item of value) {
    if (item === null || typeof item !== 'object') continue
    const id = asString(item.id)
    const title = asString(item.title) || id
    if (id === '' || seen.has(id)) continue
    seen.add(id)
    result.push({ id: id.slice(0, 80), title: title.slice(0, 120) })
  }
  return result
}

export function createProgressState(enabled = true) {
  return {
    version: PROGRESS_STATE_VERSION,
    enabled: enabled !== false,
    milestones: [],
    accepted: [],
    active: null,
    phase: 'idle',
    stageStartedAt: null,
    pendingCallId: null,
    pendingMilestone: null,
    pendingDeliveryCallId: null,
    locked: false,
  }
}

export function normalizeProgress(value, enabledFallback = true) {
  const source = value !== null && typeof value === 'object' ? value : {}
  const milestones = cleanMilestones(source.milestones)
  const known = new Set(milestones.map(item => item.id))
  const accepted = Array.isArray(source.accepted)
    ? source.accepted.map(asString).filter(id => id !== '' && known.has(id))
    : []
  const active = asString(source.active)
  const phase = ['idle', 'planned', 'working', 'accepting', 'paused', 'delivering', 'delivered'].includes(source.phase)
    ? source.phase
    : 'idle'
  return {
    version: PROGRESS_STATE_VERSION,
    enabled: source.enabled === undefined ? enabledFallback !== false : source.enabled !== false,
    milestones,
    accepted: [...new Set(accepted)],
    active: known.has(active) ? active : (milestones[0]?.id ?? null),
    phase,
    stageStartedAt: Number.isFinite(Number(source.stageStartedAt)) ? Number(source.stageStartedAt) : null,
    pendingCallId: typeof source.pendingCallId === 'string' ? source.pendingCallId : null,
    pendingMilestone: known.has(asString(source.pendingMilestone)) ? asString(source.pendingMilestone) : null,
    pendingDeliveryCallId: typeof source.pendingDeliveryCallId === 'string' ? source.pendingDeliveryCallId : null,
    locked: source.locked === true,
  }
}

function nextActive(milestones, accepted, fallback) {
  const done = new Set(accepted)
  return milestones.find(item => !done.has(item.id))?.id ?? fallback ?? milestones[milestones.length - 1]?.id ?? null
}

function acceptedFor(state, milestone) {
  return state.accepted.includes(milestone) ? state.accepted : [...state.accepted, milestone]
}

export function applyProgressEvent(value, event, enabledFallback = true) {  let state = normalizeProgress(value, enabledFallback)
  if (event === null || typeof event !== 'object') return state

  if (event.type === 'command/run' && event.data?.name === 'dsh-info-check') {
    const command = asString(event.data.args).toLowerCase()
    if (command === 'on') return { ...state, enabled: true }
    if (command === 'off') return { ...state, enabled: false }
    if (command === 'reset') return createProgressState(state.enabled)
    return state
  }

  if (event.type === 'tool/call') {
    const name = asString(event.data?.name)
    const args = parseJson(event.data?.arguments)
    const callId = typeof event.data?.callId === 'string' ? event.data.callId : null
    if (name === 'info_check') {
      if (state.locked && state.phase !== 'delivered' && state.phase !== 'paused') return state
      const milestones = cleanMilestones(args?.milestones)
      return {
        ...state,
        milestones,
        accepted: [],
        active: milestones[0]?.id ?? null,
        phase: milestones.length === 0 ? 'idle' : 'planned',
        stageStartedAt: event.time ?? null,
        pendingCallId: null,
        pendingMilestone: null,
        pendingDeliveryCallId: null,
        locked: false,
      }
    }
    if (name === 'confirm_milestone' && state.milestones.length > 0) {
      return {
        ...state,
        phase: 'working',
        active: nextActive(state.milestones, state.accepted, state.active),
        stageStartedAt: event.time ?? state.stageStartedAt,
        locked: true,
      }
    }
    if (name === 'accept_milestone') {
      const milestone = asString(args?.milestone)
      if (milestone === '') return state
      if (!state.milestones.some(item => item.id === milestone)) return state
      return {
        ...state,
        active: milestone,
        phase: 'accepting',
        stageStartedAt: event.time ?? state.stageStartedAt,
        pendingCallId: callId,
        pendingMilestone: milestone,
      }
    }
    if (name === 'confirm_delivery') {
      return {
        ...state,
        phase: 'delivering',
        stageStartedAt: event.time ?? state.stageStartedAt,
        pendingDeliveryCallId: callId,
      }
    }
    return state
  }

  if (event.type !== 'tool/result') return state
  const message = event.data?.message
  const callId = typeof message?.toolCallId === 'string'
    ? message.toolCallId
    : typeof message?.source?.callId === 'string' ? message.source.callId : null
  const decision = resultDecision(message)

  if (!state.locked && state.phase === 'planned') {
    const result = parseJson(textBlocks(message?.content))
    const edited = parseMilestonesFromBrief(result?.edited_brief)
    if (edited.length > 0) {
      state = {
        ...state,
        milestones: edited,
        active: edited[0]?.id ?? null,
      }
    }
  }

  if (callId !== null && callId === state.pendingCallId && state.pendingMilestone !== null) {
    const milestone = state.pendingMilestone
    if (decision === 'accepted' || decision === 'timeout' || decision === 'skipped') {
      const accepted = acceptedFor(state, milestone)
      return {
        ...state,
        accepted,
        active: nextActive(state.milestones, accepted, milestone),
        phase: 'working',
        stageStartedAt: event.time ?? state.stageStartedAt,
        pendingCallId: null,
        pendingMilestone: null,
      }
    }
    if (decision === 'paused') {
      return {
        ...state,
        phase: 'paused',
        locked: false,
        pendingCallId: null,
        pendingMilestone: null,
        stageStartedAt: event.time ?? state.stageStartedAt,
      }
    }
    return {
      ...state,
      phase: 'working',
      active: milestone,
      stageStartedAt: event.time ?? state.stageStartedAt,
      pendingCallId: null,
      pendingMilestone: null,
    }
  }

  if (callId !== null && callId === state.pendingDeliveryCallId) {
    if (decision === 'confirmed') {
      return {
        ...state,
        accepted: state.milestones.map(item => item.id),
        active: state.milestones[state.milestones.length - 1]?.id ?? null,
        phase: 'delivered',
        pendingDeliveryCallId: null,
        stageStartedAt: event.time ?? state.stageStartedAt,
      }
    }
    return {
      ...state,
      phase: 'working',
      pendingDeliveryCallId: null,
      stageStartedAt: event.time ?? state.stageStartedAt,
    }
  }

  return state
}

/** Never let a projection bug fail session loading; keep the last good state. */
export function applyProgressSafely(state, event, enabledFallback = true, onError) {
  try {
    return applyProgressEvent(state, event, enabledFallback)
  } catch (error) {
    try {
      onError?.(error)
    } catch {
      // Logging must never replace the original state.
    }
    return normalizeProgress(state, enabledFallback)
  }
}
