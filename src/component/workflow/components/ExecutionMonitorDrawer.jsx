import Icon from '../../../shared/ui/Icon.jsx'

const formatDuration = (value) => value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)} s` : `${value} ms`
const STATUS_LABELS = { succeeded: '成功', failed: '失败', skipped: '跳过' }

function ExecutionMonitorDrawer({ open, running, stats, nodes, nodeHistory, latestTrace, onToggle }) {
  return <>
    <button className={`execution-monitor-trigger ${running ? 'is-running' : ''}`} type="button" aria-expanded={open} onClick={onToggle}>
      <Icon name={running ? 'loading' : 'activity'} size={15} />
      <span><small>{running ? '当前执行' : '执行概览'}</small><strong>{running ? '正在执行…' : `近 30 天 ${stats.runs} 次`}</strong></span>
      <Icon name={open ? 'next' : 'previous'} size={13} />
    </button>
    <aside className={`execution-monitor-drawer ${open ? 'is-open' : ''}`} aria-hidden={!open} inert={open ? undefined : true}>
      <header><div><span className={`execution-monitor-status ${running ? 'is-running' : ''}`}><Icon name={running ? 'loading' : 'history'} size={16} /></span><div><h2>{running ? '当前流程正在执行' : '执行概览'}</h2><p>{running ? '等待服务端返回节点执行结果' : '近 30 天流程与节点执行情况'}</p></div></div><button type="button" aria-label="收起执行概览" onClick={onToggle}><Icon name="close" size={16} /></button></header>
      <div className="execution-monitor-content">
        <section className="execution-monitor-metrics" aria-label="流程执行指标">
          <div><small>流程执行</small><strong>{stats.runs}<em>次</em></strong></div>
          <div><small>成功率</small><strong>{stats.successRate}<em>%</em></strong></div>
          <div><small>节点执行</small><strong>{stats.nodeExecutions}<em>次</em></strong></div>
          <div><small>平均耗时</small><strong>{formatDuration(stats.averageDuration)}</strong></div>
        </section>
        <section className="execution-node-stats"><div className="execution-node-head"><strong>节点执行情况</strong><span>次数 / 平均耗时</span></div><div className="execution-node-list">{nodes.map((node) => {
          const history = nodeHistory[node.id]
          const trace = latestTrace[node.id]
          return <div className="execution-node-row" key={node.id}><span className="execution-node-icon"><Icon name={node.component?.icon || 'tool'} size={14} weight="fill" /></span><span className="execution-node-name"><strong>{node.name}</strong><small>{node.component?.component_key}</small></span>{trace && <span className={`execution-node-result is-${trace.status}`}><i />{STATUS_LABELS[trace.status] || trace.status}{trace.status !== 'skipped' && ` · ${formatDuration(trace.duration_ms || 0)}`}</span>}<span className="execution-node-history">{history ? <><strong>{history.count} 次</strong><small>均 {formatDuration(Math.round(history.duration / history.count))}</small></> : <small>暂无执行</small>}</span></div>
        })}</div></section>
      </div>
    </aside>
  </>
}

export default ExecutionMonitorDrawer
