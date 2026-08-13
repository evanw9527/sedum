import Icon from '../../../shared/ui/Icon.jsx'

const STATUS_META = {
  succeeded: { label: '成功', icon: 'success' },
  failed: { label: '失败', icon: 'close' },
  running: { label: '运行中', icon: 'loading' },
}
const shortId = (value) => value ? `${value.slice(0, 8)}…${value.slice(-5)}` : '草稿'
const formatDuration = (run) => {
  const value = run.duration_ms ?? (run.completed_at ? Math.max(0, new Date(run.completed_at) - new Date(run.started_at)) : null)
  if (value === null) return '—'
  return value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)} s` : `${value} ms`
}

function ExecutionRecordsDrawer({ open, workflowName, runs, loading, aggregate, total, page, pageSize, filter, onFilterChange, onPageChange, onClose, onSelect }) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const successCount = aggregate?.succeeded || 0
  return <div className={`execution-records-layer ${open ? 'is-open' : ''}`} aria-hidden={!open} inert={open ? undefined : true} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <aside className="execution-records-drawer" role="dialog" aria-modal="true" aria-labelledby="execution-records-title">
      <header><div><span><Icon name="history" size={17} /></span><div><small>{workflowName}</small><h2 id="execution-records-title">执行记录</h2></div></div><button type="button" aria-label="关闭执行记录" onClick={onClose}><Icon name="close" size={17} /></button></header>
      <div className="execution-records-content">
        <section className="execution-records-summary"><div><small>近 30 天执行</small><strong>{total}<em>次</em></strong></div><div><small>成功率</small><strong>{total ? Math.round(successCount / total * 100) : 0}<em>%</em></strong></div><div><small>失败</small><strong>{aggregate?.failed || 0}<em>次</em></strong></div></section>
        <nav className="execution-record-filters" aria-label="执行记录筛选">{[['all', '全部'], ['succeeded', '成功'], ['failed', '失败'], ['formal', '正式'], ['preview', '预览']].map(([value, label]) => <button className={filter === value ? 'is-active' : ''} type="button" key={value} onClick={() => onFilterChange(value)}>{label}</button>)}</nav>
        <section className="execution-record-list">
          {loading && <div className="execution-record-empty"><Icon name="loading" size={18} />正在加载执行记录…</div>}
          {!loading && runs.length === 0 && <div className="execution-record-empty"><Icon name="history" size={20} /><strong>暂无匹配记录</strong><span>试试切换其他筛选条件</span></div>}
          {!loading && runs.map((run) => { const meta = STATUS_META[run.status] || { label: run.status, icon: 'history' }; return <button className="execution-record-item" type="button" key={run.run_id} onClick={() => onSelect(run)}><span className={`execution-record-state is-${run.status}`}><Icon name={meta.icon} size={13} />{meta.label}</span><span className="execution-record-main"><strong>{new Date(run.started_at).toLocaleString()}</strong><small><code>{shortId(run.run_id)}</code><em className={run.preview ? 'is-preview' : ''}>{run.preview ? '预览' : '正式'}</em></small></span><span className="execution-record-duration">{formatDuration(run)}<Icon name="next" size={13} /></span></button>})}
        </section>
        {!loading && total > pageSize && <footer className="run-pagination"><span>第 {page} / {pageCount} 页 · 共 {total} 条</span><div><button type="button" disabled={page === 1} onClick={() => onPageChange(page - 1)}><Icon name="previous" size={13} />上一页</button><button type="button" disabled={page === pageCount} onClick={() => onPageChange(page + 1)}>下一页<Icon name="next" size={13} /></button></div></footer>}
      </div>
    </aside>
  </div>
}

export default ExecutionRecordsDrawer
