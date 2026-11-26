/**
 * dsh-info-check Host half.
 *
 * Registers a policy section, the `info_check` / `confirm_budget` /
 * `accept_milestone` / `review_budget` / `confirm_delivery` /
 * `settle_budget` tools, a per-Session enabled projection, and a workspace ledger. The header switch executes
 * `/dsh-info-check on|off`; the logged command drives the projection, so each
 * conversation owns its own state.
 *
 * This file imports only Node built-ins and its own pure helpers, so the
 * bundle can be installed into any compatible DSH profile without package
 * dependencies.
 */
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { basename, dirname, isAbsolute, join, resolve, sep } from 'node:path'
import { homedir } from 'node:os'
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import {
  ACCEPT_LABEL, ACCEPT_MILESTONE_ID, ADJUST_DELIVERY_LABEL, APPROVE_MILESTONE_LABEL, DELIVER_LABEL,
  DELIVERY_CONFIRM_ID, INTENT_BRIEF_ID, MILESTONE_CONFIRM_ID, PAUSE_LABEL, REWORK_LABEL,
  acceptanceDetail, acceptanceLedger, acceptanceOutcome,
  briefMarkdown, deliveryDetail, deliveryLedger, deliveryOutcome,
  infoCheckLedger, intentOutcome, milestoneLedger, milestoneOutcome, numberPoints,
  validateAcceptance, validateDelivery, validateInfoCheck, validateMilestone,
} from './lib/pure.js'
import { formatSelfCheck, runSelfCheck } from './lib/selfcheck.js'
import { RetrospectiveStore } from './lib/retrospective-store.js'
import { hasDeliverableNewer } from './lib/acceptance.js'
import { applyProgressSafely, createProgressState, normalizeProgress, parseMilestonesFromBrief } from './lib/progress.js'
import { BudgetStore } from './lib/budget-store.js'
import { readCost } from './lib/cost.js'
import {
  createBudgetProposalTool, createBudgetReviewTool, createBudgetSettlementTool,
} from './lib/budget-tools.js'
import { createForecastBudgetTool } from './lib/forecast-tool.js'
import { notifyDialog, listNotifications } from './lib/notify.js'
import { auditBeforeCard, auditNote } from './lib/audit.js'
import { superviseAcceptance, supervisorNote } from './lib/supervisor.js'

export const inject = ['tools', 'systemPrompt', 'userQuestions', 'workingDirectory', 'sessionProjections', 'agents']

const ledgerDirs = new Set()
const packageRoot = dirname(fileURLToPath(import.meta.url))
const SITUATION_ID = 'situation-check'
const SITUATION_SKIP = '__situation_skip__'

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */

/**
 * Load the schemastery that ships with the running DSH installation. The
 * plugin has no npm dependencies of its own; this is the one optional
 * DSH-provided library used for its Config schema and the Settings form.
 */
function findSchemastery() {
  const candidates = []
  const install = process.env.DSH_INSTALL_DIR
  if (install !== undefined && install !== '') {
    candidates.push(join(install, 'node_modules', '@deepseek-ai', 'schemastery', 'lib', 'index.cjs'))
    candidates.push(join(install, '..', 'schemastery', 'lib', 'index.cjs'))
  }
  if (process.execPath !== undefined) {
    const resources = join(dirname(process.execPath), 'resources')
    candidates.push(join(resources, 'app.asar', 'dsh', 'node_modules', '@deepseek-ai', 'schemastery', 'lib', 'index.cjs'))
    candidates.push(join(resources, 'app.asar.unpacked', 'dsh', 'node_modules', '@deepseek-ai', 'schemastery', 'lib', 'index.cjs'))
  }
  const profile = process.env.DSH_PROFILE_DIR
  if (profile !== undefined && profile !== '') {
    candidates.push(join(profile, 'node_modules', '@deepseek-ai', 'schemastery', 'lib', 'index.cjs'))
  }
  for (const candidate of candidates) {
    try {
      if (existsSync(candidate)) return candidate
    } catch {
      // Try the next layout.
    }
  }
  return undefined
}

let z
try {
  const schemaPath = findSchemastery()
  if (schemaPath !== undefined) z = createRequire(import.meta.url)(schemaPath)
} catch (error) {
  console.warn('[dsh-info-check] DSH schemastery is unavailable; Settings will be read-only.', error)
}

/** Plugin configuration. All fields are volatile so Settings applies without a restart. */
export const Config = z === undefined
  ? undefined
  : z.object({
      milestoneCount: z.natural().min(1).max(5).default(3).volatile(),
      expectation: z.string().default('good').volatile(),
      timeoutSeconds: z.natural().min(5).max(600).default(60).volatile(),
      maxQuestions: z.natural().min(1).max(6).default(3).volatile(),
      defaultEnabled: z.boolean().default(true).volatile(),
      ledgerEnabled: z.boolean().default(true).volatile(),
      ledgerPath: z.string().default('.dsh-info-check/ledger.md').volatile(),
      autoRetrospective: z.boolean().default(true).volatile(),
      auditAgent: z.boolean().default(false).volatile(),
      supervisorAgent: z.boolean().default(false).volatile(),
      language: z.string().default('auto').volatile(),
      supervisionMode: z.string().default('strict').volatile(),
      qualityStandard: z.string().default('').volatile(),
    })

const EXPECTATION_LABELS = {
  perfect: '完美',
  good: '较好',
  pass: '及格',
}

function normalizeExpectation(value) {
  return value === 'perfect' || value === 'pass' ? value : 'good'
}

function expectationRule(value) {
  switch (normalizeExpectation(value)) {
    case 'perfect':
      return '完美：按可发布/可开源标准执行；覆盖边界、回归和文档；不接受已知缺陷，验收证据要能复核。'
    case 'pass':
      return '及格：满足最低可用标准即可；明确列出未做项和限制，不要为了完整而扩大范围。'
    default:
      return '较好：主路径与关键边界通过；允许小的非阻塞问题，但必须在验收和交付确认里列出来。'
  }
}

function clampInt(value, min, max, fallback) {
  const number = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, Math.trunc(number)))
}

function readConfig(value, fallback) {
  if (value !== null && typeof value === 'object' && typeof value.get === 'function') {
    const current = value.get()
    return current === undefined ? fallback : current
  }
  return value === undefined ? fallback : value
}

/* ------------------------------------------------------------------ */
/* Policy                                                              */
/* ------------------------------------------------------------------ */

