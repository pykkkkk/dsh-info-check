/**
 * A session may accept only one distinct milestone per DSH turn.
 * Re-accepting the same milestone after rework is allowed.
 */
export function conflictsWithPreviousAcceptance(last, turn, milestone) {
  if (last === undefined || last === null) return false
  if (typeof turn !== 'number' || last.turn !== turn) return false
  return last.milestone !== milestone
}

/** True when at least one listed deliverable was modified after the boundary. */
export function hasDeliverableNewer(files, boundary, stat) {
  if (!Array.isArray(files) || files.length === 0 || typeof boundary !== 'number') return false
  for (const file of files) {
    try {
      const info = stat(file)
      if (info !== null && typeof info === 'object' && Number(info.mtimeMs) > boundary) return true
    } catch {
      // Missing or unreadable files are not valid evidence.
    }
  }
  return false
}
