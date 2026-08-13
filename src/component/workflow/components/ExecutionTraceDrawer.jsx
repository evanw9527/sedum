import Icon from '../../../shared/ui/Icon.jsx'
import '../../../styles/run.css'

const STATUS_META = {
  succeeded: { label: '成功', icon: 'success' },
  failed: { label: '失败', icon: 'close' },
  running: { label: '运行中', icon: 'loading' },
  skipped: { label: '已跳过', icon: 'next' },
}
const formatDuration = (value) => value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)} s` : `${value} ms`
const hasSummary = (value) => value && Object.keys(value).length > 0

function ExecutionTraceDrawer({ run, loading, onClose }) {
  if (!run) return null
  const meta = STATUS_META[run.status] || { label: run.status, icon: 'history' }
  const duration = run.duration_ms ?? (run.completed_at ? Math.max(0, new Date(run.completed_at) - new Date(run.started_at)) : 0)
  const executedNodes = run.executed_node_count ?? (run.trace?.filter((trace) => trace.status !== 'skipped').length || 0)
  const skippedNodes = run.skipped_node_count ?? ((run.trace?.length || 0) - executedNodes)
  return <div className="execution-trace-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <aside className="execution-trace-drawer" role="dialog" aria-modal="true" aria-labelledby="execution-trace-title">
      <header><div><span className={`trace-drawer-status status-${run.status}`}><Icon name={meta.icon} size={17} /></span><div><small>执行追踪</small><h2 id="execution-trace-title">{meta.label}</h2></div></div><button type="button" aria-label="关闭执行追踪" onClick={onClose}><Icon name="close" size={17} /></button></header>
      <div className="execution-trace-content">
        {loading && <div className="trace-refreshing"><Icon name="loading" size={13} />正在刷新追踪详情…</div>}
        <section className="trace-run-identity"><small>Run ID</small><code title={run.run_id}>{run.run_id}</code><div><span className={run.preview ? 'is-preview' : ''}>{run.preview ? '预览执行' : '正式执行'}</span><time>{new Date(run.started_at).toLocaleString()}</time></div></section>
        <section className="trace-run-metrics" aria-label="本次执行概览"><div><small>执行节点</small><strong>{executedNodes}<em>个</em></strong></div><div><small>跳过节点</small><strong>{skippedNodes}<em>个</em></strong></div><div><small>总耗时</small><strong>{formatDuration(duration)}</strong></div></section>
        <section className="trace-run-context"><div><small>业务类型</small><strong>{run.business_type || '—'}</strong></div><div><small>执行版本</small><code>{run.resolved_version_id || '草稿预览'}</code></div></section>
        {run.details_available === false ? <section className="trace-summary-notice"><Icon name="history" size={14} /><div><strong>执行明细已按 5 天留存策略清理</strong><p>流程状态、耗时和节点执行汇总仍保留，可继续用于历史统计。</p></div></section> : <section className="trace-summary-notice"><Icon name="settings" size={14} /><div><strong>端口数据为可追踪的受控快照</strong><p>保留真实结构与值；敏感字段自动脱敏，超长文本和大型集合会截断。</p></div></section>}
        <section className="trace-timeline"><div className="trace-section-heading"><div><h3>节点时间线</h3><p>按 DAG 实际执行顺序展示</p></div><span>{run.trace?.length || 0} 个节点</span></div><ol>{run.trace?.map((trace, index) => {
          const traceMeta = STATUS_META[trace.status] || { label: trace.status, icon: 'history' }
          const hasPorts = hasSummary(trace.input_port_summary) || hasSummary(trace.output_port_summary)
          return <li className={`is-${trace.status}`} key={`${trace.node_id}-${index}`}><span className="trace-step">{String(index + 1).padStart(2, '0')}</span><article><div className="trace-node-heading"><div><strong>{trace.node_type || trace.node_id}</strong><code>{trace.component_version_id || '未记录版本'}</code></div><span><Icon name={traceMeta.icon} size={12} />{traceMeta.label}</span></div><div className="trace-node-meta"><span><Icon name="activity" size={12} />{formatDuration(trace.duration_ms || 0)}</span>{trace.skip_reason && <span>{trace.skip_reason}</span>}</div>{trace.error && <p className="trace-node-error"><Icon name="close" size={13} />{trace.error}</p>}{hasPorts && <details><summary>查看入参 / 出参快照 <Icon name="next" size={11} /></summary><div className="trace-port-grid"><div><small>入参快照</small><pre>{JSON.stringify(trace.input_port_summary || {}, null, 2)}</pre></div><div><small>出参快照</small><pre>{JSON.stringify(trace.output_port_summary || {}, null, 2)}</pre></div></div></details>}</article></li>
        })}</ol></section>
      </div>
    </aside>
  </div>
}

export default ExecutionTraceDrawer