function defaultPolicy(settings) {
  const { maxQuestions, timeoutSeconds, milestoneCount, expectation } = settings
  const minQuestions = Math.min(2, maxQuestions)
  const milestoneRule = milestoneCount === 1
    ? '1 个里程碑'
    : `1–${milestoneCount} 个里程碑（用户偏好 ${milestoneCount} 个）`
  return `## 工程项目流程（dsh-info-check）

本会话启用了 dsh-info-check。用户是**甲方**，agent 是**乙方**，任务按“任务书 → 预算签约 → 里程碑执行/验收/预算审核 → 交付 → 结算”推进。

用户偏好：希望拆成 ${milestoneCount} 个里程碑；期望程度为 **${EXPECTATION_LABELS[normalizeExpectation(expectation)]}**。按这个标准设计方案、验收和交付确认。

1. **任务书形成**：先调用 \`info_check\`，用一段话复述目标；列出 ${minQuestions}–${maxQuestions} 条真正影响结果的**细节**核对问题（每题给选项，推荐项放第一并标注“（推荐）”）；给出可检查的完成标准（quality_bar）、明确的范围外（out_of_scope）、${milestoneRule}（milestones）。每个里程碑必须对应可交付的标志性文件或脚本，并在标题/内容中写清楚；里程碑必须按执行顺序排列，后一个里程碑的文件只能在前一个验收通过后开始修改。所有要点每点单独一行/一段，用 1. 2. 3. 编号，不要挤成一段。第一张卡是**可编辑的核对单**：用户会直接在你的版本上修改、补充，勾选确认后才进入细节选择；返回的 \`edited_brief\` 若与你的版本不同，以 \`edited_brief\` 为准。
2. 用户点卡片右上角的 X 表示**跳过**，不是取消任务：工具会返回 confirmed=true / decision=skipped，按 agent 原始版本自动进入下一阶段；不要重新发起确认，也不要停下来等待。
3. \`confirmed=true\` 后再开工；\`confirmed=false\`（工具明确拒绝或真实失败）时不要执行；需要时按用户的最新说法重新发起核对。
4. **预算方案卡**：任务书确认后，先调用 \`forecast_budget\`，根据每个里程碑的复杂度、文件数、测试数和质量要求，用当前模型的人民币 token 单价预测 input/output token、CNY 成本和备用金；再把返回的 \`forecast\` 原样传给 \`confirm_budget\` 的 \`round=1\`。把任务书的里程碑和每个里程碑预算放进同一张预算方案卡；总预算输入框和每个里程碑的步进输入框由甲方直接修改，所有里程碑预算之和不得超过总预算。**不再调用 \`confirm_milestone\`。**
5. **两轮确认**：用户确认第 1 轮方案后，先思考并给出调整意见，用 \`round=2\` 再次调用 \`confirm_budget\`，在调整说明中写清楚改了什么、为什么改；用户再次确认后预算才签约，里程碑计划同时锁定。
6. **预算签约**：只有第 2 轮用户确认后才算签约。**预算未签约时不得开始执行、不得调用 \`accept_milestone\`。** 卡片的倒计时结束或点击 X 均不视为签约。
7. **里程碑执行与验收**：每完成一个里程碑的文件/脚本后，立即调用 \`accept_milestone\` 验收**当前这一个**里程碑；验收必须提交至少一个本里程碑实际新增或修改的文件/脚本（files），且必须在上一里程碑验收之后更新。验收通过后可以继续同一轮，不需要中断对话；但下一个里程碑的文件必须在这之后修改。计划确认后里程碑数量锁定。
   执行中如遇到问题或决策拿不准，可随时调用 \`situation_check\` 发“情况对接”卡片：当前问题只读、列出 agent 建议、用户填写意见；动作会记入台账时间线。倒计时结束或用户关闭时，按 agent 自己的理解继续执行。
   **关键边界（地区、范围、数据、验收口径、预算）不得自行放宽或改变。** 一旦需要变化，必须先调用 \`situation_check\`，传 \`kind=boundary\`，说明原约束、拟变化和影响，并取得用户回答通过；超时或关闭不算通过。\`accept_milestone\` 必须提交 \`boundary.changed\`；若为 true，工具会检查本轮是否已有 answered 的 boundary 情况对接，否则拒绝验收。
   设置中开启监理子 Agent 后，每次 \`accept_milestone\` 会先启动独立监理，按合同审查当前里程碑和证据。返回 \`supervisor-rework\` 时，不要弹卡给用户；先按 \`feedback\` 中的 requiredChanges 修改并重试。只有监理通过后验收卡才弹出，卡内会附监理结论。
8. **预算审核**：验收通过后、进入下一里程碑前，必须调用 \`review_budget\`，提交累计已用、本阶段使用、追加请求和超支说明。甲方批准追加、不追加、要求调整或暂停；审核完成前不能提交下一里程碑验收。
9. 如果验收或预算审核返回 \`decision=paused\`，立即停止当前任务：整理进度、未完成项/风险和相关文件路径，结束任务；不进入下一里程碑，也不调用 \`confirm_delivery\`。
10. 任务明显简单且无歧义（单文件小改、用户已给出完整规格）时，说明假设后直接做，不必走完整流程；但成本仍要报告。
11. 不要手动修改 \`.dsh-info-check/ledger.md\`；插件会自动记录每次选择。子代理不要调用这些确认工具；把需要用户决定的问题写进最终结果。
12. 验收返回 \`rework\` 时按 feedback 修改后再次验收；预算审核返回 \`adjust\` 时按 feedback 修改后再次审核。
13. **交付确认**：准备交付最终结果前，调用 \`confirm_delivery\`，写明完成程度、交付内容、未完成/限制和验证；用户确认或超时后再交付。返回 \`adjust\` 时按 feedback 修改后再确认。
14. **预算结算**：交付确认后调用 \`settle_budget\`，提交实际使用、说明和差额；甲方评价预算是否合理，结算结果写入台账和预算标准。

质量管理看任务书和验收证据；成本管理看预算签约、每阶段使用和结算。报价要覆盖已承诺范围，不把未承诺工作算进去；追加必须经甲方批准。

完成标准示例：不要写“好看”，要写“与现有按钮使用同一套间距与颜色 token；hover / disabled / loading 三态可辨；暗色模式不破版”。
`
}

/* ------------------------------------------------------------------ */
/* Ledger                                                              */
/* ------------------------------------------------------------------ */

class Ledger {
  constructor(ctx, getOptions) {
    this.ctx = ctx
    this.getOptions = getOptions
    this.tail = Promise.resolve()
    this.started = new Set()
    this.events = new Map()
    this.acceptance = new Map()
    this.taskStarts = new Map()
    this.plans = new Map()
  }

  append(session, body, event) {
    const options = this.getOptions()
    if (!options.enabled || session === undefined) return Promise.resolve()
    const sid = String(session.id)
    if (event !== undefined && event !== null) {
      const current = this.events.get(sid) ?? []
      current.push(event)
      this.events.set(sid, current)
    }
    try {
      const cwd = this.ctx.workingDirectory.get(session)
      const root = resolve(cwd)
      const full = isAbsolute(options.path) ? resolve(options.path) : resolve(root, options.path)
      if (full !== root && !full.startsWith(root + sep)) {
        this.ctx.logger?.warn?.('[dsh-info-check] ledger path escapes the session workspace; skip %s', full)
        return Promise.resolve()
      }
      this.tail = this.tail.then(async () => {
        const directory = dirname(full)
        if (!ledgerDirs.has(directory)) {
          await mkdir(directory, { recursive: true })
          ledgerDirs.add(directory)
        }
        let header = ''
        if (!this.started.has(sid)) {
          this.started.add(sid)
          let existing = ''
          try {
            existing = await readFile(full, 'utf8')
          } catch (error) {
            if (error?.code !== 'ENOENT') throw error
          }
          if (!existing.includes(`## 会话 \`${sid}\``)) {
            header = `\n## 会话 \`${sid}\`\n\n- 开始：${new Date().toLocaleString('zh-CN', { hour12: false })}\n- 工作目录：\`${cwd}\`\n`
          }
        }
        await appendFile(full, `${header}\n${body}\n`, 'utf8')
        if (event !== undefined && event !== null) {
          const eventsFile = join(directory, 'task-events.jsonl')
          try {
            await appendFile(eventsFile, `${JSON.stringify({
              session: sid,
              type: 'event',
              at: Date.now(),
              event,
            })}\n`, 'utf8')
          } catch (error) {
            this.ctx.logger?.warn?.('[dsh-info-check] event journal write failed: %o', error)
          }
        }
      }).catch((error) => {
        this.ctx.logger?.warn?.('[dsh-info-check] ledger write failed: %o', error)
      })
    } catch (error) {
      this.ctx.logger?.warn?.('[dsh-info-check] ledger path resolution failed: %o', error)
    }
    return this.tail
  }

  consume(session) {
    if (session === undefined) return Promise.resolve([])
    const sid = String(session.id)
    const memory = this.events.get(sid) ?? []
    this.events.delete(sid)
    const eventFile = this.eventFile(session)
    if (eventFile === undefined) return Promise.resolve(memory)
    return readFile(eventFile, 'utf8').then((text) => {
      const records = text.split(/\r?\n/).filter(Boolean).flatMap((line) => {
        try {
          const record = JSON.parse(line)
          return record !== null && typeof record === 'object' && record.session === sid ? [record] : []
        } catch {
          return []
        }
      })
      let start = -1
      for (let index = 0; index < records.length; index += 1) {
        if (records[index].type === 'task-start') start = index
      }
      const events = records.slice(start + 1)
        .filter(record => record.type === 'event' && record.event !== null && typeof record.event === 'object')
        .map(record => record.event)
      return events.length > 0 ? events : memory
    }).catch(() => memory)
  }

  eventFile(session) {
    if (session === undefined) return undefined
    try {
      const options = this.getOptions()
      const cwd = this.ctx.workingDirectory.get(session)
      const root = resolve(cwd)
      const full = isAbsolute(options.path) ? resolve(options.path) : resolve(root, options.path)
      if (full !== root && !full.startsWith(root + sep)) return undefined
      return join(dirname(full), 'task-events.jsonl')
    } catch {
      return undefined
    }
  }

  async startTask(session) {
    if (session === undefined) return
    const sid = String(session.id)
    this.events.delete(sid)
    const eventFile = this.eventFile(session)
    if (eventFile === undefined) return
    try {
      await mkdir(dirname(eventFile), { recursive: true })
      await appendFile(eventFile, `${JSON.stringify({
        session: sid,
        type: 'task-start',
        at: Date.now(),
      })}\n`, 'utf8')
    } catch (error) {
      this.ctx.logger?.warn?.('[dsh-info-check] event journal start failed: %o', error)
    }
  }

  peek(session) {
    if (session === undefined) return []
    return [...(this.events.get(String(session.id)) ?? [])]
  }

  recordAcceptance(session, turn, milestone, at) {
    if (session === undefined || typeof turn !== 'number') return
    this.acceptance.set(String(session.id), { turn, milestone, at: typeof at === 'number' ? at : undefined })
  }

  lastAcceptance(session) {
    if (session === undefined) return undefined
    return this.acceptance.get(String(session.id))
  }

  lastAcceptanceAt(session) {
    if (session === undefined) return undefined
    return this.acceptance.get(String(session.id))?.at
  }

  markTaskStart(session) {
    if (session === undefined) return
    this.taskStarts.set(String(session.id), Date.now())
  }

  taskStartedAt(session) {
    if (session === undefined) return undefined
    return this.taskStarts.get(String(session.id))
  }

  setPlan(session, milestoneIds) {
    if (session === undefined || !Array.isArray(milestoneIds)) return
    this.plans.set(String(session.id), milestoneIds.map(String))
  }

  planOf(session) {
    if (session === undefined) return undefined
    return this.plans.get(String(session.id))
  }

  clearPlan(session) {
    if (session === undefined) return
    const sid = String(session.id)
    this.plans.delete(sid)
    this.taskStarts.delete(sid)
    this.acceptance.delete(sid)
    this.events.delete(sid)
  }
}

