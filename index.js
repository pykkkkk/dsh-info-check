/**
 * dsh-info-check Host half.
 *
 * Registers a policy section, the `info_check` / `confirm_milestone` /
 * `accept_milestone` / `confirm_delivery` tools, a per-Session enabled
 * projection, and a workspace ledger. The header switch executes
 * `/dsh-info-check on|off`; the logged command drives the projection, so each
 * conversation owns its own state.
 *
 * This file imports only Node built-ins and its own pure helpers, so the
 * bundle can be installed into any compatible DSH profile without package
 * dependencies.
 */
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, isAbsolute, join, resolve, sep } from 'node:path'
import { appendFile, mkdir, readFile } from 'node:fs/promises'
import {
  ACCEPT_LABEL, ACCEPT_MILESTONE_ID, ADJUST_DELIVERY_LABEL, APPROVE_MILESTONE_LABEL, DELIVER_LABEL,
  DELIVERY_CONFIRM_ID, INTENT_BRIEF_ID, MILESTONE_CONFIRM_ID, PAUSE_LABEL, REWORK_LABEL,
  acceptanceDetail, acceptanceLedger, acceptanceOutcome,
  briefMarkdown, deliveryDetail, deliveryLedger, deliveryOutcome,
  infoCheckLedger, intentOutcome, milestoneLedger, milestoneOutcome, numberPoints,
  validateAcceptance, validateDelivery, validateInfoCheck, validateMilestone,
} from './lib/pure.js'

export const inject = ['tools', 'systemPrompt', 'userQuestions', 'workingDirectory', 'sessionProjections']

