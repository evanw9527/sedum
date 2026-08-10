import Icon from '../../../shared/ui/Icon.jsx'

function formatTokens(value) {
  const count = Number(value) || 0
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(count >= 10_000_000 ? 0 : 1)}M`
  if (count >= 1_000) return `${(count / 1_000).toFixed(count >= 100_000 ? 0 : 1)}K`
  return count.toLocaleString('zh-CN')
}

function UsageSummaryCard({ usage }) {
  const days = usage?.period_days || 30
  return (
    <section className="usage-summary" aria-label={`近 ${days} 天 Token 用量`}>
      <div className="usage-summary-heading"><strong>Token 用量</strong><span>近 {days} 天</span></div>
      <div className="usage-summary-total" title={`${usage?.total_tokens || 0} tokens`}>
        {formatTokens(usage?.total_tokens)}<small>tokens</small>
      </div>
      <div className="usage-summary-breakdown">
        <span title={`输入 ${usage?.input_tokens || 0} tokens`}>输入 {formatTokens(usage?.input_tokens)}</span>
        <span title={`输出 ${usage?.output_tokens || 0} tokens`}>输出 {formatTokens(usage?.output_tokens)}</span>
        <span title={`${usage?.requests || 0} 次调用`}>{usage?.requests || 0} 次</span>
      </div>
    </section>
  )
}

function ChatSidebar({ sessions, usage, activeSessionId, connection, loading, disabled, onNewChat, onSelectSession }) {
  return (
    <aside className="side-panel chat-sidebar">
      <div className="side-panel-heading chat-sidebar-heading"><strong>会话</strong></div>
      <button className="side-panel-primary new-chat-button" type="button" disabled={disabled} onClick={onNewChat}>
        <Icon name="plus" size={17} weight="bold" /><span>新建对话</span>
      </button>
      <UsageSummaryCard usage={usage} />
      <div className="side-panel-section-label session-heading"><span>最近对话</span><Icon name="history" size={15} /></div>
      <nav className="side-panel-list session-list" aria-label="会话列表">
        {!sessions.length && <p className="empty-sessions">还没有历史会话</p>}
        {sessions.map((session) => (
          <button
            className={`side-panel-item session-item ${activeSessionId === session.id ? 'is-active' : ''}`}
            key={session.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelectSession(session.id)}
          >
            <Icon name="chats" size={17} />
            <span>{session.title}</span>
            {activeSessionId === session.id && <Icon name={loading ? 'loading' : 'more'} size={17} />}
          </button>
        ))}
      </nav>
      <div className={`backend-status is-${connection.status}`}>
        <i />
        <span>{connection.message}</span>
      </div>
    </aside>
  )
}

export default ChatSidebar