/* ------------------------------------------------------------------ */
/* Tools                                                               */
/* ------------------------------------------------------------------ */

function isCancelled(error) {
  return error !== null && typeof error === 'object' && error.code === 'ASK_CANCELLED'
}

function infoCheckQuestion(detail) {
  return {
    id: INTENT_BRIEF_ID,
    header: 'dsh-info-check · 任务书',
    question: '请先修改下面的任务书；确认无误后勾选“我已确认”，再进入细节确认。',
    detail,
  }
}

function createInfoCheckTool({ ctx, enabledFor, getMaxQuestions, ledger, budgetStore }) {
  return {
    name: 'info_check',
    description: '作为乙方形成任务书：在开始实质性执行前，向甲方复述目标理解，提出细节核对问题、完成标准、范围外和里程碑。'
      + '所有要点每点单独一行/一段，并用 1. 2. 3. 编号；不要挤成一段。'
      + '第一张卡是可编辑的任务书：甲方会直接在你的版本上修改、补充，勾选后才进入细节选择。'
      + '返回 confirmed=true 时，若 edited_brief 与你的版本不同，以 edited_brief 为准；confirmed=false 时不要直接执行。',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        understanding: { type: 'string', description: '用 1. 2. 3. 分点复述你理解的目标；每点单独一行。' },
        questions: {
          type: 'array',
          description: '按设置的数量列出真正影响结果的核对问题（上限大于 1 时至少 2 条）；每题给选项，推荐项放第一并标注“（推荐）”。',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              id: { type: 'string', description: '稳定 id，回答会回显。' },
              header: { type: 'string', description: '可选的短标题。' },
              question: { type: 'string', description: '要问用户的问题。' },
              options: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    label: { type: 'string' },
                    description: { type: 'string' },
                  },
                  required: ['label'],
                },
              },
              multi_select: { type: 'boolean', description: '是否允许多选。' },
            },
            required: ['id', 'question'],
          },
        },
        quality_bar: {
          type: 'array',
          description: '可检查的完成标准，至少 1 条；每点一条，界面会按 1. 2. 3. 编号显示。不要写“好看”这类无法验收的词。',
          items: { type: 'string' },
        },
        out_of_scope: {
          type: 'array',
          description: '这次明确不做的事，避免执行中擅自加码；每点一条，界面会按 1. 2. 3. 编号显示。',
          items: { type: 'string' },
        },
        milestones: {
          type: 'array',
          description: '1–5 个里程碑；开工前只确认一次执行方案，之后每个里程碑完成时用 accept_milestone 验收。',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              id: { type: 'string', description: '稳定 id，例如 m1。' },
              title: { type: 'string', description: '里程碑标题。' },
            },
            required: ['id', 'title'],
          },
        },
      },
      required: ['understanding', 'questions', 'quality_bar', 'milestones'],
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          confirmed: { type: 'boolean' },
          reason: { type: 'string' },
          feedback: { type: 'string' },
          edited_brief: { type: 'string', description: '用户在卡片里修改后的核对单；与提交版本不同时以它为准。' },
          answers: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                id: { type: 'string' },
                selected: { type: 'array', items: { type: 'string' } },
                custom: { type: 'string' },
              },
              required: ['id', 'selected'],
            },
          },
        },
        required: ['confirmed', 'reason'],
      },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    async execute(args, exec) {
      const agent = exec.agent
      if (agent === undefined) throw new Error('info_check requires a live agent')
      if (!enabledFor(agent.session)) throw new Error('dsh-info-check is disabled for this conversation')
      const brief = validateInfoCheck(args, getMaxQuestions())
      const detail = briefMarkdown(brief)
      notifyDialog('dsh-info-check · 任务书待确认', '任务理解、完成标准和里程碑已生成，请在弹窗中确认。')
      let answer
      try {
        answer = await ctx.userQuestions.ask({
          questions: [infoCheckQuestion(detail), ...brief.questions],
          agent,
          signal: exec.signal,
        })
      } catch (error) {
        if (isCancelled(error)) {
          exec.concludeTurn()
          await ledger.append(agent.session, infoCheckLedger(brief, { confirmed: false, reason: 'cancelled', answers: [] }))
          return { confirmed: false, reason: 'cancelled' }
        }
        throw error
      }
      const outcome = intentOutcome(answer)
      if (outcome.reason === 'skipped') {
        await ledger.append(agent.session, infoCheckLedger(brief, {
          confirmed: true,
          reason: 'skipped',
          editedBrief: detail,
          answers: [],
        }))
        await ledger.startTask(agent.session)
        await budgetStore.begin(agent.session)
        await budgetStore.saveTaskBook(agent.session, detail)
        ledger.setPlan(agent.session, brief.milestones.map(item => item.id))
        return { confirmed: true, reason: 'skipped', edited_brief: detail, answers: [] }
      }
      if (!outcome.confirmed) {
        await ledger.append(agent.session, infoCheckLedger(brief, {
          confirmed: false,
          reason: outcome.reason,
          answers: outcome.answers,
        }))
        return { confirmed: false, reason: outcome.reason }
      }
      await ledger.append(agent.session, infoCheckLedger(brief, {
        confirmed: true,
        editedBrief: outcome.editedBrief,
        answers: outcome.answers,
      }))
      await ledger.startTask(agent.session)
      await budgetStore.begin(agent.session)
      await budgetStore.saveTaskBook(agent.session, outcome.editedBrief)
      const editedMilestones = parseMilestonesFromBrief(outcome.editedBrief)
      ledger.setPlan(agent.session, (editedMilestones.length > 0 ? editedMilestones : brief.milestones).map(item => item.id))
      return {
        confirmed: true,
        reason: 'confirmed',
        edited_brief: outcome.editedBrief,
        answers: outcome.answers,
      }
    },
    presentCall(args) {
      try {
        const brief = validateInfoCheck(args, getMaxQuestions())
        return {
          card: 'generic',
          title: 'dsh-info-check · 任务书',
          kind: 'other',
          content: [{ type: 'text', text: briefMarkdown(brief) }],
        }
      } catch {
        return undefined
      }
    },
    presentResult(_args, result) {
      return { card: 'generic', title: 'dsh-info-check · 任务书', content: result.content }
    },
  }
}

function createMilestoneTool({ ctx, enabledFor, getTimeoutSeconds, ledger }) {
  return {
    name: 'confirm_milestone',
    description: '在需求核对之后，向用户确认整体执行方案（以第一个里程碑为主体）。每个任务只调用一次；后续里程碑不再调用 confirm_milestone，完成后改用 accept_milestone 验收。'
      + '用户可以在倒计时处停止计时，浮窗会保留以便继续修改；返回 edited_plan 时以它为准。',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        milestone: { type: 'string', description: '里程碑 id 或标题，对应 info_check 里声明的 milestones。' },
        plan: {
          type: 'string',
          description: '这个里程碑的具体方案：每一点单独一段，用 1. 2. 3. 编号（做什么、改哪些文件、怎么验证）。',
        },
        impact: { type: 'string', description: '可选的影响范围，例如受影响的页面、依赖或风险。' },
      },
      required: ['milestone', 'plan'],
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          decision: { type: 'string' },
          proceed: { type: 'boolean' },
          feedback: { type: 'string' },
          edited_plan: { type: 'string', description: '用户在卡片里修改后的方案；与提交版本不同时以它为准。' },
        },
        required: ['decision', 'proceed'],
      },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    async execute(args, exec) {
      const agent = exec.agent
      if (agent === undefined) throw new Error('confirm_milestone requires a live agent')
      if (!enabledFor(agent.session)) throw new Error('dsh-info-check is disabled for this conversation')
      const milestone = validateMilestone(args)
      const detail = milestone.impact === undefined
        ? `【里程碑】\n\n${milestone.milestone}\n\n【方案】\n\n${numberPoints(milestone.plan)}`
        : `【里程碑】\n\n${milestone.milestone}\n\n【方案】\n\n${numberPoints(milestone.plan)}\n\n【影响范围】\n\n${numberPoints(milestone.impact)}`
      const question = {
        id: MILESTONE_CONFIRM_ID,
        header: 'dsh-info-check · 里程碑确认',
        question: `是否按这个方案执行「${milestone.milestone}」？`,
        detail,
        options: [
          { label: APPROVE_MILESTONE_LABEL, description: '按这个方案执行' },
        ],
      }
      notifyDialog('dsh-info-check · 里程碑方案待确认', `请确认里程碑：${milestone.milestone}`)
      let result
      try {
        result = await ctx.userQuestions.askTimed(
          { questions: [question], agent, signal: exec.signal },
          exec.callId,
          getTimeoutSeconds() * 1000,
        )
      } catch (error) {
        if (isCancelled(error)) {
          exec.concludeTurn()
          await ledger.append(agent.session, milestoneLedger(milestone, { decision: 'cancelled' }))
          return { decision: 'cancelled', proceed: false }
        }
        throw error
      }
      if (result.pending === true) {
        await ledger.append(agent.session, milestoneLedger(milestone, { decision: 'timeout' }))
        ledger.markTaskStart(agent.session)
        return { decision: 'timeout', proceed: true }
      }
      const outcome = milestoneOutcome(result.answers[0], milestone.plan)
      await ledger.append(agent.session, milestoneLedger(milestone, {
        decision: outcome.decision,
        ...(outcome.feedback === undefined ? {} : { feedback: outcome.feedback }),
        ...(outcome.editedPlan === undefined ? {} : { editedPlan: outcome.editedPlan }),
      }))
      ledger.markTaskStart(agent.session)
      // Adjust means the user takes the turn back: stop here instead of
      // spending another model request on a plan they are about to rewrite.
      if (outcome.decision === 'adjust') exec.concludeTurn()
      return {
        decision: outcome.decision,
        proceed: outcome.proceed,
        ...(outcome.feedback === undefined ? {} : { feedback: outcome.feedback }),
        ...(outcome.editedPlan === undefined ? {} : { edited_plan: outcome.editedPlan }),
      }
    },
    presentCall(args) {
      try {
        const milestone = validateMilestone(args)
        return {
          card: 'generic',
          title: `dsh-info-check · 里程碑确认 · ${milestone.milestone}`,
          kind: 'other',
          content: [{ type: 'text', text: milestone.plan }],
        }
      } catch {
        return undefined
      }
    },
    presentResult(_args, result) {
      return { card: 'generic', title: 'dsh-info-check · 里程碑决定', content: result.content }
    },
  }
}