const ledgerDirs = new Set()

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
  return `## 需求核对与里程碑确认（dsh-info-check）

本会话启用了 dsh-info-check。对非平凡任务（会改文件、改 UI、多步骤、需求有歧义，或用户用了“好看 / 优化 / 差不多 / 全部 / 顺便”这类没有验收标准的词），必须遵守以下流程：

用户偏好：希望拆成 ${milestoneCount} 个里程碑；期望程度为 **${EXPECTATION_LABELS[normalizeExpectation(expectation)]}**。按这个标准设计方案、验收和交付确认。

1. 先调用 \`info_check\`：用一段话复述目标；列出 ${minQuestions}–${maxQuestions} 条真正影响结果的**细节**核对问题（每题给选项，推荐项放第一并标注“（推荐）”）；给出可检查的完成标准（quality_bar）、明确的范围外（out_of_scope）、${milestoneRule}（milestones）。所有要点每点单独一行/一段，用 1. 2. 3. 编号，不要挤成一段。第一张卡是**可编辑的核对单**：用户会直接在你的版本上修改、补充，勾选确认后才进入细节选择；返回的 \`edited_brief\` 若与你的版本不同，以 \`edited_brief\` 为准。
2. 用户点卡片右上角的 X 表示**跳过**，不是取消任务：工具会返回 confirmed=true / decision=skipped，按 agent 原始版本自动进入下一阶段；不要重新发起确认，也不要停下来等待。
3. \`confirmed=true\` 后再开工；\`confirmed=false\`（工具明确拒绝或真实失败）时不要执行；需要时按用户的最新说法重新发起核对。
4. 需求核对确认后，**只调用一次** \`confirm_milestone\`，确认整体执行方案/第一个里程碑（做什么、改哪些文件、怎么验证）；后续里程碑**不再调用** \`confirm_milestone\`，直接执行。方案每一点单独一段并用 1. 2. 3. 编号。卡片顶部会标注 \`dsh-info-check · 里程碑确认\`，方案可编辑；返回的 \`edited_plan\` 若与你的版本不同，以它为准。
5. \`confirm_milestone\` 的结果：
   - \`approved\` / \`skipped\` / \`timeout\`：按方案执行（timeout 表示用户 ${timeoutSeconds} 秒未操作，已按约定跳过）。
   - 用户可以在倒计时处点“停止计时”，倒计时停止、浮窗不关闭；等用户修改完再按“按此方案执行”。不要在没有用户确认时继续。
6. 每个里程碑完成后，调用 \`accept_milestone\`，提交完成内容、验证证据和未完成/风险（每点单独一行，界面会按 1. 2. 3. 编号显示）；用户验收通过或超时后再进入下一个里程碑。不要合并里程碑，不要擅自扩大范围。
6a. 如果 \`accept_milestone\` 返回 \`decision=paused\`，立即停止当前任务：整理已完成内容、当前进度、未完成/风险和相关文件路径，然后结束当前任务（不再等待继续）；不要进入下一里程碑，也不要调用 \`confirm_delivery\`。
7. 任务明显简单且无歧义（单文件小改、用户已给出完整规格）时，说明假设后直接做，不必走流程。
8. 不要手动修改 \`.dsh-info-check/ledger.md\`；插件会自动记录每次选择。需要补充执行说明时，写在最终答复里。
9. 子代理不要调用 \`info_check\` / \`confirm_milestone\` / \`accept_milestone\` / \`confirm_delivery\`；把需要用户决定的问题写进最终结果。
10. 验收返回 \`rework\` 时，按 feedback（用户在“返修说明”浮窗里填写的理由）修改，然后再次调用 \`accept_milestone\`；不要忽略理由，也不要直接进入下一个里程碑。
11. 准备交付最终结果前，调用 \`confirm_delivery\`，写明完成程度、交付内容、未完成/限制和验证（每点单独一行，界面会编号）；用户确认或超时后再交付。返回 \`adjust\` 时，按 feedback（用户在“调整说明”浮窗里填写的理由）修改后再确认交付。

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
  }

  append(session, body) {
    const options = this.getOptions()
    if (!options.enabled || session === undefined) return Promise.resolve()
    try {
      const cwd = this.ctx.workingDirectory.get(session)
      const root = resolve(cwd)
      const full = isAbsolute(options.path) ? resolve(options.path) : resolve(root, options.path)
      if (full !== root && !full.startsWith(root + sep)) {
        this.ctx.logger?.warn?.('[dsh-info-check] ledger path escapes the session workspace; skip %s', full)
        return Promise.resolve()
      }
      const sid = String(session.id)
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
      }).catch((error) => {
        this.ctx.logger?.warn?.('[dsh-info-check] ledger write failed: %o', error)
      })
    } catch (error) {
      this.ctx.logger?.warn?.('[dsh-info-check] ledger path resolution failed: %o', error)
    }
    return this.tail
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
    header: 'dsh-info-check · 需求核对',
    question: '请先修改下面的核对单；确认无误后勾选“我已确认”，再进入细节确认。',
    detail,
  }
}

function createInfoCheckTool({ ctx, enabledFor, getMaxQuestions, ledger }) {
  return {
    name: 'info_check',
    description: '在开始实质性执行前，向用户确认意图。提交目标理解、细节核对问题、可检查的完成标准、范围外和里程碑。'
      + '所有要点每点单独一行/一段，并用 1. 2. 3. 编号；不要挤成一段。'
      + '第一张卡是可编辑的核对单：用户会直接在你的版本上修改、补充，勾选后才进入细节选择。'
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
          title: 'dsh-info-check · 需求核对单',
          kind: 'other',
          content: [{ type: 'text', text: briefMarkdown(brief) }],
        }
      } catch {
        return undefined
      }
    },
    presentResult(_args, result) {
      return { card: 'generic', title: 'dsh-info-check · 需求核对', content: result.content }
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
        return { decision: 'timeout', proceed: true }
      }
      const outcome = milestoneOutcome(result.answers[0], milestone.plan)
      await ledger.append(agent.session, milestoneLedger(milestone, {
        decision: outcome.decision,
        ...(outcome.feedback === undefined ? {} : { feedback: outcome.feedback }),
        ...(outcome.editedPlan === undefined ? {} : { editedPlan: outcome.editedPlan }),
      }))
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

function createAcceptTool({ ctx, enabledFor, getTimeoutSeconds, ledger }) {
  return {
    name: 'accept_milestone',
    description: '在一个里程碑完成后，向用户验收：提交完成内容、验证证据、未完成或风险；用户验收通过（或倒计时结束）后再进入下一个里程碑。'
      + '用户可以在倒计时处停止计时；验收报告是只读的，用户点“需要返工”时会在“返修说明”浮窗里填写理由，reason 通过 feedback 返回，按它修改后再次验收。'
      + '用户点“暂停任务”时返回 decision=paused；此时整理进度并结束当前任务，不进入下一里程碑。'
      + '可选 files 传结果文件绝对路径，验收卡会显示为“打开所在位置”链接。'
      + '用户在备注里写的额外要求通过 notes 返回。',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        milestone: { type: 'string', description: '里程碑 id 或标题。' },
        summary: { type: 'string', description: '这个里程碑完成了什么；每点单独一行，界面会按 1. 2. 3. 编号显示。' },
        evidence: { type: 'string', description: '验证证据：测试、命令、文件或截图；每点单独一行，界面会编号。' },
        gaps: { type: 'string', description: '可选的未完成项或风险；每点单独一行，界面会编号。' },
        files: {
          type: 'array',
          items: { type: 'string' },
          description: '可选的结果文件绝对路径；验收卡会显示为可点击的“打开所在位置”链接。',
        },
      },
      required: ['milestone', 'summary', 'evidence'],
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
      const question = {
        id: ACCEPT_MILESTONE_ID,
        header: 'dsh-info-check · 里程碑验收',
        question: `里程碑「${acceptance.milestone}」已完成，是否验收通过？`,
        detail: acceptanceDetail(acceptance),
        options: [
          { label: ACCEPT_LABEL, description: '验收通过，进入下一个里程碑' },
          { label: REWORK_LABEL, description: '不通过，需要返工' },
          { label: PAUSE_LABEL, description: '暂停任务，整理现有进度后结束当前任务' },
        ],
      }
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
          await ledger.append(agent.session, acceptanceLedger(acceptance, { decision: 'cancelled' }))
          return { decision: 'cancelled', proceed: false }
        }
        throw error
      }
      if (result.pending === true) {
        await ledger.append(agent.session, acceptanceLedger(acceptance, { decision: 'timeout' }))
        return { decision: 'timeout', proceed: true }
      }
      const outcome = acceptanceOutcome(result.answers[0])
      await ledger.append(agent.session, acceptanceLedger(acceptance, {
        decision: outcome.decision,
        ...(outcome.feedback === undefined ? {} : { feedback: outcome.feedback }),
        ...(outcome.notes === undefined ? {} : { notes: outcome.notes }),
      }))
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

function createDeliveryTool({ ctx, enabledFor, getTimeoutSeconds, ledger }) {
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
      const question = {
        id: DELIVERY_CONFIRM_ID,
        header: 'dsh-info-check · 交付确认',
        question: '是否确认按以上完成程度交付最终结果？',
        detail: deliveryDetail(delivery),
        options: [
          { label: DELIVER_LABEL, description: '确认并交付最终结果' },
          { label: ADJUST_DELIVERY_LABEL, description: '先不交付，需要调整' },
        ],
      }
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
        return { decision: 'timeout', proceed: true }
      }
      const outcome = deliveryOutcome(result.answers[0])
      await ledger.append(agent.session, deliveryLedger(delivery, {
        decision: outcome.decision,
        ...(outcome.feedback === undefined ? {} : { feedback: outcome.feedback }),
        ...(outcome.notes === undefined ? {} : { notes: outcome.notes }),
      }))
      return {
        decision: outcome.decision,
        proceed: outcome.proceed,
        ...(outcome.feedback === undefined ? {} : { feedback: outcome.feedback }),
        ...(outcome.notes === undefined ? {} : { notes: outcome.notes }),
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
    return { milestoneCount, expectation, timeoutSeconds, maxQuestions, defaultEnabled, ledgerEnabled, ledgerPath }
  }

  const ledger = new Ledger(ctx, () => {
    const settings = currentSettings()
    return { enabled: settings.ledgerEnabled, path: settings.ledgerPath }
  })

  // Per-Session switch. A third-party plugin cannot append a custom Session
  // event, so the switch rides the logged `/dsh-info-check on|off` command and a
  // projection folds it; fork and resume replay the same commands.
  const enabledSchema = {
    parse(value) {
      if (value === null || typeof value !== 'object' || typeof value.enabled !== 'boolean') {
        throw new Error('dsh-info-check projection state must be { enabled: boolean }')
      }
      return value
    },
  }
  let projection
  Promise.resolve(ctx.sessionProjections.register({
    key: 'infoCheck',
    stateVersion: 1,
    stateSchema: enabledSchema,
    init: () => ({ enabled: currentSettings().defaultEnabled }),
    apply: (state, event) => {
      if (event.type === 'command/run' && event.data.name === 'dsh-info-check') {
        const value = typeof event.data.args === 'string' ? event.data.args.trim().toLowerCase() : ''
        if (value === 'on') return { enabled: true }
        if (value === 'off') return { enabled: false }
      }
      return state
    },
    wire: {
      viewSchema: enabledSchema,
      view: state => state,
    },
  })).then((handle) => {
    projection = handle
  }, (error) => {
    ctx.logger?.warn?.('[dsh-info-check] enabled projection registration failed: %o', error)
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
      description: 'Turn dsh-info-check on or off, report status, or open a result file location',
      input: { hint: '[on|off|status|open <absolute path>]' },
      handler: ({ agent, rawInput }) => {
        const raw = rawInput.trim()
        const value = raw.toLowerCase()
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
        return { kind: 'error', text: 'Use /dsh-info-check on, /dsh-info-check off, or /dsh-info-check status.' }
      },
    })
  })

  ctx.effect(() => ctx.systemPrompt.section({
    name: 'dsh-info-check:policy',
    order: ctx.systemPrompt.getSectionOrder('PLAN_POLICY'),
    text: (context) => {
      const agent = context.agent
      if (agent === undefined) return defaultPolicy(currentSettings())
      return enabledFor(agent.session) ? defaultPolicy(currentSettings()) : ''
    },
  }), 'dsh-info-check: policy')

  const definitions = [
    createInfoCheckTool({ ctx, enabledFor, getMaxQuestions: () => currentSettings().maxQuestions, ledger }),
    createMilestoneTool({ ctx, enabledFor, getTimeoutSeconds: () => currentSettings().timeoutSeconds, ledger }),
    createAcceptTool({ ctx, enabledFor, getTimeoutSeconds: () => currentSettings().timeoutSeconds, ledger }),
    createDeliveryTool({ ctx, enabledFor, getTimeoutSeconds: () => currentSettings().timeoutSeconds, ledger }),
  ]
  for (const definition of definitions) {
    ctx.effect(
      () => ctx.tools.register(definition, {
        when: ({ agent }) => enabledFor(agent.session),
      }),
      `dsh-info-check: tool ${definition.name}`,
    )
  }
}
