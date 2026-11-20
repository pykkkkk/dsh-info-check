import { SKIP_LABEL } from './pure.js'
import {
  APPROVE_BUDGET_LABEL, ADJUST_BUDGET_LABEL, BUDGET_PROPOSAL_ID, BUDGET_REVIEW_ID,
  BUDGET_SETTLEMENT_ID, DENY_BUDGET_LABEL, DISSATISFIED_BUDGET_LABEL, NEUTRAL_BUDGET_LABEL,
  PAUSE_BUDGET_LABEL, SATISFIED_BUDGET_LABEL, SIGN_BUDGET_LABEL,
  budgetProposalDetail, budgetProposalLedger, budgetReviewDetail, budgetReviewLedger,
  budgetSettlementDetail, budgetSettlementLedger, validateBudgetProposal, validateBudgetReview,
  validateBudgetSettlement,
} from './budget.js'

function isCancelled(error) {
  return error !== null && typeof error === 'object' && error.code === 'ASK_CANCELLED'
}

export function createBudgetProposalTool({ ctx, enabledFor, getTimeoutSeconds, ledger, budgetStore }) {
  return {
    name: 'confirm_budget',
    description: '任务书和里程碑确认后，作为乙方向甲方提交初始预算报价。'
      + '金额使用整数“预算点”；必须列出预算分解，并说明假设、超支风险和备注。'
      + '甲方可以签约、要求调整或暂停。甲方要求调整时，按 feedback 修改后再次提交。'
      + '签约成功后才允许开始执行和里程碑验收。',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        amount: { type: 'integer', minimum: 0, description: '初始总预算，单位：预算点。' },
        breakdown: {
          type: 'array', minItems: 1, maxItems: 12,
          items: { type: 'string' },
          description: '预算分解；每项说明工作内容与金额，例如“实现：60 预算点”。',
        },
        assumptions: { type: 'string', description: '可选：报价假设和范围边界。' },
        risks: { type: 'string', description: '可选：超支风险与应对。' },
        notes: { type: 'string', description: '可选备注。' },
      },
      required: ['amount', 'breakdown'],
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
      if (agent === undefined) throw new Error('confirm_budget requires a live agent')
      if (!enabledFor(agent.session)) throw new Error('dsh-info-check is disabled for this conversation')
      const proposal = validateBudgetProposal(args)
      const question = {
        id: BUDGET_PROPOSAL_ID,
        header: 'dsh-info-check · 预算签约',
        question: `乙方报价 ${proposal.amount} 预算点，是否签约？`,
        detail: budgetProposalDetail(proposal),
        options: [
          { label: SIGN_BUDGET_LABEL, description: '确认报价和范围，进入执行阶段' },
          { label: ADJUST_BUDGET_LABEL, description: '要求乙方修改报价或预算分解' },
          { label: PAUSE_BUDGET_LABEL, description: '暂停任务，不签约' },
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
          await ledger.append(agent.session, budgetProposalLedger(proposal, 'cancelled'), {
            type: 'budget-proposal', decision: 'cancelled', amount: proposal.amount,
          })
          return { decision: 'cancelled', proceed: false }
        }
        throw error
      }
      if (result.pending === true) {
        await ledger.append(agent.session, budgetProposalLedger(proposal, 'timeout'), {
          type: 'budget-proposal', decision: 'timeout', amount: proposal.amount,
        })
        return { decision: 'timeout', proceed: false }
      }
      const answer = result.answers?.[0]
      const selected = Array.isArray(answer?.selected)
        ? answer.selected
        : answer?.selected === undefined || answer?.selected === null ? [] : [answer.selected]
      const feedback = typeof answer?.custom === 'string' && answer.custom.trim() !== ''
        ? answer.custom.trim()
        : undefined
      if (selected.includes(PAUSE_BUDGET_LABEL)) {
        await ledger.append(agent.session, budgetProposalLedger(proposal, 'paused', feedback), {
          type: 'budget-proposal', decision: 'paused', amount: proposal.amount,
        })
        return { decision: 'paused', proceed: false, ...(feedback === undefined ? {} : { feedback }) }
      }
      if (selected.includes(ADJUST_BUDGET_LABEL)) {
        await ledger.append(agent.session, budgetProposalLedger(proposal, 'adjust', feedback), {
          type: 'budget-proposal', decision: 'adjust', amount: proposal.amount,
        })
        return { decision: 'adjust', proceed: false, ...(feedback === undefined ? {} : { feedback }) }
      }
      if (!selected.includes(SIGN_BUDGET_LABEL)) {
        await ledger.append(agent.session, budgetProposalLedger(proposal, 'skipped'), {
          type: 'budget-proposal', decision: 'skipped', amount: proposal.amount,
        })
        return { decision: 'skipped', proceed: false }
      }
      await budgetStore.sign(agent.session, proposal)
      await ledger.append(agent.session, budgetProposalLedger(proposal, 'signed'), {
        type: 'budget-proposal', decision: 'signed', amount: proposal.amount,
      })
      return { decision: 'signed', proceed: true, ...(feedback === undefined ? {} : { notes: feedback }) }
    },
    presentCall(args) {
      try {
        const proposal = validateBudgetProposal(args)
        return {
          card: 'generic',
          title: 'dsh-info-check · 预算签约',
          kind: 'other',
          content: [{ type: 'text', text: budgetProposalDetail(proposal) }],
        }
      } catch {
        return undefined
      }
    },
  }
}

