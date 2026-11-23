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
  contractId: '',
  taskNumber: '',
  cwd: '',
  startedAt: 0,
  signed: false,
  proposal: null,
  initial: { amount: 0, milestones: [], breakdown: [] },
  extra: 0,
  spent: 0,
  pendingReview: null,
  settlement: null,
  acceptances: [],
  budgetReviews: [],
  situations: [],
  delivery: null,
  taskBook: '',
  taskBookAt: 0,
  signedAt: 0,
  costBaseline: 0,
  costBaselineAt: 0,
  updatedAt: 0,
})

export class BudgetStore {
  constructor(ctx, getOptions) {
    this.ctx = ctx
    this.getOptions = getOptions
    this.contractsValue = undefined
  }

  contractsPath() {
    const home = process.env.DSH_HOME
    return join(typeof home === 'string' && home.trim() !== '' ? home : process.cwd(), '.dsh-info-check-contracts.json')
  }

  legacyContractPath() {
    const home = process.env.DSH_HOME
    return join(typeof home === 'string' && home.trim() !== '' ? home : process.cwd(), '.dsh-info-check-contract.json')
  }

  async readContracts() {
    if (Array.isArray(this.contractsValue)) return this.contractsValue
    try {
      const parsed = JSON.parse(await readFile(this.contractsPath(), 'utf8'))
      if (Array.isArray(parsed?.contracts)) {
        this.contractsValue = parsed.contracts
        return this.contractsValue
      }
    } catch {
      // Try the single-contract cache written by earlier versions.
    }
    try {
      const parsed = JSON.parse(await readFile(this.legacyContractPath(), 'utf8'))
      if (parsed !== null && typeof parsed === 'object' && typeof parsed.taskBook === 'string') {
        this.contractsValue = [{ ...parsed, contractId: parsed.contractId ?? parsed.sessionId ?? 'legacy' }]
        return this.contractsValue
      }
    } catch {
      // No contract list yet.
    }
    this.contractsValue = []
    return this.contractsValue
  }

  async remember(session, state) {
    if (session === undefined || state === undefined) return
    const entry = {
      sessionId: String(session.id),
      ...state,
      contractId: state.contractId || String(session.id),
    }
    const current = await this.readContracts()
    const next = current.filter(item => item.contractId !== entry.contractId)
    next.push(entry)
    next.sort((a, b) => (Number(b.updatedAt) || 0) - (Number(a.updatedAt) || 0))
    this.contractsValue = next.slice(0, 50)
    try {
      await writeFile(this.contractsPath(), `${JSON.stringify({ version: 1, contracts: this.contractsValue }, null, 2)}\n`, 'utf8')
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
    const now = new Date()
    const two = value => String(value).padStart(2, '0')
    const taskNumber = `${two(now.getFullYear() % 100)}${two(now.getMonth() + 1)}${two(now.getDate())}${two(now.getHours())}${two(now.getMinutes())}`
    const at = now.getTime()
    loaded.all.sessions[String(session.id)] = {
      ...EMPTY_SESSION(),
      contractId: `c-${taskNumber}-${Math.random().toString(36).slice(2, 8)}`,
      taskNumber,
      cwd: this.ctx.workingDirectory.get(session),
      startedAt: at,
      updatedAt: at,
    }
    await this.save(loaded)
  }

  async sign(session, plan, costBaseline) {
    const loaded = await this.load(session)
    if (loaded === undefined) return undefined
    const state = {
      ...loaded.state,
      signed: true,
      proposal: null,
      signedAt: Date.now(),
      costBaseline: Number(costBaseline) || 0,
      costBaselineAt: Date.now(),
      updatedAt: Date.now(),
      initial: {
        amount: plan.total,
        milestones: plan.milestones,
        ...(plan.forecast === undefined ? {} : { forecast: plan.forecast }),
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
      taskBookAt: Date.now(),
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
      budgetReviews: [
        ...(Array.isArray(loaded.state.budgetReviews) ? loaded.state.budgetReviews : []),
        {
          milestone: review.milestone,
          spent: review.spent,
          requestedExtra: review.requestedExtra,
          decision,
          breakdown: review.breakdown ?? [],
          notes: review.notes ?? '',
          at: new Date().toISOString(),
        },
      ].slice(-40),
      updatedAt: Date.now(),
    }
    loaded.all.sessions[String(session.id)] = state
    await this.save(loaded)
    await this.remember(session, state)
    return state
  }

  async recordAcceptance(session, report) {
    const loaded = await this.load(session)
    if (loaded === undefined) return undefined
    const state = {
      ...loaded.state,
      acceptances: [
        ...(Array.isArray(loaded.state.acceptances) ? loaded.state.acceptances : []),
        {
          milestone: report.milestone,
          summary: report.summary,
          evidence: report.evidence,
          gaps: report.gaps ?? '',
          files: Array.isArray(report.files) ? report.files : [],
          decision: report.decision,
          at: new Date().toISOString(),
        },
      ].slice(-40),
      updatedAt: Date.now(),
    }
    loaded.all.sessions[String(session.id)] = state
    await this.save(loaded)
    await this.remember(session, state)
    return state
  }

  async recordDelivery(session, report) {
    const loaded = await this.load(session)
    if (loaded === undefined) return undefined
    const state = {
      ...loaded.state,
      delivery: {
        completion: report.completion,
        delivered: report.delivered,
        gaps: report.gaps ?? '',
        evidence: report.evidence ?? '',
        decision: report.decision,
        at: new Date().toISOString(),
      },
      updatedAt: Date.now(),
    }
    loaded.all.sessions[String(session.id)] = state
    await this.save(loaded)
    await this.remember(session, state)
    return state
  }

  async recordSituation(session, report) {
    const loaded = await this.load(session)
    if (loaded === undefined) return undefined
    const state = {
      ...loaded.state,
      situations: [
        ...(Array.isArray(loaded.state.situations) ? loaded.state.situations : []),
        {
          question: report.question,
          suggestions: Array.isArray(report.suggestions) ? report.suggestions : [],
          selected: Array.isArray(report.selected) ? report.selected : [],
          opinion: report.opinion ?? '',
          decision: report.decision,
          at: new Date().toISOString(),
        },
      ].slice(-80),
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
    const contracts = await this.readContracts()
    return contracts[0]
  }

  async contracts() {
    return this.readContracts()
  }
}
