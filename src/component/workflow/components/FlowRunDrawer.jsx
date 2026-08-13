import Icon from '../../../shared/ui/Icon.jsx'

const STATUS_LABELS = { succeeded: '运行成功', failed: '运行失败', running: '运行中', skipped: '已跳过' }

function FlowRunDrawer({ run, onClose }) {
  if (!run) return null
  const totalDuration = run.trace?.reduce((sum, trace) => sum + (trace.duration_ms || 0), 0) || 0
  return <aside className="run-drawer"><header><div><small>本次预览</small><h2 className={`status-${run.status}`}><Icon name={run.status === 'succeeded' ? 'success' : 'close'} size={19} />{STATUS_LABELS[run.status] || run.status}</h2></div><button type="button" aria-label="关闭运行结果" onClick={onClose}><Icon name="close" size={17} /></button></header><div className="run-drawer-summary"><span><small>执行节点</small><strong>{run.trace?.length || 0}</strong></span><span><small>累计耗时</small><strong>{totalDuration} ms</strong></span></div><code title={run.run_id}>{run.run_id}</code><ol>{run.trace?.map((trace, index) => <li className={`is-${trace.status}`} key={`${trace.node_id}-${index}`}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{trace.node_type || trace.node_id}</strong><small><em>{STATUS_LABELS[trace.status] || trace.status}</em>{trace.duration_ms} ms</small>{trace.skip_reason && <p>{trace.skip_reason}</p>}{trace.error && <p className="trace-error">{trace.error}</p>}</div></li>)}</ol></aside>
}
export default FlowRunDrawer
