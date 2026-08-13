import { useEffect, useState } from 'react'
import Icon from '../../../shared/ui/Icon.jsx'
import MessageContent from './MessageContent.jsx'

function formatDuration(milliseconds) {
  const value = Math.max(0, Number(milliseconds) || 0)
  if (value < 1000) return `${Math.max(0.1, value / 1000).toFixed(1)}s`
  if (value < 10_000) return `${(value / 1000).toFixed(1)}s`
  return `${Math.round(value / 1000)}s`
}

function ThinkingIndicator({ label = '正在连接 Agent' }) {
  return <div className="thinking-indicator"><span /><span /><span />{label}</div>
}

function stepIcon(step) {
  if (step.type === 'thinking') return 'llm'
  if (step.type === 'skill') return 'classifier'
  return 'tool'
}

function ProcessStep({ step, now, isLast }) {
  const [expanded, setExpanded] = useState(false)
  const duration = step.durationMs ?? ((step.completedAt || now) - step.startedAt)
  const hasMeta = step.meta && Object.keys(step.meta).length > 0

  return (
    <li className={`process-step is-${step.status} ${step.cacheStatus ? `has-cache-${step.cacheStatus}` : ''} ${isLast ? 'is-last' : ''}`}>
      <span className="process-step-node">
        <Icon name={stepIcon(step)} size={16} weight={step.type === 'thinking' ? 'regular' : 'bold'} />
      </span>
      <div className="process-step-content">
        <div className="process-step-main">
          <strong>{step.label}</strong>
          <span>{step.detail}{step.cacheLabel && <em className="process-cache-badge">{step.cacheLabel}</em>}</span>
          <time>耗时 {formatDuration(duration)}</time>
          {hasMeta && (
            <button
              className={`process-step-toggle ${expanded ? 'is-expanded' : ''}`}
              type="button"
              aria-label={expanded ? `收起 ${step.label} 详情` : `展开 ${step.label} 详情`}
              aria-expanded={expanded}
              onClick={() => setExpanded((current) => !current)}
            >
              <Icon name="chevron" size={14} />
            </button>
          )}
        </div>
        {expanded && hasMeta && (
          <dl className="process-step-meta">
            {Object.entries(step.meta).map(([label, value]) => (
              <div key={label}><dt>{label}</dt><dd>{String(value)}</dd></div>
            ))}
          </dl>
        )}
      </div>
    </li>
  )
}

function ProcessTrace({ steps, pending, status, startedAt, completedAt, runtimeName, runtimeId, toolCallCount, usage }) {
  const [expanded, setExpanded] = useState(true)
  const [now, setNow] = useState(Date.now())
  const running = pending || steps.some((step) => step.status === 'running')

  useEffect(() => {
    if (!running) return undefined
    const timer = window.setInterval(() => setNow(Date.now()), 200)
    return () => window.clearInterval(timer)
  }, [running])

  const start = startedAt || steps[0]?.startedAt || now
  const end = completedAt || (running ? now : steps.at(-1)?.completedAt || now)
  const title = running ? '智能思考' : (status === 'error' ? '执行失败' : '执行过程')

  return (
    <section className={`process-trace is-${status || 'completed'}`} aria-label="Agent 执行过程">
      <button
        className="process-trace-summary"
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
      >
        <span className="process-trace-mark"><Icon name="llm" size={18} /></span>
        <strong>{title}<em className={`runtime-trace-badge is-${runtimeId || 'native'}`}>{runtimeName || '自研 Agent'}</em></strong>
        <span>耗时 {formatDuration(end - start)}{toolCallCount ? ` · ${toolCallCount} 次 Tool` : ''}{usage?.total_tokens ? ` · ${usage.total_tokens} tokens` : ''}</span>
        <Icon name="chevron" size={16} />
      </button>
      {expanded && (
        <>
          <ol className="process-step-list">
            {steps.map((step, index) => (
              <ProcessStep key={step.id} step={step} now={now} isLast={index === steps.length - 1} />
            ))}
          </ol>
          <button className="process-trace-collapse" type="button" onClick={() => setExpanded(false)}>
            <span>收起过程</span><Icon name="chevron" size={13} />
          </button>
        </>
      )}
    </section>
  )
}

function MessageTimeline({ messages, busy }) {
  const hasPendingMessage = messages.some((message) => message.pending)

  return (
    <div className="message-timeline" aria-live="polite">
      {messages.map((message) => (
        <article className={`message-row is-${message.role} is-${message.status || 'completed'}`} key={message.id}>
          {message.role === 'assistant' && <span className="agent-avatar"><Icon name="agent" size={18} weight="bold" /></span>}
          <div className="message-stack">
            <div className="message-label">{message.role === 'assistant' ? `Sedum Agent · ${message.runtimeName || '自研 Agent'}` : '你'}</div>
            {message.steps?.length > 0 && (
              <ProcessTrace
                steps={message.steps}
                pending={message.pending}
                status={message.status}
                startedAt={message.startedAt}
                completedAt={message.completedAt}
                runtimeName={message.runtimeName}
                runtimeId={message.runtimeId}
                toolCallCount={message.toolCallCount}
                usage={message.usage}
              />
            )}
            {message.content && <MessageContent content={message.content} role={message.role} />}
            {message.pending && !message.content && !message.steps?.length && <ThinkingIndicator />}
          </div>
        </article>
      ))}
      {busy && !hasPendingMessage && (
        <article className="message-row is-assistant">
          <span className="agent-avatar"><Icon name="agent" size={18} weight="bold" /></span>
          <div className="message-stack">
            <div className="message-label">Sedum Agent</div>
            <ThinkingIndicator />
          </div>
        </article>
      )}
    </div>
  )
}

export default MessageTimeline
