# 预算预测规则

这个插件不把“预算”当成一个凭感觉填的数字。任务书确认后，乙方先调用
`forecast_budget`，按当前模型的 token 单价和任务书规模生成预测，再把预测
对象原样传给 `confirm_budget`。预算方案卡会显示预测依据。

## 1. 人民币与 token 的换算

单价来自 `dsh-ui-usage-billing` 的 `/api/billing/pricing`：

- 读取当前模型的 `price.input`、`price.cacheHit`、`price.output`；
- 价格本身是人民币/百万 token（CNY/MTok）；
- 模型处于 `peakHours` 时使用标准价，否则使用 `offPeak` 价；
- 无法读取时退回 DeepSeek Flash 的内置价（输入 2、缓存 0.04、输出 8 CNY/MTok）。

计算公式：

```text
CNY =
  (非缓存输入 token × 输入单价
   + 缓存命中 token × 缓存单价
   + 输出 token × 输出单价) / 1,000,000
```

## 2. 任务书转化为 token 预测

以里程碑为单位，每个里程碑：

```text
输入 token =
  (250,000
   + 文件数 × 20,000
   + 测试数 × 12,000)
  × 复杂度系数
  × 质量系数
  × 修订系数 1.18

输出 token =
  (20,000
   + 文件数 × 3,000
   + 测试数 × 1,500)
  × 复杂度系数
  × 质量系数
  × 修订系数 1.18
```

系数：

| 维度 | 取值 |
|---|---|
| 复杂度 low / medium / high | 0.65 / 1 / 1.6 |
| 质量 pass / good / perfect | 0.8 / 1 / 1.25 |
| 缓存命中假设 | 35% |
| 执行修订/上下文系数 | 1.18 |
| 备用金 | 基础成本 × 15% |
| 置信区间 | ±35% |

预测结果包含总 input/output token、基础成本、备用金、总预算、每个里程碑
的 token/成本拆分、模型单价来源和假设。总预算可以手动改，但默认值来自
预测，不是另拍一个数。

## 3. 为什么是这个规则

- **ACEM（Agentic Cost Estimation Model）**把成本拆成 LLM、HITL 和基础设施，
  并用 Revision Factor 表示输出被拒绝/重试带来的 token 开销，用 Context Factor
  表示上下文增长带来的成本。本规则用 1.18 的修订/上下文系数近似后两项。
- **TokenCast**把执行过程拆成 segment cost，并指出 token 成本会随执行阶段变化。
  本规则按里程碑分段，而不是把整个任务当成一个黑盒。
- **“How Do AI Agents Spend Your Money?”** 的研究发现，执行前预测与真实消耗
  相关，但通常会低估输入 token；因此这里加入输入侧文件/测试增量、缓存折扣
  和 ±35% 不确定性，而不是给出一个“精确报价”。
- **Context Inflation** 的工作说明真实仓库中的上下文会显著放大输入成本，因此
  文件数和测试数被显式计入输入估算。

## 4. 使用边界

预测不是账单。实际费用仍以 `dsh-ui-usage-billing` 的实时计量为准；里程碑预算
红线用于提前提醒，不替代甲方的预算批准。置信区间用于说明不确定性，不应被
隐藏成“保证不超支”。

## 参考

- ACEM: A Cost Estimation Model for Agentic Software Engineering
  <https://arxiv.org/abs/2608.02582>
- TokenCast: Forecasting Token Consumption During LLM Agent Execution
  <https://arxiv.org/abs/2609.35760>
- How Do AI Agents Spend Your Money? Analyzing and Predicting Token Cost in
  Agentic Coding Tasks
  <https://arxiv.org/abs/2604.22750>
- Context Inflation: The Hidden Cost of AI Coding Agents in Real-World Repositories
  <https://dl.acm.org/doi/full/10.1145/3794786.3830732>
