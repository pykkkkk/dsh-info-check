/**
 * Optional audit subagent run before delivery/settlement cards.
 *
 * The auditor is a fresh in-process child. It receives the draft card payload
 * plus a bounded transcript of the session (assistant reasoning/text, tool
 * calls and tool results), then answers a small structured verdict. Failure
 * to start or parse the auditor is advisory: the card still opens, with an
 * explicit "audit unavailable" note.
 */
function blockText(blocks) {
  if (!Array.isArray(blocks)) return typeof blocks === 'string' ? blocks : ''
  return blocks.map((block) => {
    if (block === null || typeof block !== 'object') return ''
    if (block.type === 'text') return block.text ?? ''
    if (block.type === 'reasoning') return `[思考] ${block.text ?? ''}`
    if (block.type === 'tool-call') return `[工具调用] ${block.name ?? ''} ${block.arguments ?? ''}`
    return ''
  }).filter(Boolean).join('\n')
}

export function executionTranscript(session, limit = 36000) {
  const events = typeof session?.snapshotEvents === 'function' ? session.snapshotEvents() : []
  const lines = []
  for (const event of events) {
    if (event === null || typeof event !== 'object') continue
    const data = event.data ?? {}
    if (event.type === 'user/message') {
      lines.push(`[用户] ${blockText(data.message?.content)}`)
    } else if (event.type === 'assistant/message') {
      lines.push(`[助手] ${blockText(data.message?.content)}`)
    } else if (event.type === 'tool/call') {
      lines.push(`[工具调用] ${data.name ?? ''} ${String(data.arguments ?? '').slice(0, 1200)}`)
    } else if (event.type === 'tool/result') {
      lines.push(`[工具结果] ${blockText(data.message?.content).slice(0, 1800)}`)
    }
  }
  const text = lines.join('\n\n')
  return text.length <= limit ? text : `…（较早记录已截断）…\n\n${text.slice(-limit)}`
}

function promptFor(kind, payload, contract, transcript, light = false) {
  return [
    light
      ? '你是 dsh-info-check 的审计子 agent，现在执行轻量复核。只做关键一致性检查，不做逐项深度审查。'
      : '你是 dsh-info-check 的独立审计子 agent。',
    '请只核对下面这份最终卡片内容是否如实反映执行记录，不要执行新任务，不要修改任何文件。',
    `卡片类型：${kind === 'delivery' ? '交付确认' : '预算结算'}`,
    ...(light ? ['轻量模式：监理子 agent 已负责阶段质量，请只检查完成项/关键数字是否与记录明显矛盾。'] : []),
    '',
    '【待审计的卡片内容】',
    JSON.stringify(payload, null, 2),
    '',
    '【当前任务的合同记录】',
    JSON.stringify({
      taskBook: contract?.taskBook,
      milestones: contract?.initial?.milestones,
      initial: contract?.initial?.amount,
      extra: contract?.extra,
      forecast: contract?.initial?.forecast,
      acceptances: contract?.acceptances,
      budgetReviews: contract?.budgetReviews,
      situations: contract?.situations,
      delivery: contract?.delivery,
      settlement: contract?.settlement,
    }, null, 2).slice(0, 18000),
    '',
    '【执行记录：思考 + 工具调用 + 结果】',
    transcript,
    '',
    '判定标准：',
    '1. 交付卡声称完成的内容，是否有对应的文件、命令、测试或工具结果证据；',
    '2. 是否遗漏未完成项、限制、风险或失败；',
    '3. 结算卡的实际使用、预算差额、说明是否与合同和记录一致；',
    '4. 不确定时标记为问题，不要替 agent 补写不存在的事实。',
    ...(light ? ['5. 轻量模式只报告明显矛盾；没有明显矛盾即可通过。'] : []),
    '',
    '只输出 JSON，不要 markdown：',
    '{"faithful":true|false,"summary":"一句话结论","issues":["具体问题，最多 8 条"]}',
  ].join('\n')
}

function parseVerdict(result) {
  if (result?.structured !== null && typeof result?.structured === 'object') return result.structured
  const text = Array.isArray(result?.output)
    ? result.output.map(block => block?.type === 'text' ? block.text : '').join('\n')
    : ''
  const match = /\{[\s\S]*\}/.exec(text)
  if (match === null) return undefined
  try {
    return JSON.parse(match[0])
  } catch {
    return undefined
  }
}

export async function auditBeforeCard({ ctx, agent, kind, payload, contract, signal, light = false }) {
  const transcript = (() => {
    try {
      return executionTranscript(agent?.session, light ? 12000 : 36000)
    } catch {
      return '(执行记录读取失败)'
    }
  })()
  const prompt = promptFor(kind, payload, contract, transcript, light)
  let activation
  try {
    const subagents = ctx.get?.('subagents')
    if (subagents === undefined) {
      return { status: 'unavailable', faithful: null, summary: '审计子 agent 服务不可用。', issues: [] }
    }
    activation = await subagents.startActivation({
      provider: 'spawn',
      label: kind === 'delivery' ? 'audit-delivery' : 'audit-settlement',
      name: `auditor-${Date.now().toString(36)}`,
      prompt: [{ type: 'text', text: prompt }],
      parent: agent,
      signal,
      delivery: 'parent',
      outputSchema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          faithful: { type: 'boolean' },
          summary: { type: 'string' },
          issues: { type: 'array', items: { type: 'string' } },
        },
        required: ['faithful', 'summary', 'issues'],
      },
    })
    const result = await activation.result
    const parsed = parseVerdict(result)
    if (parsed === undefined || typeof parsed.faithful !== 'boolean') {
      return { status: 'unparsed', faithful: null, summary: '审计子 agent 未返回可解析结论。', issues: [] }
    }
    return {
      status: 'audited',
      light,
      faithful: parsed.faithful === true,
      summary: typeof parsed.summary === 'string' ? parsed.summary.slice(0, 500) : '',
      issues: Array.isArray(parsed.issues) ? parsed.issues.filter(item => typeof item === 'string').slice(0, 8) : [],
    }
  } catch (error) {
    return {
      status: 'failed',
      faithful: null,
      summary: `审计子 agent 未能完成：${String(error?.message ?? error).slice(0, 240)}`,
      issues: [],
    }
  } finally {
    if (activation !== undefined) await activation.dispose?.().catch(() => {})
  }
}

export function auditNote(audit) {
  if (audit === undefined) return ''
  const verdict = audit.faithful === true ? '通过' : audit.faithful === false ? '发现问题' : '未能完成'
  const issues = Array.isArray(audit.issues) && audit.issues.length > 0
    ? `\n${audit.issues.map((item, index) => `${index + 1}. ${item}`).join('\n')}`
    : ''
  return `\n\n【审计 agent${audit.light === true ? '（轻量）' : ''}】\n结论：${verdict}\n${audit.summary ?? ''}${issues}`
}
