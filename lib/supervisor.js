/**
 * Independent supervisor run before every milestone acceptance.
 *
 * One supervisor child is kept per conversation so each review sees the
 * contract and its own previous reviews instead of starting cold. The child is
 * a continuable local subagent; the activation is retained rather than
 * disposed after the first verdict.
 */
import { executionTranscript } from './audit.js'

const supervisors = new Map()

function parentKey(agent) {
  return String(agent?.session?.id ?? agent?.id ?? 'session')
}

function promptFor({ initial, contract, acceptance, transcript }) {
  return [
    initial
      ? '你是 dsh-info-check 的独立监理子 agent，是甲方委托的第三方质量保证。'
      : '继续以同一个独立监理子 agent 的身份工作。你之前已经审查过这份合同的前序里程碑，保留并使用那些上下文。',
    '原则：公正、独立、自主。以甲乙双方已确认的合同为唯一依据，严格维护甲方，但也不提出合同之外的额外要求，不过分苛求乙方。',
    '你只审查当前这一个里程碑，不替主 agent 执行、修改文件或重写合同。',
    '',
    initial ? '【合同】' : '【合同（当前）】',
    JSON.stringify({
      taskBook: contract?.taskBook,
      milestones: contract?.initial?.milestones,
      initial: contract?.initial?.amount,
      forecast: contract?.initial?.forecast,
      acceptances: contract?.acceptances,
      budgetReviews: contract?.budgetReviews,
      situations: contract?.situations,
      supervisions: contract?.supervisions,
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
    '{"signal":"accept"|"minor"|"major","summary":"一句话监理结论","findings":["具体问题，最多 8 条"],"requiredChanges":["返工或小修必须完成的事项，最多 8 条"]}',
    'accept：可以直接进入验收；minor：只需小修，主 agent 修完不必再回传监理；major：必须返工并重新提交监理。',
    '只有 minor/major 时才填写 requiredChanges；accept 时为空数组。',
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

function normalizeVerdict(parsed) {
  const raw = parsed?.signal
    ?? (parsed?.decision === 'pass' ? 'accept' : parsed?.decision === 'minor' ? 'minor' : parsed?.decision === 'rework' ? 'major' : undefined)
  if (raw !== 'accept' && raw !== 'minor' && raw !== 'major') {
    return { status: 'unparsed', signal: null, decision: null, summary: '监理子 agent 未返回可解析结论。', findings: [], requiredChanges: [] }
  }
  return {
    status: 'reviewed',
    signal: raw,
    decision: raw === 'accept' ? 'pass' : raw === 'minor' ? 'minor' : 'rework',
    summary: typeof parsed.summary === 'string' ? parsed.summary.slice(0, 600) : '',
    findings: Array.isArray(parsed.findings) ? parsed.findings.filter(item => typeof item === 'string').slice(0, 8) : [],
    requiredChanges: Array.isArray(parsed.requiredChanges)
      ? parsed.requiredChanges.filter(item => typeof item === 'string').slice(0, 8)
      : [],
  }
}

function wait(ms, signal) {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms)
    if (signal === undefined) return
    const stop = () => { clearTimeout(timer); resolve() }
    if (signal.aborted) stop()
    else signal.addEventListener('abort', stop, { once: true })
  })
}

function withTimeout(promise, timeoutSeconds, message) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), Math.max(30, Number(timeoutSeconds) || 180) * 1000)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

async function waitForReply(child, fromSeq, signal, timeoutSeconds) {
  const deadline = Date.now() + Math.max(30, Number(timeoutSeconds) || 180) * 1000
  while (Date.now() < deadline) {
    if (signal?.aborted) return undefined
    const events = child.session.snapshotEvents().slice(fromSeq)
    const ended = events.some(event => event.type === 'turn/end')
    const assistant = [...events].reverse().find(event => event.type === 'assistant/message')
    if (ended && assistant !== undefined) return parseVerdict({
      output: assistant.data?.message?.content ?? [],
    })
    await wait(250, signal)
  }
  return undefined
}

async function waitForLiveChild(ctx, childId, signal, timeoutSeconds) {
  const deadline = Date.now() + Math.max(30, Number(timeoutSeconds) || 180) * 1000
  while (Date.now() < deadline) {
    if (signal?.aborted) return undefined
    const child = ctx.agents?.get?.(childId)
    if (child !== undefined) return child
    await wait(250, signal)
  }
  return undefined
}

