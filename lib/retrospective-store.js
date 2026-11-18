/**
 * Local retrospective assets under the ledger directory:
 * - retrospectives.md (all task reviews, one file)
 * - quality-standard.md (regenerated every 3 completed tasks)
 * - quality-state.json (counters and recent summaries)
 */
import { readFileSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, join, resolve, sep } from 'node:path'
import {
  MAX_STANDARD_CHARS, analyzeTask, appendRetrospective, buildQualityStandard,
  createQualityState, extractManualStandard, formatRetrospectiveSummary, recordTask, shouldUpdateQualityStandard,
} from './retrospective.js'

export class RetrospectiveStore {
  constructor(ctx, getOptions) {
    this.ctx = ctx
    this.getOptions = getOptions
  }

  paths(session) {
    if (session === undefined) return undefined
    try {
      const cwd = this.ctx.workingDirectory.get(session)
      const root = resolve(cwd)
      const ledgerPath = this.getOptions().path
      const ledgerFull = isAbsolute(ledgerPath) ? resolve(ledgerPath) : resolve(root, ledgerPath)
      if (ledgerFull !== root && !ledgerFull.startsWith(root + sep)) return undefined
      const directory = dirname(ledgerFull)
      return {
        directory,
        retrospectives: join(directory, 'retrospectives.md'),
        standard: join(directory, 'quality-standard.md'),
        state: join(directory, 'quality-state.json'),
      }
    } catch {
      return undefined
    }
  }

  standardFor(session) {
    const paths = this.paths(session)
    if (paths === undefined) return ''
    try {
      return readFileSync(paths.standard, 'utf8').slice(0, MAX_STANDARD_CHARS)
    } catch {
      return ''
    }
  }

  async rebuildStandard(session) {
    const paths = this.paths(session)
    if (paths === undefined) return false
    let state
    try {
      state = JSON.parse(await readFile(paths.state, 'utf8'))
    } catch {
      return false
    }
    if ((Number(state?.taskCount) || 0) === 0) return false
    let existing = ''
    try {
      existing = await readFile(paths.standard, 'utf8')
    } catch {
      // First rebuild.
    }
    await mkdir(paths.directory, { recursive: true })
    await writeFile(paths.standard, buildQualityStandard(state, extractManualStandard(existing)), 'utf8')
    return true
  }

  async record(session, events) {
    const paths = this.paths(session)
    if (paths === undefined || !Array.isArray(events) || events.length === 0) {
      return { status: 'empty' }
    }
    let state = createQualityState()
    try {
      const parsed = JSON.parse(await readFile(paths.state, 'utf8'))
      if (parsed !== null && typeof parsed === 'object') state = parsed
    } catch {
      // First retrospective for this workspace.
    }

    const taskNumber = (Number(state.taskCount) || 0) + 1
    const summary = analyzeTask(events)
    const date = new Date().toLocaleString('zh-CN', { hour12: false })

    let existingReviews = ''
    try {
      existingReviews = await readFile(paths.retrospectives, 'utf8')
    } catch {
      // First review.
    }
    await mkdir(paths.directory, { recursive: true })
    await writeFile(
      paths.retrospectives,
      appendRetrospective(existingReviews, taskNumber, date, summary),
      'utf8',
    )

    state = recordTask(state, summary, new Date().toISOString())
    let standardUpdated = false
    if (shouldUpdateQualityStandard(state)) {
      let existingStandard = ''
      try {
        existingStandard = await readFile(paths.standard, 'utf8')
      } catch {
        // First standard.
      }
      const manual = extractManualStandard(existingStandard)
      const standard = buildQualityStandard(state, manual)
      await writeFile(paths.standard, standard, 'utf8')
      state.standardUpdatedAt = new Date().toISOString()
      standardUpdated = true
    }
    await writeFile(paths.state, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
    return {
      status: 'written',
      taskNumber,
      standardUpdated,
      summary: formatRetrospectiveSummary(summary),
    }
  }
}

/* ------------------------------------------------------------------ */
/* Tools                                                               */
/* ------------------------------------------------------------------ */