function createAcceptTool({ ctx, enabledFor, getTimeoutSeconds, ledger, getSupervisionMode, getSupervisorEnabled, budgetStore }) {
  return {
    name: 'accept_milestone',
    description: '在一个里程碑完成后，向用户验收：提交完成内容、验证证据、未完成或风险；用户验收通过（或倒计时结束）后再进入下一个里程碑。'
      + '每次只验收当前一个里程碑；禁止把所有里程碑都做完后再连续提交验收。'
      + '验收通过后可以继续同一轮做下一个里程碑，不需要中断对话；但下一个里程碑的文件必须在这之前验收之后才修改。'
      + 'files 至少一个，必须是本里程碑实际新增或修改的文件/脚本，并且在上一里程碑验收之后有更新；否则工具会拒绝。'
      + '用户可以在倒计时处停止计时；验收报告是只读的，用户点“需要返工”时会在“返修说明”浮窗里填写理由，reason 通过 feedback 返回，按它修改后再次验收。'
      + '用户点“暂停任务”时返回 decision=paused；此时整理进度并结束当前任务，不进入下一里程碑。'
      + '可选 files 传结果文件绝对路径，验收卡会显示为“打开所在位置”链接。'
      + '必须声明 boundary：关键范围/地区/数据/验收口径是否发生变化；如果 changed=true，必须先通过 situation_check(kind=boundary) 得到用户回答，否则验收会被拒绝。'
      + '开启监理子 Agent 后，验收前会先由独立监理按合同审查；未通过返回 supervisor-rework，主 agent 必须按 requiredChanges 修改后重试；监理通过后才弹出验收卡。'
      + '用户在备注里写的额外要求通过 notes 返回。',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        milestone: { type: 'string', description: '里程碑 id 或标题。' },
        summary: { type: 'string', description: '这个里程碑完成了什么；每点单独一行，界面会按 1. 2. 3. 编号显示。' },
        evidence: { type: 'string', description: '验证证据：测试、命令、文件或截图；每点单独一行，界面会编号。' },
        gaps: { type: 'string', description: '可选的未完成项或风险；每点单独一行，界面会编号。' },
        boundary: {
          type: 'object',
          additionalProperties: false,
          description: '必填：本里程碑是否改变或放宽了关键边界条件（地区、范围、数据、验收口径等）。',
          properties: {
            changed: { type: 'boolean', description: '边界条件是否发生变化。' },
            summary: { type: 'string', description: 'changed=true 时必填：变化内容及用户确认依据。' },
          },
          required: ['changed'],
        },
        files: {
          type: 'array',
          minItems: 1,
          items: { type: 'string' },
          description: '本里程碑实际新增或修改的文件/脚本绝对路径；至少一个，且必须在上一里程碑验收后有更新。验收卡会显示为“打开所在位置”链接。',
        },
      },
      required: ['milestone', 'summary', 'evidence', 'files', 'boundary'],
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          decision: { type: 'string' },
          proceed: { type: 'boolean' },
          feedback: { type: 'string' },
          notes: { type: 'string' },
        },
        required: ['decision', 'proceed'],
      },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    async execute(args, exec) {
      const agent = exec.agent
      if (agent === undefined) throw new Error('accept_milestone requires a live agent')
      if (!enabledFor(agent.session)) throw new Error('dsh-info-check is disabled for this conversation')
      const acceptance = validateAcceptance(args)
      const budget = await budgetStore.load(agent.session)
      if (budget === undefined || !budget.state.signed) {
        throw new Error('dsh-info-check: 尚未完成预算签约。先用 confirm_budget 提出初始预算，由甲方签约后再执行与验收。')
      }
      if (budget.state.pendingReview !== null) {
        throw new Error(`dsh-info-check: 里程碑「${budget.state.pendingReview}」验收后还没有完成预算审核。先调用 review_budget，再进入下一阶段。`)
      }
      const plan = ledger.planOf(agent.session)
      if (Array.isArray(plan) && !plan.includes(acceptance.milestone)) {
        throw new Error(`dsh-info-check: 里程碑「${acceptance.milestone}」不在已确认的计划中；任务结束前里程碑数量不能增减。`)
      }
      if (acceptance.boundary.changed === true) {
        const since = ledger.lastAcceptanceAt(agent.session) ?? budget.state.signedAt ?? 0
        const answered = (Array.isArray(budget.state.situations) ? budget.state.situations : [])
          .some(item => item.kind === 'boundary'
            && item.decision === 'answered'
            && Date.parse(item.at) >= since)
        if (!answered) {
          throw new Error('dsh-info-check: 检测到关键边界条件变化。先调用 situation_check（kind=boundary）向甲方说明变化并取得回答通过；超时、关闭或普通情况对接不算通过。')
        }
      }
      let turn
      try {
        turn = ctx.agents.turnBoundaryOf(agent.session).lastTurn
      } catch {
        turn = undefined
      }
      if (getSupervisionMode?.() !== 'advisory') {
        if (!Array.isArray(acceptance.files) || acceptance.files.length === 0) {
          throw new Error('dsh-info-check: 每个里程碑验收至少要提交一个标志性文件或脚本（files），不能空验收。')
        }
        const boundary = ledger.lastAcceptanceAt(agent.session) ?? ledger.taskStartedAt(agent.session) ?? 0
        const cwd = ctx.workingDirectory.get(agent.session)
        const deliverables = acceptance.files.map(file => isAbsolute(file) ? file : resolve(cwd, file))
        if (!hasDeliverableNewer(deliverables, boundary, statSync)) {
          throw new Error('dsh-info-check: 验收文件在上一次里程碑验收后没有新的修改。请先完成当前里程碑的文件/脚本，再提交验收。')
        }
      }
      let supervisor
      if (getSupervisorEnabled?.() === true) {
        supervisor = await superviseAcceptance({
          ctx,
          agent,
          acceptance,
          contract: budget.state,
          signal: exec.signal,
        })
        await budgetStore.recordSupervision(agent.session, {
          milestone: acceptance.milestone,
          ...supervisor,
        }).catch(() => {})
        if (supervisor.decision !== 'pass') {
          const changes = Array.isArray(supervisor.requiredChanges) && supervisor.requiredChanges.length > 0
            ? `\n${supervisor.requiredChanges.map((item, index) => `${index + 1}. ${item}`).join('\n')}`
            : ''
          const feedback = `${supervisor.summary ?? ''}${changes}`
          await ledger.append(agent.session, `监理未通过：${acceptance.milestone}\n${feedback}`, {
            type: 'supervision',
            decision: supervisor.decision ?? 'unavailable',
            milestone: acceptance.milestone,
          }).catch(() => {})
          return {
            decision: supervisor.status === 'reviewed' ? 'supervisor-rework' : 'supervisor-unavailable',
            proceed: false,
            feedback,
          }
        }
        await ledger.append(agent.session, `监理通过：${acceptance.milestone}\n${supervisor.summary ?? ''}`, {
          type: 'supervision',
          decision: 'pass',
          milestone: acceptance.milestone,
        }).catch(() => {})
      }
      const question = {
        id: ACCEPT_MILESTONE_ID,
        header: 'dsh-info-check · 里程碑验收',
        question: `里程碑「${acceptance.milestone}」已完成，是否验收通过？`,
        detail: `${acceptanceDetail(acceptance)}${supervisorNote(supervisor)}`,
        options: [
          { label: ACCEPT_LABEL, description: '验收通过，进入下一个里程碑' },
          { label: REWORK_LABEL, description: '不通过，需要返工' },
          { label: PAUSE_LABEL, description: '暂停任务，整理现有进度后结束当前任务' },
        ],
      }
      notifyDialog('dsh-info-check · 里程碑验收', `${acceptance.milestone} 已完成，请验收。`)
      let result
      try {
        result = await ctx.userQuestions.askTimed(
          { questions: [question], agent, signal: exec.signal },
          exec.callId,
          getTimeoutSeconds() * 1000,
        )
      } catch (error) {
        if (isCancelled(error)) {
          exec.concludeTurn()
          await ledger.append(agent.session, acceptanceLedger(acceptance, { decision: 'cancelled' }), {
            type: 'acceptance', decision: 'cancelled', milestone: acceptance.milestone,
          })
          ledger.recordAcceptance(agent.session, turn, acceptance.milestone, Date.now())
          return { decision: 'cancelled', proceed: false }
        }
        throw error
      }
      if (result.pending === true) {
        await ledger.append(agent.session, acceptanceLedger(acceptance, { decision: 'timeout' }), {
          type: 'acceptance', decision: 'timeout', milestone: acceptance.milestone,
        })
          ledger.recordAcceptance(agent.session, turn, acceptance.milestone, Date.now())
          await budgetStore.recordAcceptance(agent.session, {
            milestone: acceptance.milestone,
            summary: acceptance.summary,
            evidence: acceptance.evidence,
            gaps: acceptance.gaps,
            files: acceptance.files,
            boundary: acceptance.boundary,
            decision: 'timeout',
          })
          await budgetStore.markPending(agent.session, acceptance.milestone)
          return { decision: 'timeout', proceed: true }
      }
      const outcome = acceptanceOutcome(result.answers[0])
      await ledger.append(agent.session, acceptanceLedger(acceptance, {
        decision: outcome.decision,
        ...(outcome.feedback === undefined ? {} : { feedback: outcome.feedback }),
        ...(outcome.notes === undefined ? {} : { notes: outcome.notes }),
      }), {
        type: 'acceptance',
        decision: outcome.decision,
        milestone: acceptance.milestone,
        ...(outcome.feedback === undefined ? {} : { feedback: outcome.feedback }),
        ...(outcome.notes === undefined ? {} : { notes: outcome.notes }),
      })
      ledger.recordAcceptance(agent.session, turn, acceptance.milestone, Date.now())
      await budgetStore.recordAcceptance(agent.session, {
        milestone: acceptance.milestone,
        summary: acceptance.summary,
        evidence: acceptance.evidence,
        gaps: acceptance.gaps,
        files: acceptance.files,
        boundary: acceptance.boundary,
        decision: outcome.decision,
      })
      if (outcome.proceed) await budgetStore.markPending(agent.session, acceptance.milestone)
      return {
        decision: outcome.decision,
        proceed: outcome.proceed,
        ...(outcome.feedback === undefined ? {} : { feedback: outcome.feedback }),
        ...(outcome.notes === undefined ? {} : { notes: outcome.notes }),
      }
    },
    presentCall(args) {
      try {
        const acceptance = validateAcceptance(args)
        return {
          card: 'generic',
          title: 'dsh-info-check · 里程碑验收',
          kind: 'other',
          content: [{ type: 'text', text: acceptanceDetail(acceptance) }],
        }
      } catch {
        return undefined
      }
    },
    presentResult(_args, result) {
      return { card: 'generic', title: 'dsh-info-check · 里程碑验收', content: result.content }
    },
  }
}

