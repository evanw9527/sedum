import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { snowGrassApi } from '../../api/snowGrassApi.js'
import '../../styles/run.css'

function WorkflowRunListPage() {
  const [searchParams] = useSearchParams()
  const [items, setItems] = useState([])
  const [status, setStatus] = useState('')
  const [workflowId, setWorkflowId] = useState(() => searchParams.get('workflow_id') || '')
  const [versionId, setVersionId] = useState('')
  const [preview, setPreview] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    snowGrassApi.listWorkflowRuns({ status, workflowId, versionId, preview })
      .then(setItems).catch((reason) => setError(reason.message))
  }, [status, workflowId, versionId, preview])
  return <main className="run-page"><header><span>01</span><div><Link to="/workflows">返回流程定义</Link><h1>运行记录</h1><p>按固定 FlowVersion 查看执行路径和节点状态。</p></div></header><div className="run-filters"><input value={workflowId} onChange={(event) => setWorkflowId(event.target.value)} placeholder="Workflow ID"/><input value={versionId} onChange={(event) => setVersionId(event.target.value)} placeholder="FlowVersion ID"/><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">全部状态</option><option value="succeeded">成功</option><option value="failed">失败</option></select><select value={preview} onChange={(event) => setPreview(event.target.value)}><option value="">全部类型</option><option value="true">预览</option><option value="false">正式</option></select></div>{error&&<p className="run-error">{error}</p>}<div className="run-table"><div className="run-table-head"><span>状态</span><span>业务</span><span>FlowVersion</span><span>开始时间</span><span>类型</span></div>{items.map((run)=><Link to={`/runs/${run.run_id}`} key={run.run_id}><strong className={`status-${run.status}`}>{run.status}</strong><span>{run.business_type}</span><code>{run.resolved_version_id||'草稿'}</code><time>{new Date(run.started_at).toLocaleString()}</time><span>{run.preview?'预览':'正式'}</span></Link>)}</div></main>
}
export default WorkflowRunListPage
