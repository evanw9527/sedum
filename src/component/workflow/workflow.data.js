export const INITIAL_NODES = [
  { id: 'trigger', kind: 'trigger', title: '用户提问', description: '接收用户输入', x: 52, y: 278 },
  { id: 'condition', kind: 'classifier', title: '问题分类器', description: '按照意图识别问题', x: 354, y: 278 },
  { id: 'request', kind: 'llm', title: '知识问答', description: 'gpt-5 · CHAT', x: 680, y: 132 },
  { id: 'finish', kind: 'output', title: '直接回复', description: '输出最终结果', x: 680, y: 414 },
]

export const INITIAL_EDGES = [
  { id: 'edge-start', from: 'trigger', to: 'condition', label: '继续', ruleType: 'always', field: '', operator: 'equals', value: '' },
  { id: 'edge-match', from: 'condition', to: 'request', label: '满足', ruleType: 'condition', field: '', operator: 'equals', value: '' },
  { id: 'edge-fallback', from: 'condition', to: 'finish', label: '否则', ruleType: 'fallback', field: '', operator: 'equals', value: '' },
]

export const NODE_LIBRARY = [
  { kind: 'llm', title: 'LLM', description: '调用语言模型', category: 'AI 能力' },
  { kind: 'knowledge', title: '知识检索', description: '从知识库召回内容', category: 'AI 能力' },
  { kind: 'output', title: '输出', description: '返回流程处理结果', category: 'AI 能力' },
  { kind: 'agent', title: 'Agent', description: '自主规划并执行任务', category: 'AI 能力' },
  { kind: 'classifier', title: '问题分类器', description: '识别输入问题意图', category: '问题理解' },
  { kind: 'condition', title: '条件分支', description: '按条件进入不同分支', category: '逻辑' },
  { kind: 'human', title: '人工介入', description: '将任务转交人工处理', category: '逻辑' },
  { kind: 'delay', title: '等待', description: '延迟后继续执行', category: '流程控制' },
]

export const KIND_LABELS = {
  trigger: '触发器',
  condition: '逻辑',
  action: '动作',
  delay: '控制',
  finish: '结束',
  llm: 'LLM',
  knowledge: '知识检索',
  output: '输出',
  agent: 'Agent',
  classifier: '问题理解',
  human: '人工介入',
}