function createDeliveryTool({ ctx, enabledFor, getTimeoutSeconds, ledger, onDeliveryConfirmed, budgetStore, getAuditEnabled, getSupervisorEnabled }) {
  return {
    name: 'confirm_delivery',
    description: '在呈现最终结果前，向用户确认完成程度：提交完成程度、交付内容、未完成或限制、验证；用户确认（或倒计时结束）后才交付最终结果。'
      + '用户可以在倒计时处停止计时；确认报告是只读的，用户点“需要调整”时会在“调整说明”浮窗里填写理由，reason 通过 feedback 返回，按它修改后再确认交付。'
      + '用户在备注里写的额外要求通过 notes 返回。',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        completion: { type: 'string', description: '结果完成程度：哪些做完、哪些没做；每点单独一行，界面会按 1. 2. 3. 编号显示。' },
        delivered: { type: 'string', description: '最终交付内容：文件、页面、命令或说明；每点单独一行，界面会编号。' },
        gaps: { type: 'string', description: '可选的未完成项或限制；每点单独一行，界面会编号。' },
        evidence: { type: 'string', description: '可选的验证证据；每点单独一行，界面会编号。' },
      },
      required: ['completion', 'delivered'],
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          decision: { type: 'string' },
          proceed: { type: 'boolean' },
          feedback: { type: 'string' },
          notes: { type: 'string' },
          retrospective: {
            type: 'string',
            enum: ['written', 'written+quality', 'skipped', 'empty', 'failed', 'disabled'],
          },
          retrospective_summary: { type: 'string' },
        },
        required: ['decision', 'proceed'],
      },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    async execute(args, exec) {
      const agent = exec.agent
      if (agent === undefined) throw new Error('confirm_delivery requires a live agent')
      if (!enabledFor(agent.session)) throw new Error('dsh-info-check is disabled for this conversation')
      const delivery = validateDelivery(args)
      const contract = await budgetStore.latest()
      const audit = getAuditEnabled?.() === true
        ? await auditBeforeCard({ ctx, agent, kind: 'delivery', payload: delivery, contract, signal: exec.signal, light: getSupervisorEnabled?.() === true })
        : undefined
      if (audit !== undefined) {
        await budgetStore.recordAudit(agent.session, { kind: 'delivery', ...audit }).catch(() => {})
        await ledger.append(agent.session, `交付审计：${audit.faithful === true ? '通过' : audit.faithful === false ? '发现问题' : '未完成'}\n${audit.summary ?? ''}`, {
          type: 'audit', kind: 'delivery', faithful: audit.faithful,
        }).catch(() => {})
      }
      const detail = `${deliveryDetail(delivery)}${auditNote(audit)}`
      const question = {
        id: DELIVERY_CONFIRM_ID,
        header: 'dsh-info-check · 交付确认',
        question: '是否确认按以上完成程度交付最终结果？',
        detail,
        options: [
          { label: DELIVER_LABEL, description: '确认并交付最终结果' },
          { label: ADJUST_DELIVERY_LABEL, description: '先不交付，需要调整' },
        ],
      }
      notifyDialog('dsh-info-check · 交付待确认', '交付内容、限制和验证已整理，请确认是否交付。')
      let result
      try {
        result = await ctx.userQuestions.askTimed(
          { questions: [question], agent, signal: exec.signal },
          exec.callId,
          getTimeoutSeconds() * 1000,
        )
      } catch (error) {
        if (isCancelled(error)) {
          exec.concludeTurn()
          await ledger.append(agent.session, deliveryLedger(delivery, { decision: 'cancelled' }))
          return { decision: 'cancelled', proceed: false }
        }
        throw error
      }
      if (result.pending === true) {
        await ledger.append(agent.session, deliveryLedger(delivery, { decision: 'timeout' }))
        await budgetStore.recordDelivery(agent.session, { ...delivery, decision: 'timeout' })
        return { decision: 'timeout', proceed: true }
      }
      const outcome = deliveryOutcome(result.answers[0])
      await ledger.append(agent.session, deliveryLedger(delivery, {
        decision: outcome.decision,
        ...(outcome.feedback === undefined ? {} : { feedback: outcome.feedback }),
        ...(outcome.notes === undefined ? {} : { notes: outcome.notes }),
      }), {
        type: 'delivery',
        decision: outcome.decision,
        ...(outcome.feedback === undefined ? {} : { feedback: outcome.feedback }),
        ...(outcome.notes === undefined ? {} : { notes: outcome.notes }),
      })
      const review = outcome.decision === 'confirmed' && onDeliveryConfirmed !== undefined
        ? await onDeliveryConfirmed(agent, exec)
        : undefined
      await budgetStore.recordDelivery(agent.session, { ...delivery, decision: outcome.decision })
      return {
        decision: outcome.decision,
        proceed: outcome.proceed,
        ...(outcome.feedback === undefined ? {} : { feedback: outcome.feedback }),
        ...(outcome.notes === undefined ? {} : { notes: outcome.notes }),
        ...(review === undefined ? {} : {
          retrospective: review.status,
          ...(review.summary === '' ? {} : { retrospective_summary: review.summary }),
        }),
      }
    },
    presentCall(args) {
      try {
        const delivery = validateDelivery(args)
        return {
          card: 'generic',
          title: 'dsh-info-check · 交付确认',
          kind: 'other',
          content: [{ type: 'text', text: deliveryDetail(delivery) }],
        }
      } catch {
        return undefined
      }
    },
    presentResult(_args, result) {
      return { card: 'generic', title: 'dsh-info-check · 交付确认', content: result.content }
    },
  }
}

/* ------------------------------------------------------------------ */
/* Plugin                                                              */
/* ------------------------------------------------------------------ */

/**
 * Register the policy, tools, projection, command, and ledger.
 * @param ctx - Host plugin context.
 * @param config - Resolved plugin configuration.
 */
