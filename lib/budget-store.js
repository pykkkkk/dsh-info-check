/**
 * Persistent budget contract and budget-standard storage under the ledger dir.
 */
import { readFileSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, join, resolve, sep } from 'node:path'
import {
  MAX_BUDGET_STANDARD_CHARS, extractBudgetManualStandard, formatBudgetStandard,
} from './budget.js'

const EMPTY_SESSION = () => ({
  signed: false,
  proposal: null,
  initial: { amount: 0, milestones: [], breakdown: [] },
  extra: 0,
  spent: 0,
  pendingReview: null,
  settlement: null,
  taskBook: '',
  updatedAt: 0,
})

export class BudgetStore {
  constructor(ctx, getOptions) {
    this.ctx = ctx
    this.getOptions = getOptions
    this.latestValue = undefined
  }

  latestPath() {
    const home = process.env.DSH_HOME
    return join(typeof home === 'string' && home.trim() !== '' ? home : process.cwd(), '.dsh-info-check-contract.json')
  }

  async remember(session, state) {
    if (session === undefined || state === undefined) return
    this.latestValue = { sessionId: String(session.id), ...state }
    try {
      await writeFile(this.latestPath(), `${JSON.stringify(this.latestValue, null, 2)}\n`, 'utf8')
    } catch {
      // The in-memory page state still works if the cache cannot be written.
    }
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
        state: join(directory, 'budget-state.json'),
        standard: join(directory, 'budget-standard.md'),
      }
    } catch {
      return undefined
    }
  }

  async load(session) {
    const paths = this.paths(session)
    if (paths === undefined) return undefined
    let all = {}
    try {
      const parsed = JSON.parse(await readFile(paths.state, 'utf8'))
      if (parsed !== null && typeof parsed === 'object') all = parsed
    } catch {
      // First budget.
    }
    const sid = String(session.id)
    const sessions = all.sessions !== null && typeof all.sessions === 'object' ? all.sessions : {}
    const history = Array.isArray(all.history) ? all.history : []
    const state = sessions[sid] !== null && typeof sessions[sid] === 'object'
      ? sessions[sid]
      : EMPTY_SESSION()
    return { paths, all: { ...all, sessions, history }, state }
  }

  async save(loadResult) {
    if (loadResult === undefined) return
    const { paths, all } = loadResult
    await mkdir(paths.directory, { recursive: true })
    await writeFile(paths.state, `${JSON.stringify(all, null, 2)}\n`, 'utf8')
  }

  async begin(session) {
    const loaded = await this.load(session)
    if (loaded === undefined) return
    loaded.all.sessions[String(session.id)] = EMPTY_SESSION()
    await this.save(loaded)
  }

  async sign(session, plan) {
    const loaded = await this.load(session)
    if (loaded === undefined) return undefined
    const state = {
      ...loaded.state,
      signed: true,
      proposal: null,
      updatedAt: Date.now(),
      initial: {
        amount: plan.total,
        milestones: plan.milestones,
        ...(plan.assumptions === undefined ? {} : { assumptions: plan.assumptions }),
        ...(plan.risks === undefined ? {} : { risks: plan.risks }),
      },
    }
    loaded.all.sessions[String(session.id)] = state
    await this.save(loaded)
    await this.remember(session, state)
    return state
  }

  async saveTaskBook(session, taskBook) {
    const loaded = await this.load(session)
    if (loaded === undefined) return undefined
    const state = {
      ...loaded.state,
      taskBook: typeof taskBook === 'string' ? taskBook : '',
      updatedAt: Date.now(),
    }
    loaded.all.sessions[String(session.id)] = state
    await this.save(loaded)
    await this.remember(session, state)
    return state
  }

  async saveProposal(session, plan) {
    const loaded = await this.load(session)
    if (loaded === undefined) return undefined
    const state = {
      ...loaded.state,
      proposal: {
        total: plan.total,
        milestones: plan.milestones,
        round: plan.round,
        ...(plan.adjustment === undefined ? {} : { adjustment: plan.adjustment }),
      },
      updatedAt: Date.now(),
    }
    loaded.all.sessions[String(session.id)] = state
    await this.save(loaded)
    await this.remember(session, state)
    return state
  }

  async markPending(session, milestone) {
    const loaded = await this.load(session)
    if (loaded === undefined) return
    loaded.all.sessions[String(session.id)] = {
      ...loaded.state,
      pendingReview: milestone,
    }
    await this.save(loaded)
  }

  async review(session, review, decision) {
    const loaded = await this.load(session)
    if (loaded === undefined) return undefined
    const state = {
      ...loaded.state,
      extra: decision === 'approved'
        ? loaded.state.extra + review.requestedExtra
        : loaded.state.extra,
      spent: Math.max(loaded.state.spent, review.spent),
      pendingReview: null,
      updatedAt: Date.now(),
    }
    loaded.all.sessions[String(session.id)] = state
    await this.save(loaded)
    await this.remember(session, state)
    return state
  }

  async settle(session, settlement, rating) {
    const loaded = await this.load(session)
    if (loaded === undefined) return undefined
    const state = {
      ...loaded.state,
      spent: Math.max(loaded.state.spent, settlement.finalSpent),
      updatedAt: Date.now(),
      settlement: {
        finalSpent: settlement.finalSpent,
        summary: settlement.summary,
        rating,
        at: new Date().toISOString(),
      },
    }
    loaded.all.sessions[String(session.id)] = state
    const history = [
      ...loaded.all.history,
      {
        initial: state.initial.amount,
        milestones: state.initial.milestones,
        extra: state.extra,
        finalSpent: settlement.finalSpent,
        rating,
        at: new Date().toISOString(),
      },
    ].slice(-50)
    loaded.all.history = history
    if (history.length > 0 && history.length % 3 === 0) {
      let existing = ''
      try {
        existing = await readFile(loaded.paths.standard, 'utf8')
      } catch {
        // First budget standard.
      }
      const manual = extractBudgetManualStandard(existing)
      await writeFile(loaded.paths.standard, formatBudgetStandard(history, manual), 'utf8')
    }
    await this.save(loaded)
    await this.remember(session, state)
    return state
  }

  standardFor(session) {
    const paths = this.paths(session)
    if (paths === undefined) return ''
    try {
      return readFileSync(paths.standard, 'utf8').slice(0, MAX_BUDGET_STANDARD_CHARS)
    } catch {
      return ''
    }
  }

  async latest() {
    if (this.latestValue !== undefined) return this.latestValue
    try {
      const parsed = JSON.parse(await readFile(this.latestPath(), 'utf8'))
      if (parsed !== null && typeof parsed === 'object') {
        this.latestValue = parsed
        return parsed
      }
    } catch {
      // No contract page snapshot yet.
    }
    return undefined
  }
}