export async function superviseAcceptance({ ctx, agent, acceptance, contract, signal, timeoutSeconds = 180, storedChildId, onChildId }) {
  const transcript = (() => {
    try {
      return executionTranscript(agent?.session)
    } catch {
      return '(执行记录读取失败)'
    }
  })()
  const subagents = ctx.get?.('subagents')
  if (subagents === undefined) {
    return { status: 'unavailable', decision: null, summary: '监理子 agent 服务不可用。', findings: [], requiredChanges: [] }
  }

  const key = parentKey(agent)
  const existing = supervisors.get(key) ?? (storedChildId ? { childId: storedChildId } : undefined)
  try {
    if (existing !== undefined) {
      let child = ctx.agents?.get?.(existing.childId)
      const prompt = promptFor({ initial: false, contract, acceptance, transcript })
      if (child === undefined) {
        await subagents.sendMessage(
          agent,
          existing.childId,
          [{ type: 'text', text: prompt }],
          { signal },
        )
        child = await waitForLiveChild(ctx, existing.childId, signal, timeoutSeconds)
        if (child === undefined) {
          supervisors.delete(key)
          return {
            status: 'failed',
            decision: null,
            summary: '同一监理子 agent 无法恢复，未新建以避免上下文丢失。',
            findings: [],
            requiredChanges: [],
          }
        }
        const fromSeq = child.session.snapshotEvents().length
        return normalizeVerdict(await waitForReply(child, fromSeq, signal, timeoutSeconds))
      }
      const fromSeq = child.session.snapshotEvents().length
      await subagents.sendMessage(
        agent,
        existing.childId,
        [{ type: 'text', text: prompt }],
        { signal },
      )
      return normalizeVerdict(await waitForReply(child, fromSeq, signal, timeoutSeconds))
    }

    let activation
    try {
      activation = await subagents.startActivation({
        provider: 'spawn',
        label: 'supervisor',
        name: `supervisor-${Date.now().toString(36)}`,
        prompt: [{ type: 'text', text: promptFor({ initial: true, contract, acceptance, transcript }) }],
        parent: agent,
        signal,
        delivery: 'parent',
        outputSchema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            signal: { type: 'string' },
            summary: { type: 'string' },
            findings: { type: 'array', items: { type: 'string' } },
            requiredChanges: { type: 'array', items: { type: 'string' } },
          },
          required: ['signal', 'summary', 'findings', 'requiredChanges'],
        },
      })
      const parsed = parseVerdict(await withTimeout(
        activation.result,
        timeoutSeconds,
        `监理超过 ${timeoutSeconds} 秒未返回`,
      ))
      supervisors.set(key, { childId: activation.childId, activation })
      await onChildId?.(activation.childId)
      return normalizeVerdict(parsed)
    } catch (error) {
      await activation?.dispose?.().catch(() => {})
      return {
        status: 'failed',
        decision: null,
        summary: `监理子 agent 未能完成：${String(error?.message ?? error).slice(0, 300)}`,
        findings: [],
        requiredChanges: [],
      }
    }
  } catch (error) {
    return {
      status: 'failed',
      decision: null,
      summary: `监理子 agent 未能完成：${String(error?.message ?? error).slice(0, 300)}`,
      findings: [],
      requiredChanges: [],
    }
  }
}

export function supervisorNote(review) {
  if (review === undefined) return ''
  const verdict = review.signal === 'accept' || review.decision === 'pass'
    ? '接受'
    : review.signal === 'minor' || review.decision === 'minor'
      ? '小修'
      : review.signal === 'major' || review.decision === 'rework' ? '重大返工' : '未能完成'
  const findings = Array.isArray(review.findings) && review.findings.length > 0
    ? `\n${review.findings.map((item, index) => `${index + 1}. ${item}`).join('\n')}`
    : ''
  const changes = Array.isArray(review.requiredChanges) && review.requiredChanges.length > 0
    ? `\n需要处理：\n${review.requiredChanges.map((item, index) => `${index + 1}. ${item}`).join('\n')}`
    : ''
  return `\n\n【监理子 Agent】\n结论：${verdict}\n${review.summary ?? ''}${findings}${changes}`
}