export function apply(ctx, config = {}) {
  const currentSettings = () => {
    const milestoneCount = clampInt(readConfig(config.milestoneCount, 3), 1, 5, 3)
    const expectation = normalizeExpectation(readConfig(config.expectation, 'good'))
    const timeoutSeconds = clampInt(readConfig(config.timeoutSeconds, 60), 5, 600, 60)
    const maxQuestions = clampInt(readConfig(config.maxQuestions, 3), 1, 6, 3)
    const defaultEnabled = readConfig(config.defaultEnabled, true) !== false
    const ledgerEnabled = readConfig(config.ledgerEnabled, true) !== false
    const rawLedgerPath = readConfig(config.ledgerPath, '.dsh-info-check/ledger.md')
    const ledgerPath = typeof rawLedgerPath === 'string' && rawLedgerPath.trim() !== ''
      ? rawLedgerPath.trim()
      : '.dsh-info-check/ledger.md'
    const autoRetrospective = readConfig(config.autoRetrospective, true) !== false
    const auditAgent = readConfig(config.auditAgent, false) === true
    const supervisorAgent = readConfig(config.supervisorAgent, false) === true
    const rawLanguage = readConfig(config.language, 'auto')
    const language = rawLanguage === 'zh' || rawLanguage === 'en' ? rawLanguage : 'auto'
    const supervisionMode = readConfig(config.supervisionMode, 'strict') === 'advisory' ? 'advisory' : 'strict'
    return {
      milestoneCount, expectation, timeoutSeconds, maxQuestions, defaultEnabled,
      ledgerEnabled, ledgerPath, autoRetrospective, supervisionMode,
      auditAgent,
      supervisorAgent,
      language,
    }
  }

  const ledger = new Ledger(ctx, () => {
    const settings = currentSettings()
    return { enabled: settings.ledgerEnabled, path: settings.ledgerPath }
  })
  const retrospective = new RetrospectiveStore(ctx, () => {
    const settings = currentSettings()
    return { enabled: settings.ledgerEnabled, path: settings.ledgerPath }
  })
  const budgetStore = new BudgetStore(ctx, () => {
    const settings = currentSettings()
    return { enabled: settings.ledgerEnabled, path: settings.ledgerPath }
  })

  const reviewAfterDelivery = async (agent, exec) => {
    const settings = currentSettings()
    if (!settings.ledgerEnabled) return { status: 'disabled', summary: '' }
    let wantsReview = settings.autoRetrospective
    if (!wantsReview) {
      notifyDialog('dsh-info-check · 任务复盘', '本次任务已交付，是否把工作记录加入复盘？')
      try {
        const answer = await ctx.userQuestions.ask({
          questions: [{
            id: 'dsh-info-check-retrospective',
            header: 'dsh-info-check · 复盘',
            question: '是否将本次工作加入复盘？',
            options: [
              { label: '复盘（推荐）', description: '生成本次复盘，并用于维护你的工作质量标准' },
              { label: '跳过', description: '本次不记录复盘' },
            ],
          }],
          agent,
          signal: exec.signal,
        })
        const selected = answer.answers?.[0]?.selected
        const values = Array.isArray(selected) ? selected : selected === undefined || selected === null ? [] : [selected]
        wantsReview = values.some(item => /复盘|review/i.test(String(item)))
      } catch {
        wantsReview = false
      }
    }
    const events = await ledger.consume(agent.session)
    if (!wantsReview) return { status: 'skipped', summary: '' }
    if (events.length === 0) return { status: 'empty', summary: '' }
    try {
      const result = await retrospective.record(agent.session, events)
      return {
        status: result.standardUpdated ? 'written+quality' : result.status,
        summary: result.summary,
      }
    } catch (error) {
      ctx.logger?.warn?.('[dsh-info-check] retrospective failed: %o', error)
      return { status: 'failed', summary: '' }
    }
  }

  // Per-Session switch and milestone progress. A third-party plugin cannot
  // append a custom Session event, so state is folded from logged commands and
  // the plugin's own tool call/result events.
  const progressSchema = {
    parse(value) {
      try {
        if (value === null || typeof value !== 'object') {
          throw new Error('dsh-info-check projection state must be an object')
        }
        return normalizeProgress(value, currentSettings().defaultEnabled)
      } catch (error) {
        ctx.logger?.warn?.('[dsh-info-check] projection state reset: %o', error)
        return createProgressState(currentSettings().defaultEnabled)
      }
    },
  }
  let projection
  Promise.resolve(ctx.sessionProjections.register({
    key: 'infoCheck',
    stateVersion: 2,
    stateSchema: progressSchema,
    init: () => createProgressState(currentSettings().defaultEnabled),
    apply: (state, event) => applyProgressSafely(
      state,
      event,
      currentSettings().defaultEnabled,
      error => ctx.logger?.warn?.('[dsh-info-check] projection event skipped: %o', error),
    ),
    wire: {
      viewSchema: progressSchema,
      view: state => {
        try {
          return normalizeProgress(state, currentSettings().defaultEnabled)
        } catch (error) {
          ctx.logger?.warn?.('[dsh-info-check] projection view reset: %o', error)
          return createProgressState(currentSettings().defaultEnabled)
        }
      },
    },
  })).then((handle) => {
    projection = handle
  }, (error) => {
    ctx.logger?.warn?.('[dsh-info-check] progress projection registration failed: %o', error)
  })

  const enabledFor = (session) => {
    const fallback = currentSettings().defaultEnabled
    if (session === undefined || projection === undefined) return fallback
    try {
      return projection.stateOf(session).enabled
    } catch {
      return fallback
    }
  }

  ctx.inject(['commands'], (commandCtx) => {
    commandCtx.commands.register({
      definitionId: 'dsh-info-check',
      name: 'dsh-info-check',
      description: 'Turn dsh-info-check on or off, report status, self-check, run a retrospective, show the quality or budget standard, or open a result file location',
      input: { hint: '[on|off|reset|status|selfcheck|retrospective|quality [rebuild]|budget|open <absolute path>]' },
      handler: async ({ agent, rawInput }) => {
        const raw = rawInput.trim()
        const value = raw.toLowerCase()
        if (value === 'selfcheck') {
          const report = runSelfCheck({ root: packageRoot, checkSyntax: false })
          return {
            kind: report.ok ? 'success' : 'error',
            text: formatSelfCheck(report),
          }
        }
        if (raw.toLowerCase().startsWith('quality custom ')) {
          if (agent === undefined) return { kind: 'error', text: '写入质量标准需要一个活跃对话。' }
          try {
            const encoded = raw.slice('quality custom '.length).trim()
            const text = Buffer.from(encoded, 'base64').toString('utf8')
            const written = await retrospective.writeManual(agent.session, text)
            return written
              ? { kind: 'success', text: '质量标准已写入 quality-standard.md。' }
              : { kind: 'error', text: '无法写入质量标准文件。' }
          } catch (error) {
            ctx.logger?.warn?.('[dsh-info-check] quality custom failed: %o', error)
            return { kind: 'error', text: `质量标准写入失败：${error.message}` }
          }
        }
        if (value === 'quality rebuild') {
          if (agent === undefined) return { kind: 'error', text: '重建质量标准需要一个活跃对话。' }
          try {
            const rebuilt = await retrospective.rebuildStandard(agent.session)
            return {
              kind: 'success',
              text: rebuilt ? '已根据已保存的复盘重建用户工作质量标准。' : '还没有足够的复盘记录，暂时无法重建质量标准。',
            }
          } catch (error) {
            ctx.logger?.warn?.('[dsh-info-check] quality rebuild failed: %o', error)
            return { kind: 'error', text: `质量标准重建失败：${error.message}` }
          }
        }
        if (value === 'quality') {
          const quality = agent === undefined ? '' : retrospective.standardFor(agent.session)
          return quality === ''
            ? { kind: 'success', text: '当前还没有用户工作质量标准；每完成 3 次任务后自动生成。' }
            : { kind: 'success', text: quality }
        }
        if (value === 'budget') {
          const budget = agent === undefined ? '' : budgetStore.standardFor(agent.session)
          return budget === ''
            ? { kind: 'success', text: '当前还没有用户预算标准；每完成 3 次预算结算后自动生成。' }
            : { kind: 'success', text: budget }
        }
        if (value === 'open ledger' || value === 'open retrospectives' || value === 'open quality' || value === 'open budget') {
          if (agent === undefined) return { kind: 'error', text: '文件位置需要一个活跃对话。' }
          try {
            const settings = currentSettings()
            const cwd = ctx.workingDirectory.get(agent.session)
            const ledgerFull = isAbsolute(settings.ledgerPath) ? resolve(settings.ledgerPath) : resolve(cwd, settings.ledgerPath)
            const target = value === 'open ledger'
              ? ledgerFull
              : join(dirname(ledgerFull), value === 'open retrospectives'
                ? 'retrospectives.md'
                : value === 'open quality' ? 'quality-standard.md' : 'budget-standard.md')
            if (!existsSync(target)) {
              return { kind: 'error', text: `文件尚未生成：${target}` }
            }
            spawn('explorer.exe', [`/select,${target}`], { detached: true, stdio: 'ignore' }).unref()
            return { kind: 'success', text: `Opened the file location: ${target}` }
          } catch (error) {
            return { kind: 'error', text: `Could not open the file location: ${error.message}` }
          }
        }
        if (value === 'retrospective') {
          if (agent === undefined) return { kind: 'error', text: '复盘需要一个活跃对话。' }
          const events = await ledger.consume(agent.session)
          if (events.length === 0) return { kind: 'success', text: '当前任务没有可复盘的记录。' }
          try {
            const result = await retrospective.record(agent.session, events)
            return {
              kind: 'success',
              text: result.status === 'written'
                ? `已记录第 ${result.taskNumber} 次复盘${result.standardUpdated ? '，并更新了用户工作质量标准' : ''}。${result.summary === '' ? '' : `\n\n${result.summary}`}`
                : '当前任务没有可复盘的记录。',
            }
          } catch (error) {
            ctx.logger?.warn?.('[dsh-info-check] manual retrospective failed: %o', error)
            return { kind: 'error', text: `复盘生成失败：${error.message}` }
          }
        }
        if (value.startsWith('open ')) {
          const requested = raw.slice(5).trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1')
          if (!isAbsolute(requested)) {
            return { kind: 'error', text: 'Use an absolute file path with /dsh-info-check open.' }
          }
          if (!existsSync(requested)) {
            return { kind: 'error', text: `File not found: ${requested}` }
          }
          try {
            spawn('explorer.exe', ['/select,', requested], { detached: true, stdio: 'ignore' }).unref()
            return { kind: 'success', text: `Opened the file location: ${requested}` }
          } catch (error) {
            return { kind: 'error', text: `Could not open the file location: ${error.message}` }
          }
        }
        if (value === 'reset') {
          if (agent !== undefined) {
            const time = new Date().toLocaleString('zh-CN', { hour12: false })
            await ledger.append(agent.session, `### 任务重置 · ${time}\n\n- 用户清除进度条，当前任务结束。\n`)
            ledger.clearPlan(agent.session)
          }
          return { kind: 'success', text: '已清除本次任务的进度条和里程碑计划。' }
        }
        if (value === 'on' || value === 'off') {
          return {
            kind: 'success',
            text: value === 'on'
              ? 'dsh-info-check on for this conversation.'
              : 'dsh-info-check off for this conversation.',
          }
        }
        if (value === 'status' || value === '') {
          return {
            kind: 'success',
            text: `dsh-info-check is ${enabledFor(agent.session) ? 'on' : 'off'} for this conversation.`,
          }
        }
        return { kind: 'error', text: 'Use /dsh-info-check on, off, selfcheck, retrospective, quality, or open <absolute path>.' }
      },
    })
  })

  ctx.effect(() => ctx.systemPrompt.section({
    name: 'dsh-info-check:policy',
    order: ctx.systemPrompt.getSectionOrder('PLAN_POLICY'),
    text: (context) => {
      const agent = context.agent
      if (agent === undefined) return defaultPolicy(currentSettings())
      if (!enabledFor(agent.session)) return ''
      const quality = retrospective.standardFor(agent.session)
      const budget = budgetStore.standardFor(agent.session)
      const policy = defaultPolicy(currentSettings())
      const qualitySection = quality === ''
        ? ''
        : `\n\n## 用户工作质量标准（来自本地台账复盘）\n\n${quality}`
      const budgetSection = budget === ''
        ? ''
        : `\n\n## 用户预算标准（来自本地预算结算）\n\n${budget}`
      return `${policy}${qualitySection}${budgetSection}`
    },
  }), 'dsh-info-check: policy')

  ctx.inject(['webServer'], (webCtx) => {
    webCtx.effect(() => webCtx.webServer.register({
      kind: 'exact',
      path: '/dsh-info-check/budget-live',
      handler: async (req, res) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          res.writeHead(405, { allow: 'GET, HEAD' })
          res.end()
          return
        }
        let body = { empty: true }
        try {
          const contract = await budgetStore.latest()
          if (contract !== undefined) {
            const origin = webCtx.webServer.getOrigin()
            const measured = await readCost(contract.sessionId, origin)
            const baseline = Number(contract.costBaseline) || 0
            body = {
              contract,
              cost: measured === undefined || baseline <= 0
                ? 0
                : Math.max(0, Math.round((measured.cny - baseline) * 100) / 100),
              source: measured === undefined || baseline <= 0
                ? 'unavailable'
                : `${measured.source}:task-delta`,
              since: contract.signedAt || contract.startedAt,
              at: Date.now(),
            }
          }
        } catch (error) {
          ctx.logger?.warn?.('[dsh-info-check] budget chart state failed: %o', error)
        }
        const text = JSON.stringify(body)
        res.writeHead(200, {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-store',
          'content-length': Buffer.byteLength(text),
        })
        res.end(req.method === 'HEAD' ? undefined : text)
      },
    }), 'dsh-info-check: budget chart route')
    webCtx.effect(() => webCtx.webServer.register({
      kind: 'exact',
      path: '/dsh-info-check/contract-page',
      handler: async (req, res) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          res.writeHead(405, { allow: 'GET, HEAD' })
          res.end()
          return
        }
        let body = { contracts: [] }
        try {
          body = { contracts: await budgetStore.contracts() }
        } catch (error) {
          ctx.logger?.warn?.('[dsh-info-check] contract page state failed: %o', error)
        }
        const text = JSON.stringify(body)
        res.writeHead(200, {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-store',
          'content-length': Buffer.byteLength(text),
        })
        res.end(req.method === 'HEAD' ? undefined : text)
      },
    }), 'dsh-info-check: contract page route')

    webCtx.effect(() => webCtx.webServer.register({
      kind: 'exact',
      path: '/dsh-info-check/standards',
      handler: async (req, res) => {
        const send = (status, body) => {
          const text = JSON.stringify(body)
          res.writeHead(status, {
            'content-type': 'application/json; charset=utf-8',
            'cache-control': 'no-store',
            'content-length': Buffer.byteLength(text),
          })
          res.end(req.method === 'HEAD' ? undefined : text)
        }
        try {
          const contract = await budgetStore.latest()
          const candidates = []
          const sessionCwd = (() => {
            const root = join(process.env.DSH_HOME ?? join(homedir(), '.dsh'), 'sessions')
            if (root === undefined || !existsSync(root) || contract?.sessionId === undefined) return undefined
            const target = String(contract.sessionId)
            const stack = [root]
            while (stack.length > 0) {
              const current = stack.pop()
              let entries = []
              try {
                entries = readdirSync(current, { withFileTypes: true })
              } catch {
                continue
              }
              for (const entry of entries) {
                if (entry.isDirectory()) {
                  if (entry.name === target) {
                    const encoded = basename(current).replace(/^--|--$/g, '').replaceAll('~0020', ' ')
                    const match = /^([A-Za-z])-(.*)$/.exec(encoded)
                    if (match !== null) return `${match[1]}:\\${match[2].replaceAll('-', '\\')}`
                  }
                  stack.push(join(current, entry.name))
                }
              }
            }
            return undefined
          })()
          if (typeof contract?.cwd === 'string' && contract.cwd !== '') candidates.push(join(contract.cwd, '.dsh-info-check'))
          if (sessionCwd !== undefined) candidates.push(join(sessionCwd, '.dsh-info-check'))
          for (const directory of ledgerDirs) candidates.push(directory)
          if (typeof ctx.workingDirectory?.defaultDirectory === 'string' && ctx.workingDirectory.defaultDirectory !== '') {
            candidates.push(join(ctx.workingDirectory.defaultDirectory, '.dsh-info-check'))
          }
          const unique = [...new Set(candidates)]
          const existing = unique.filter(directory => existsSync(join(directory, 'quality-standard.md'))
            || existsSync(join(directory, 'budget-standard.md')))
          const dir = existing.sort((a, b) => {
            const at = (() => { try { return statSync(join(a, 'quality-standard.md')).mtimeMs } catch { return 0 } })()
            const bt = (() => { try { return statSync(join(b, 'quality-standard.md')).mtimeMs } catch { return 0 } })()
            return bt - at
          })[0] ?? unique[0] ?? join(process.cwd(), '.dsh-info-check')
          const files = { quality: 'quality-standard.md', budget: 'budget-standard.md' }
          const readOne = async (kind) => {
            const path = join(dir, files[kind])
            let content = ''
            let updatedAt = 0
            try {
              content = await readFile(path, 'utf8')
              updatedAt = statSync(path).mtimeMs
            } catch {
              // A standard may not exist until the first review/settlement.
            }
            return { file: files[kind], path, content, updatedAt }
          }
          if (req.method === 'GET' || req.method === 'HEAD') {
            send(200, { directory: dir, quality: await readOne('quality'), budget: await readOne('budget') })
            return
          }
          if (req.method !== 'POST') {
            res.writeHead(405, { allow: 'GET, HEAD, POST' })
            res.end()
            return
          }
          const chunks = []
          let size = 0
          for await (const chunk of req) {
            size += chunk.length
            if (size > 200_000) {
              send(413, { error: 'standard content is too large' })
              return
            }
            chunks.push(chunk)
          }
          let payload
          try {
            payload = JSON.parse(Buffer.concat(chunks).toString('utf8'))
          } catch {
            send(400, { error: 'invalid JSON' })
            return
          }
          if (payload?.kind !== 'quality' && payload?.kind !== 'budget') {
            send(400, { error: 'kind must be quality or budget' })
            return
          }
          if (typeof payload.content !== 'string' || payload.content.length > 120_000) {
            send(400, { error: 'content must be a string under 120000 characters' })
            return
          }
          await mkdir(dir, { recursive: true })
          await writeFile(join(dir, files[payload.kind]), payload.content, 'utf8')
          send(200, { ok: true, ...(await readOne(payload.kind)) })
        } catch (error) {
          send(500, { error: String(error?.message ?? error) })
        }
      },
    }), 'dsh-info-check: standards route')

    webCtx.effect(() => webCtx.webServer.register({
      kind: 'exact',
      path: '/dsh-info-check/notifications',
      handler: async (req, res) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          res.writeHead(405, { allow: 'GET, HEAD' })
          res.end()
          return
        }
        const text = JSON.stringify({ items: listNotifications() })
        res.writeHead(200, {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-store',
          'content-length': Buffer.byteLength(text),
        })
        res.end(req.method === 'HEAD' ? undefined : text)
      },
    }), 'dsh-info-check: notifications route')

    webCtx.effect(() => webCtx.webServer.register({
      kind: 'exact',
      path: '/dsh-info-check/language',
      handler: async (req, res) => {
        const text = JSON.stringify({ language: currentSettings().language })
        res.writeHead(200, {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-store',
          'content-length': Buffer.byteLength(text),
        })
        res.end(text)
      },
    }), 'dsh-info-check: language route')
  })

  function createSituationTool({ ctx, enabledFor, budgetStore, ledger, getTimeoutSeconds }) {
    return {
      name: 'situation_check',
      description: '在执行中遇到不确定的问题时，随时向用户发起“情况对接”卡片：只读当前问题、agent 的多个建议、用户意见输入框。'
        + '这不是固定阶段确认，可以在任意插件/skill/里程碑执行中调用。'
        + '关键边界（地区、范围、数据、验收口径、预算）发生变化时，必须用 kind=boundary，并在取得用户回答后再提交验收。'
        + '用户选择或填写后返回其意见；倒计时结束或关闭卡片时返回 timeout/cancelled，并让 agent 按自己的理解继续执行。'
        + '卡片行动会写入任务台账时间线。',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          question: { type: 'string', description: '当前需要对接的问题，只读展示。' },
          kind: { type: 'string', enum: ['general', 'boundary'], description: '边界变化核对用 boundary；普通执行疑问用 general。' },
          context: { type: 'string', description: '可选：只读的背景、约束或候选方案说明。' },
          suggestions: {
            type: 'array', minItems: 1, maxItems: 8,
            description: 'agent 的建议选项；推荐项放第一。',
            items: {
              type: 'object', additionalProperties: false,
              properties: {
                label: { type: 'string', description: '建议标题。' },
                description: { type: 'string', description: '可选：建议说明。' },
              },
              required: ['label'],
            },
          },
          multiple: { type: 'boolean', description: '是否允许选择多个建议，默认 false。' },
          timeoutSeconds: { type: 'integer', minimum: 15, maximum: 600, description: '倒计时秒数；默认使用插件超时设置。' },
        },
        required: ['question', 'suggestions'],
      },
      output: {
        schema: {
          type: 'object', additionalProperties: false,
          properties: {
            decision: { type: 'string', enum: ['answered', 'timeout', 'cancelled'] },
            proceed: { type: 'boolean' },
            selected: { type: 'array', items: { type: 'string' } },
            opinion: { type: 'string' },
          },
          required: ['decision', 'proceed', 'selected', 'opinion'],
        },
        render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
      },
      async execute(args, exec) {
        const agent = exec.agent
        if (agent === undefined) throw new Error('situation_check requires a live agent')
        if (!enabledFor(agent.session)) throw new Error('dsh-info-check is disabled for this conversation')
        const questionText = String(args?.question ?? '').trim()
        if (questionText === '') throw new Error('question is required')
        const kind = args.kind === 'boundary' ? 'boundary' : 'general'
        const suggestions = (Array.isArray(args.suggestions) ? args.suggestions : [])
          .filter(item => item !== null && typeof item === 'object' && typeof item.label === 'string')
          .slice(0, 8)
          .map(item => ({ label: item.label.slice(0, 120), ...(typeof item.description === 'string' ? { description: item.description.slice(0, 300) } : {}) }))
        if (suggestions.length === 0) throw new Error('at least one suggestion is required')
        const multiple = args.multiple === true
        const timeoutSeconds = Math.min(600, Math.max(15, Number(args.timeoutSeconds) || Number(getTimeoutSeconds()) || 120))
        const context = typeof args.context === 'string' && args.context.trim() !== '' ? args.context.trim().slice(0, 4000) : undefined
        notifyDialog('dsh-info-check · 情况对接', questionText)
        const question = {
          id: SITUATION_ID,
          header: 'dsh-info-check · 情况对接',
          question: questionText,
          ...(context === undefined ? {} : { detail: context }),
          situation: { suggestions, multiple, kind },
          options: suggestions.map(item => ({ label: item.label, ...(item.description === undefined ? {} : { description: item.description }) })),
          ...(multiple ? { multiSelect: true } : {}),
        }
        let result
        try {
          result = await ctx.userQuestions.askTimed(
            { questions: [question], agent, signal: exec.signal },
            exec.callId,
            timeoutSeconds * 1000,
          )
        } catch (error) {
          if (isCancelled(error)) {
            await budgetStore.recordSituation(agent.session, {
              question: questionText, kind, suggestions, selected: [], opinion: '', decision: 'cancelled',
            }).catch(() => {})
            await ledger.append(agent.session, `情况对接取消：${questionText}`, { type: 'situation', decision: 'cancelled' }).catch(() => {})
            return { decision: 'cancelled', proceed: true, selected: [], opinion: '' }
          }
          throw error
        }
        if (result.pending === true) {
          await budgetStore.recordSituation(agent.session, {
            question: questionText, kind, suggestions, selected: [], opinion: '', decision: 'timeout',
          }).catch(() => {})
          await ledger.append(agent.session, `情况对接超时，按 agent 理解继续：${questionText}`, { type: 'situation', decision: 'timeout' }).catch(() => {})
          return { decision: 'timeout', proceed: true, selected: [], opinion: '' }
        }
        const answer = result.answers?.[0] ?? { id: SITUATION_ID, selected: [] }
        const selected = Array.isArray(answer.selected) ? answer.selected.filter(item => typeof item === 'string') : []
        const opinion = typeof answer.custom === 'string' ? answer.custom.trim() : ''
        if (selected.length === 1 && selected[0] === SITUATION_SKIP) {
          await budgetStore.recordSituation(agent.session, {
            question: questionText, kind, suggestions, selected: [], opinion, decision: 'cancelled',
          }).catch(() => {})
          await ledger.append(agent.session, `情况对接关闭，按 agent 理解继续：${questionText}`, { type: 'situation', decision: 'cancelled' }).catch(() => {})
          return { decision: 'cancelled', proceed: true, selected: [], opinion }
        }
        await budgetStore.recordSituation(agent.session, {
          question: questionText, kind, suggestions, selected, opinion, decision: 'answered',
        }).catch(() => {})
        await ledger.append(agent.session, `情况对接：${questionText}\n选择：${selected.join('、') || '无'}\n意见：${opinion || '无'}`, {
          type: 'situation', decision: 'answered', selected, opinion,
        }).catch(() => {})
        return { decision: 'answered', proceed: true, selected, opinion }
      },
      presentCall(args) {
        return {
          card: 'generic',
          title: 'dsh-info-check · 情况对接',
          kind: 'other',
          content: [{ type: 'text', text: String(args?.question ?? '') }],
        }
      },
    }
  }

  const definitions = [
    createSituationTool({ ctx, enabledFor, budgetStore, ledger, getTimeoutSeconds: () => currentSettings().timeoutSeconds }),    createInfoCheckTool({ ctx, enabledFor, getMaxQuestions: () => currentSettings().maxQuestions, ledger, budgetStore }),
    createForecastBudgetTool({
      enabledFor,
      getOrigin: () => {
        try {
          return ctx.get('webServer')?.getOrigin?.()
        } catch {
          return undefined
        }
      },
    }),
    createBudgetProposalTool({
      ctx, enabledFor, getTimeoutSeconds: () => currentSettings().timeoutSeconds, ledger, budgetStore,
      getOrigin: () => {
        try {
          return ctx.get('webServer')?.getOrigin?.()
        } catch {
          return undefined
        }
      },
    }),
    createAcceptTool({
      ctx, enabledFor, getTimeoutSeconds: () => currentSettings().timeoutSeconds, ledger,
      getSupervisionMode: () => currentSettings().supervisionMode,
      getSupervisorEnabled: () => currentSettings().supervisorAgent,
      budgetStore,
    }),
    createBudgetReviewTool({ ctx, enabledFor, getTimeoutSeconds: () => currentSettings().timeoutSeconds, ledger, budgetStore }),
    createDeliveryTool({
      ctx, enabledFor, getTimeoutSeconds: () => currentSettings().timeoutSeconds, ledger,
      onDeliveryConfirmed: reviewAfterDelivery, budgetStore,
      getAuditEnabled: () => currentSettings().auditAgent,
      getSupervisorEnabled: () => currentSettings().supervisorAgent,
    }),
    createBudgetSettlementTool({
      ctx, enabledFor, getTimeoutSeconds: () => currentSettings().timeoutSeconds, ledger, budgetStore,
      getAuditEnabled: () => currentSettings().auditAgent,
      getSupervisorEnabled: () => currentSettings().supervisorAgent,
    }),
  ]
  for (const definition of definitions) {
    ctx.effect(
      () => ctx.tools.register(definition),
      `dsh-info-check: tool ${definition.name}`,
    )
  }
}
