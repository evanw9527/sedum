function FlowPreviewPanel({ trace, runId, status, error, onClose }) {
  if (!trace && !error) return null
  return (
    <aside className="flow-preview-panel" aria-live="polite">
      <div className="preview-heading">
        <div><small>RUN TRACE</small><strong>{status === 'succeeded' ? '运行完成' : status === 'failed' ? '运行失败' : '预览结果'}</strong></div>
        <button type="button" onClick={onClose}>关闭</button>
      </div>
      {error && <p className="preview-error">{error}</p>}
      {runId && <code className="preview-run-id">{runId}</code>}
      <ol className="trace-list">
        {(trace || []).map((item) => (
          <li key={item.node_id} className={`is-${item.status}`}>
            <span className="trace-dot" />
            <div><strong>{item.node_id}</strong><small>{item.node_type} · {item.duration_ms}ms</small></div>
            <em>{item.status === 'succeeded' ? '通过' : '失败'}</em>
          </li>
        ))}
      </ol>
    </aside>
  )
}

export default FlowPreviewPanel
