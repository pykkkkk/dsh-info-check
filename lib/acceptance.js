/**
 * A session may accept only one distinct milestone per DSH turn.
 * Re-accepting the same milestone after rework is allowed.
 */
export function conflictsWithPreviousAcceptance(last, turn, milestone) {
  if (last === undefined || last === null) return false
  if (typeof turn !== 'number' || last.turn !== turn) return false
  return last.milestone !== milestone
}