export function createBudgetReviewTool({ ctx, enabledFor, getTimeoutSeconds, ledger, budgetStore }) {
  return {
    name: 'review_budget',
    description: '每个里程碑验收通过后，向甲方提交预算使用卡：累计已用、剩余、本阶段分解和追加请求。'
      + '甲方批准追加、拒绝追加、要求调整或暂停。预算审核完成前不能提交下一里程碑验收。'
      + 'spent 是累计已用预算点；requestedExtra 是本阶段希望追加的预算点。',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        milestone: { type: 'string', description: '刚验收的里程碑 id 或标题。' },
        spent: { type: 'integer', minimum: 0, description: '截至本里程碑的累计已用预算点。' },
        requestedExtra: { type: 'integer', minimum: 0, description: '本阶段请求追加的预算点；没有就填 0。' },
        breakdown: {
          type: 'array', minItems: 1, maxItems: 12,
          items: { type: 'string' },
          description: '可选：本阶段预算使用分解。',
        },
        notes: { type: 'string', description: '可选：超支原因或下一步说明。' },
      },
      required: ['milestone', 'spent'],
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
      if (agent === undefined) throw new Error('review_budget requires a live agent')
      if (!enabledFor(agent.session)) throw new Error('dsh-info-check is disabled for this conversation')
      const review = validateBudgetReview(args)
      const budget = await budgetStore.load(agent.session)
      if (budget === undefined || !budget.state.signed) {
        throw new Error('dsh-info-check: 尚未完成预算签约，不能审核预算。')
      }
      if (budget.state.pendingReview !== review.milestone) {
        throw new Error(`dsh-info-check: 当前待审核的里程碑是「${budget.state.pendingReview ?? '无'}」，不是「${review.milestone}」。`)
      }
      if (review.spent < budget.state.spent) {
        throw new Error('dsh-info-check: spent 是累计值，不能低于上一次已报告的累计花费。')
      }
      const question = {
        id: BUDGET_REVIEW_ID,
        header: 'dsh-info-check · 预算使用',
        question: review.requestedExtra > 0
          ? `里程碑「${review.milestone}」已使用 ${review.spent} 预算点，是否批准追加 ${review.requestedExtra} 预算点？`
          : `里程碑「${review.milestone}」已使用 ${review.spent} 预算点，是否确认预算并继续？`,
        detail: budgetReviewDetail(review, budget.state),
        options: [
          { label: APPROVE_BUDGET_LABEL, description: review.requestedExtra > 0 ? '批准本次追加，继续下一阶段' : '确认预算使用，继续下一阶段' },
          { label: ADJUST_BUDGET_LABEL, description: '要求乙方调整预算说明或追加请求' },
          { label: DENY_BUDGET_LABEL, description: '不批准本次追加，继续下一阶段' },
          { label: PAUSE_BUDGET_LABEL, description: '暂停任务，结束当前工作' },
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
          await ledger.append(agent.session, budgetReviewLedger(review, 'cancelled'), {
            type: 'budget-review', decision: 'cancelled', milestone: review.milestone, spent: review.spent,
          })
          return { decision: 'cancelled', proceed: false }
        }
        throw error
      }
      if (result.pending === true) {
        await budgetStore.review(agent.session, review, 'timeout')
        await ledger.append(agent.session, budgetReviewLedger(review, 'timeout'), {
          type: 'budget-review', decision: 'timeout', milestone: review.milestone, spent: review.spent,
        })
        return { decision: 'timeout', proceed: true }
      }
      const answer = result.answers?.[0]
      const selected = Array.isArray(answer?.selected)
        ? answer.selected
        : answer?.selected === undefined || answer?.selected === null ? [] : [answer.selected]
      const feedback = typeof answer?.custom === 'string' && answer.custom.trim() !== ''
        ? answer.custom.trim()
        : undefined
      if (selected.includes(PAUSE_BUDGET_LABEL)) {
        await budgetStore.review(agent.session, review, 'paused')
        await ledger.append(agent.session, budgetReviewLedger(review, 'paused', feedback), {
          type: 'budget-review', decision: 'paused', milestone: review.milestone, spent: review.spent,
        })
        return { decision: 'paused', proceed: false, ...(feedback === undefined ? {} : { feedback }) }
      }
      if (selected.includes(SKIP_LABEL)) {
        await budgetStore.review(agent.session, review, 'denied')
        await ledger.append(agent.session, budgetReviewLedger(review, 'denied'), {
          type: 'budget-review', decision: 'denied', milestone: review.milestone, spent: review.spent,
        })
        return { decision: 'denied', proceed: true }
      }
      if (selected.includes(ADJUST_BUDGET_LABEL)) {
        await ledger.append(agent.session, budgetReviewLedger(review, 'adjust', feedback), {
          type: 'budget-review', decision: 'adjust', milestone: review.milestone, spent: review.spent,
        })
        return { decision: 'adjust', proceed: false, ...(feedback === undefined ? {} : { feedback }) }
      }
      const decision = selected.includes(DENY_BUDGET_LABEL) ? 'denied' : 'approved'
      await budgetStore.review(agent.session, review, decision)
      await ledger.append(agent.session, budgetReviewLedger(review, decision, feedback), {
        type: 'budget-review',
        decision,
        milestone: review.milestone,
        spent: review.spent,
        requestedExtra: review.requestedExtra,
      })
      return {
        decision,
        proceed: true,
        ...(feedback === undefined ? {} : { notes: feedback }),
      }
    },
    presentCall(args) {
      try {
        const review = validateBudgetReview(args)
        return {
          card: 'generic',
          title: 'dsh-info-check · 预算使用',
          kind: 'other',
          content: [{ type: 'text', text: budgetReviewDetail(review, {
            initial: { amount: 0 }, extra: 0,
          }) }],
        }
      } catch {
        return undefined
      }
    },
  }
}

export function createBudgetSettlementTool({ ctx, enabledFor, getTimeoutSeconds, ledger, budgetStore }) {
  return {
    name: 'settle_budget',
    description: '交付确认后，向甲方提交预算结算卡：初始预算、追加、实际使用、差额和说明。'
      + '甲方评价预算是否合理；评价写入台账和预算标准，用于后续报价。',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        finalSpent: { type: 'integer', minimum: 0, description: '本次任务最终使用的预算点。' },
        summary: { type: 'string', description: '预算使用说明；每点单独一行。' },
        notes: { type: 'string', description: '可选备注。' },
      },
      required: ['finalSpent', 'summary'],
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          decision: { type: 'string' },
          proceed: { type: 'boolean' },
          rating: { type: 'string' },
          feedback: { type: 'string' },
        },
        required: ['decision', 'proceed'],
      },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    async execute(args, exec) {
      const agent = exec.agent
      if (agent === undefined) throw new Error('settle_budget requires a live agent')
      if (!enabledFor(agent.session)) throw new Error('dsh-info-check is disabled for this conversation')
      const settlement = validateBudgetSettlement(args)
      const budget = await budgetStore.load(agent.session)
      if (budget === undefined || !budget.state.signed) {
        throw new Error('dsh-info-check: 没有已签约预算，不能结算。')
      }
      const question = {
        id: BUDGET_SETTLEMENT_ID,
        header: 'dsh-info-check · 预算结算',
        question: '本次预算使用是否合理？',
        detail: budgetSettlementDetail(settlement, budget.state),
        options: [
          { label: SATISFIED_BUDGET_LABEL, description: '预算控制合理，报价与使用匹配' },
          { label: NEUTRAL_BUDGET_LABEL, description: '基本合理，但有改进空间' },
          { label: DISSATISFIED_BUDGET_LABEL, description: '预算偏高、超支或说明不充分' },
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
          return { decision: 'cancelled', proceed: false }
        }
        throw error
      }
      const answer = result.pending === true ? undefined : result.answers?.[0]
      const selected = Array.isArray(answer?.selected)
        ? answer.selected
        : answer?.selected === undefined || answer?.selected === null ? [] : [answer.selected]
      const ratingLabel = result.pending === true || selected.includes(SKIP_LABEL)
        ? NEUTRAL_BUDGET_LABEL
        : selected.includes(DISSATISFIED_BUDGET_LABEL)
          ? DISSATISFIED_BUDGET_LABEL
          : selected.includes(NEUTRAL_BUDGET_LABEL) ? NEUTRAL_BUDGET_LABEL : SATISFIED_BUDGET_LABEL
      const rating = ratingLabel === SATISFIED_BUDGET_LABEL ? 3 : ratingLabel === NEUTRAL_BUDGET_LABEL ? 2 : 1
      const feedback = typeof answer?.custom === 'string' && answer.custom.trim() !== ''
        ? answer.custom.trim()
        : undefined
      await budgetStore.settle(agent.session, settlement, rating)
      await ledger.append(agent.session, budgetSettlementLedger(settlement, ratingLabel), {
        type: 'budget-settlement',
        decision: 'settled',
        rating,
        finalSpent: settlement.finalSpent,
      })
      return { decision: 'settled', proceed: true, rating: ratingLabel }
    },
    presentCall(args) {
      try {
        const settlement = validateBudgetSettlement(args)
        return {
          card: 'generic',
          title: 'dsh-info-check · 预算结算',
          kind: 'other',
          content: [{ type: 'text', text: settlement.summary }],
        }
      } catch {
        return undefined
      }
    },
  }
}

