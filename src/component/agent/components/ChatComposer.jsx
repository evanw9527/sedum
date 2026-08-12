import Icon from '../../../shared/ui/Icon.jsx'

function compactTokens(value) {
  const tokens = Math.max(0, Number(value) || 0)
  if (tokens < 1000) return `${Math.round(tokens)}`
  if (tokens < 1000000) {
    const precision = tokens >= 100000 ? 1 : 2
    return `${(tokens / 1000).toFixed(precision).replace(/\.0+$|(?<=\.[0-9])0$/, '')}K`
  }
  return `${(tokens / 1000000).toFixed(2).replace(/\.0+$|(?<=\.[0-9])0$/, '')}M`
}

function ContextUsageMeter({ stats }) {
  const usedTokens = Number(stats?.estimated_tokens)
  const tokenBudget = Number(stats?.token_budget)
  const hasData = Number.isFinite(usedTokens) && usedTokens >= 0 && Number.isFinite(tokenBudget) && tokenBudget > 0
  const percentage = hasData ? (usedTokens / tokenBudget) * 100 : 0
  const progress = Math.min(100, Math.max(0, percentage))
  const label = hasData
    ? `最近一次请求，上下文已使用 ${percentage.toFixed(2)}%（${usedTokens.toLocaleString('zh-CN')} / ${tokenBudget.toLocaleString('zh-CN')} tokens）`
    : '当前会话尚无上下文统计'

  return (
    <div
      className={`context-usage-meter ${hasData ? 'has-data' : 'is-empty'} ${percentage >= 90 ? 'is-high' : ''}`}
      tabIndex="0"
      aria-label={label}
    >
      <span className="context-usage-ring" style={{ '--context-progress': `${progress * 3.6}deg` }} aria-hidden="true" />
      <span className="context-usage-value">{hasData ? `${compactTokens(usedTokens)} / ${compactTokens(tokenBudget)}` : '上下文 --'}</span>
      <span className="context-usage-tooltip" role="tooltip">{label}</span>
    </div>
  )
}

function ChatComposer({
  value,
  busy,
  models,
  skills,
  selectedModelId,
  selectedSkillId,
  contextStats,
  knowledgeEnabled,
  canSend,
  onChange,
  onModelChange,
  onSkillChange,
  onKnowledgeChange,
  onSend,
  onStop,
}) {
  const submit = () => {
    if (!busy && canSend && value.trim()) onSend()
  }

  return (
    <div className="composer-shell">
      <textarea
        value={value}
        rows="3"
        aria-label="给 Agent 发送消息"
        placeholder="描述你希望 Agent 完成的任务…"
        disabled={busy}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            submit()
          }
        }}
      />
      <div className="composer-actions">
        <div className="composer-capabilities">
          <label className="composer-select-label">
            <Icon name="agent" size={15} />
            <span className="sr-only">选择模型</span>
            <select value={selectedModelId} disabled={busy || !models.length} onChange={(event) => onModelChange(event.target.value)}>
              {!models.length && <option value="">无可用模型</option>}
              {models.map((model) => (
                <option value={model.id} key={model.id}>{model.name}{model.available ? '' : ' · 未配置'}</option>
              ))}
            </select>
          </label>
          <label className={`composer-knowledge-toggle ${knowledgeEnabled ? 'is-active' : ''}`}>
            <input
              type="checkbox"
              checked={knowledgeEnabled}
              disabled={busy}
              onChange={(event) => onKnowledgeChange(event.target.checked)}
            />
            <Icon name="knowledge" size={15} weight={knowledgeEnabled ? 'fill' : 'regular'} />
            <span>知识库</span>
          </label>
          <label className="composer-select-label">
            <Icon name="tool" size={15} />
            <span className="sr-only">选择 Skill</span>
            <select value={selectedSkillId} disabled={busy} onChange={(event) => onSkillChange(event.target.value)}>
              <option value="auto">Skill · 自动选择</option>
              {skills.map((skill) => <option value={skill.id} key={skill.id}>Skill · {skill.name}</option>)}
            </select>
          </label>
        </div>
        <div className="composer-right-actions">
          <ContextUsageMeter stats={contextStats} />
          <button
            className={`send-button ${busy ? 'is-stop' : ''}`}
            type="button"
            aria-label={busy ? '停止生成' : '发送消息'}
            disabled={!busy && (!canSend || !value.trim())}
            onClick={busy ? onStop : submit}
          >
            <Icon name={busy ? 'close' : 'send'} size={18} weight={busy ? 'bold' : 'fill'} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChatComposer
