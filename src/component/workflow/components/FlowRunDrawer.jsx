function FlowRunDrawer({ run, onClose }) {
  if (!run) return null
  return <aside className="run-drawer"><header><div><small>运行结果</small><h2>{run.status}</h2></div><button type="button" onClick={onClose}>关闭</button></header><code>{run.run_id}</code><ol>{run.trace?.map((trace) => <li className={`is-${trace.status}`} key={trace.node_id}><span>{trace.status}</span><div><strong>{trace.node_type || trace.node_id}</strong><small>{trace.component_version_id || '未记录版本'} · {trace.duration_ms} ms</small>{trace.skip_reason && <em>{trace.skip_reason}</em>}{trace.error && <p>{trace.error}</p>}</div></li>)}</ol></aside>
}
export default FlowRunDrawer
