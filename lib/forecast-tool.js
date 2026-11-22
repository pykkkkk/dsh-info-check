import { forecastBudget } from './forecast.js'

export function createForecastBudgetTool({ enabledFor, getOrigin }) {
  return {
    name: 'forecast_budget',
    description: '任务书确认后，作为乙方按当前模型的人民币 token 单价预测预算。'
      + '输入每个里程碑的复杂度、文件数、测试数；输出 input/output token、CNY 单价、预算预测、置信区间和备用金。'
      + '先调用本工具，再把返回的 forecast 原样传给 confirm_budget；不要凭感觉报价。',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        model: { type: 'string', description: '模型 id，例如 flash。默认 flash。' },
        quality: { type: 'string', enum: ['pass', 'good', 'perfect'], description: '任务书质量要求。' },
        milestones: {
          type: 'array', minItems: 1, maxItems: 30,
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              complexity: { type: 'string', enum: ['low', 'medium', 'high'] },
              files: { type: 'integer', minimum: 0, description: '预计新增/修改文件数。' },
              tests: { type: 'integer', minimum: 0, description: '预计测试/验证项数。' },
            },
            required: ['id', 'title', 'complexity'],
          },
        },
      },
      required: ['milestones'],
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: true,
        properties: { forecast: { type: 'object' } },
        required: ['forecast'],
      },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    async execute(args, exec) {
      const agent = exec.agent
      if (agent === undefined) throw new Error('forecast_budget requires a live agent')
      if (!enabledFor(agent.session)) throw new Error('dsh-info-check is disabled for this conversation')
      const forecast = await forecastBudget({
        model: typeof args.model === 'string' && args.model !== '' ? args.model : 'flash',
        quality: args.quality === 'perfect' || args.quality === 'pass' ? args.quality : 'good',
        milestones: Array.isArray(args.milestones) ? args.milestones : [],
        baseUrl: getOrigin?.(),
      })
      return { forecast: JSON.parse(JSON.stringify(forecast)) }
    },
    presentCall() {
      return { card: 'generic', title: 'dsh-info-check · 预算预测', kind: 'other' }
    },
  }
}
