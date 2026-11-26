/**
 * Independent supervisor run before every milestone acceptance.
 *
 * The supervisor is a fresh child agent. It reads the contract, the draft
 * acceptance, and the bounded execution transcript, then returns pass/rework.
 * A failed or unavailable supervisor is fail-closed: no acceptance card may be
 * shown until the supervisor has actually passed the milestone.
 */
import { executionTranscript } from './audit.js'

function promptFor(contract, acceptance, transcript) {
  return [
    '你是 dsh-info-check 的独立监理子 agent，是甲方委托的第三方质量保证。',
    '原则：公正、独立、自主。以甲乙双方已确认的合同为唯一依据，严格维护甲方，但也不提出合同之外的额外要求，不过分苛求乙方。',
    '你只审查当前这一个里程碑，不替主 agent 执行、修改文件或重写合同。',
    '',
    '【合同】',
    JSON.stringify({
      taskBook: contract?.taskBook,
      milestones: contract?.initial?.milestones,
      initial: contract?.initial?.amount,
      forecast: contract?.initial?.forecast,
      acceptances: contract?.acceptances,
      budgetReviews: contract?.budgetReviews,
      situations: contract?.situations,
      delivery: contract?.delivery,
    }, null, 2).slice(0, 20000),
    '',
    '【待验收里程碑】',
    JSON.stringify(acceptance, null, 2).slice(0, 12000),
    '',
    '【执行记录：思考 + 工具调用 + 结果】',
    transcript,
    '',
    '审查标准（只按合同，不按个人偏好）：',
    '1. 完成内容是否覆盖当前里程碑的合同要求，是否在已确认范围内；',
    '2. 证据是否真实、可复核，是否对应声明的完成内容；',
    '3. 是否遗漏未完成项、限制、风险或失败；',
    '4. 边界声明是否如实：若实际改变了地区、范围、数据、验收口径或预算，必须已有 boundary 情况对接通过；',
    '5. 不以“还可以更多”为理由拒绝；只有合同要求未被满足、证据不足或陈述不实才要求返工；',
    '6. 不确定时列入 findings，不替乙方补写事实。',
    '',
    '只输出 JSON，不要 markdown：',
    '{"decision":"pass"|"rework","summary":"一句话监理结论","findings":["具体问题，最多 8 条"],"requiredChanges":["返工必须完成的事项，最多 8 条"]}',
    '只有决定 rework 时才允许 requiredChanges；通过时为空数组。',
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

export async function superviseAcceptance({ ctx, agent, acceptance, contract, signal }) {
  const transcript = (() => {
    try {
      return executionTranscript(agent?.session)
    } catch {
      return '(执行记录读取失败)'
    }
  })()
  let activation
  try {
    const subagents = ctx.get?.('subagents')
    if (subagents === undefined) {
      return { status: 'unavailable', decision: null, summary: '监理子 agent 服务不可用。', findings: [], requiredChanges: [] }
    }
    activation = await subagents.startActivation({
      provider: 'spawn',
      label: 'supervise-acceptance',
      name: `supervisor-${Date.now().toString(36)}`,
      prompt: [{ type: 'text', text: promptFor(contract, acceptance, transcript) }],
      parent: agent,
      signal,
      delivery: 'parent',
      outputSchema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          decision: { type: 'string' },
          summary: { type: 'string' },
          findings: { type: 'array', items: { type: 'string' } },
          requiredChanges: { type: 'array', items: { type: 'string' } },
        },
        required: ['decision', 'summary', 'findings', 'requiredChanges'],
      },
    })
    const parsed = parseVerdict(await activation.result)
    if (parsed === undefined || (parsed.decision !== 'pass' && parsed.decision !== 'rework')) {
      return { status: 'unparsed', decision: null, summary: '监理子 agent 未返回可解析结论。', findings: [], requiredChanges: [] }
    }
    return {
      status: 'reviewed',
      decision: parsed.decision,
      summary: typeof parsed.summary === 'string' ? parsed.summary.slice(0, 600) : '',
      findings: Array.isArray(parsed.findings) ? parsed.findings.filter(item => typeof item === 'string').slice(0, 8) : [],
      requiredChanges: Array.isArray(parsed.requiredChanges)
        ? parsed.requiredChanges.filter(item => typeof item === 'string').slice(0, 8)
        : [],
    }
  } catch (error) {
    return {
      status: 'failed',
      decision: null,
      summary: `监理子 agent 未能完成：${String(error?.message ?? error).slice(0, 300)}`,
      findings: [],
      requiredChanges: [],
    }
  } finally {
    if (activation !== undefined) await activation.dispose?.().catch(() => {})
  }
}

export function supervisorNote(review) {
  if (review === undefined) return ''
  const verdict = review.decision === 'pass' ? '通过' : review.decision === 'rework' ? '要求返工' : '未能完成'
  const findings = Array.isArray(review.findings) && review.findings.length > 0
    ? `\n${review.findings.map((item, index) => `${index + 1}. ${item}`).join('\n')}`
    : ''
  return `\n\n【监理子 Agent】\n结论：${verdict}\n${review.summary ?? ''}${findings}`
}
