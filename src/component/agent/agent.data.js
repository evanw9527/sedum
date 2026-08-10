export const STARTER_PROMPTS = [
  '分析一段需求并给出执行计划',
  '整理资料并生成结构化摘要',
  '调用工具完成一个多步骤任务',
]

export const INITIAL_MESSAGES = [
  {
    id: 'welcome',
    role: 'assistant',
    content: '你好，我是 Sedum Agent。你可以直接描述目标，我会规划步骤、调用可用工具，并在对话中展示执行过程。',
  },
]
