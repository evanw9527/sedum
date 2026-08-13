import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { snowGrassApi } from '../../api/snowGrassApi.js'
import Icon from '../../shared/ui/Icon.jsx'
import ExecutionTraceDrawer from '../../component/workflow/components/ExecutionTraceDrawer.jsx'
import '../../styles/run.css'

const STATUS_META = {
  succeeded: { label: '成功', icon: 'success' },
  failed: { label: '失败', icon: 'close' },
  running: { label: '运行中', icon: 'loading' },
  skipped: { label: '已跳过', icon: 'next' },
}

const businessLabel = (value) => ({ negative_feedback: '负反馈', hourly_summary: '小时总结' })[value] || value || '未分类'
const shortId = (value) => value ? `${value.slice(0, 8)}…${value.slice(-5)}` : '草稿'
const PAGE_SIZE = 10
const formatDuration = (value) => value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)} s` : `${value} ms`

function WorkflowRunListPage() {
  const traceRequestRef = useRef(0)
  const [searchParams] = useSearchParams()
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [aggregate, setAggregate] = useState({ total: 0, succeeded: 0, failed: 0, preview: 0, node_executions: 0, total_duration_ms: 0 })
  const [status, setStatus] = useState('')
  const [workflowId, setWorkflowId] = useState(() => searchParams.get('workflow_id') || '')
  const [versionId, setVersionId] = useState('')
  const [preview, setPreview] = useState('')
  const [range, setRange] = useState('30')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [traceRun, setTraceRun] = useState(null)
  const [traceLoading, setTraceLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    const startedAfter = range === 'all' ? '' : new Date(Date.now() - Number(range) * 86400000).toISOString()
    snowGrassApi.listWorkflowRuns({ status, workflowId, versionId, preview, startedAfter, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE })
      .then((result) => { if (active) { setItems(result.items); setTotal(result.total); setAggregate(result.aggregate) } })
      .catch((reason) => { if (active) setError(reason.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [status, workflowId, versionId, preview, range, page])

  useEffect(() => {
    if (!traceRun) return undefined
    const close = (event) => { if (event.key === 'Escape') { traceRequestRef.current += 1; setTraceRun(null); setTraceLoading(false) } }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [traceRun])

  const summary = { total: aggregate.total, succeeded: aggregate.succeeded, failed: aggregate.failed, preview: aggregate.preview, nodeExecutions: aggregate.node_executions, averageDuration: aggregate.total ? Math.round(aggregate.total_duration_ms / aggregate.total) : 0 }
  const successRate = summary.total ? Math.round(summary.succeeded / summary.total * 100) : 0
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const hasFilters = Boolean(status || workflowId || versionId || preview || range !== '30')
  const clearFilters = () => { setStatus(''); setWorkflowId(''); setVersionId(''); setPreview(''); setRange('30'); setPage(1) }
  const updateFilter = (setter) => (event) => { setter(event.target.value); setPage(1) }
  const openTrace = async (item) => {
    const requestId = ++traceRequestRef.current
    setTraceRun(item); setTraceLoading(true)
    try { const result = await snowGrassApi.getWorkflowRun(item.run_id); if (traceRequestRef.current === requestId) setTraceRun(result) }
    catch (reason) { if (traceRequestRef.current === requestId) setError(reason.message) }
    finally { if (traceRequestRef.current === requestId) setTraceLoading(false) }
  }
  const closeTrace = () => { traceRequestRef.current += 1; setTraceRun(null); setTraceLoading(false) }

  return <main className="run-page">
    <header className="run-page-header"><div><Link className="run-back" to="/workflows"><Icon name="previous" size={14} />返回流程定义</Link><h1>执行记录</h1><p>DAG 的结构化执行日志，用于监控运行结果和定位节点问题。</p></div><span className="run-total"><strong>{summary.total}</strong>次执行</span></header>

    <section className="run-overview" aria-label="运行概览">
      <div><span className="run-overview-icon total"><Icon name="history" /></span><p><small>流程执行次数</small><strong>{summary.total}</strong></p></div>
      <div><span className="run-overview-icon success"><Icon name="success" /></span><p><small>流程成功率</small><strong>{successRate}%</strong></p></div>
      <div><span className="run-overview-icon nodes"><Icon name="flow" /></span><p><small>节点执行次数</small><strong>{summary.nodeExecutions}</strong></p></div>
      <div><span className="run-overview-icon duration"><Icon name="activity" /></span><p><small>平均流程耗时</small><strong>{formatDuration(summary.averageDuration)}</strong></p></div>
      <div><span className="run-overview-icon failed"><Icon name="close" /></span><p><small>失败次数</small><strong>{summary.failed}</strong></p></div>
      <div><span className="run-overview-icon preview"><Icon name="play" /></span><p><small>预览执行次数</small><strong>{summary.preview}</strong></p></div>
    </section>

    <section className="run-records">
      <div className="run-records-heading"><div><h2>执行明细</h2><p>默认展示近 30 天；5 天内保留节点明细，之后仅保留执行汇总</p></div>{hasFilters && <button type="button" onClick={clearFilters}>恢复默认</button>}</div>
      <div className="run-filters">
        <label><span>时间范围</span><select value={range} onChange={updateFilter(setRange)}><option value="7">近 7 天</option><option value="30">近 30 天</option><option value="90">近 90 天</option><option value="all">全部时间</option></select></label>
        <label><span>流程 ID</span><input value={workflowId} onChange={updateFilter(setWorkflowId)} placeholder="输入 Workflow ID" /></label>
        <label><span>版本 ID</span><input value={versionId} onChange={updateFilter(setVersionId)} placeholder="输入 FlowVersion ID" /></label>
        <label><span>运行状态</span><select value={status} onChange={updateFilter(setStatus)}><option value="">全部状态</option><option value="succeeded">成功</option><option value="failed">失败</option></select></label>
        <label><span>运行类型</span><select value={preview} onChange={updateFilter(setPreview)}><option value="">全部类型</option><option value="true">预览</option><option value="false">正式</option></select></label>
      </div>
      {error && <p className="run-error" role="alert">{error}</p>}
      <div className={`run-table ${loading ? 'is-loading' : ''}`}>
        <div className="run-table-head"><span>状态</span><span>运行信息</span><span>业务</span><span>执行版本</span><span>开始时间</span><span /></div>
        {loading && <div className="run-table-state"><Icon name="loading" size={20} />正在加载执行记录…</div>}
        {!loading && !error && items.length === 0 && <div className="run-table-state"><Icon name="history" size={22} /><strong>没有匹配的执行记录</strong><span>{hasFilters ? '试试恢复默认筛选' : '执行或预览流程后，记录会出现在这里'}</span></div>}
        {!loading && items.map((run) => {
          const meta = STATUS_META[run.status] || { label: run.status, icon: 'history' }
          return <button className="run-record-row" type="button" onClick={() => openTrace(run)} key={run.run_id}>
            <strong className={`run-status status-${run.status}`}><Icon name={meta.icon} size={14} />{meta.label}</strong>
            <span className="run-identity"><strong title={run.run_id}>{shortId(run.run_id)}</strong><small className={run.preview ? 'is-preview' : ''}>{run.preview ? '预览运行' : '正式运行'}</small></span>
            <span>{businessLabel(run.business_type)}</span>
            <code title={run.resolved_version_id || '草稿预览'}>{shortId(run.resolved_version_id)}</code>
            <time dateTime={run.started_at}>{new Date(run.started_at).toLocaleString()}</time>
            <Icon name="next" size={15} />
          </button>
        })}
      </div>
      {!loading && total > PAGE_SIZE && <footer className="run-pagination"><span>第 {page} / {pageCount} 页 · 共 {total} 条</span><div><button type="button" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><Icon name="previous" size={14} />上一页</button><button type="button" disabled={page === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>下一页<Icon name="next" size={14} /></button></div></footer>}
    </section>
    <ExecutionTraceDrawer run={traceRun} loading={traceLoading} onClose={closeTrace} />
  </main>
}

export default WorkflowRunListPage
