import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { snowGrassApi } from '../../api/snowGrassApi.js'
import Icon from '../../shared/ui/Icon.jsx'
import '../../styles/component.css'

function WorkflowListPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [packs, setPacks] = useState([])
  const [query, setQuery] = useState('')
  const [businessType, setBusinessType] = useState('')
  const [status, setStatus] = useState('')
  const [creating, setCreating] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(() => Promise.all([
    snowGrassApi.listWorkflows(), snowGrassApi.listBusinessPacks(),
  ]).then(([flows, businessPacks]) => {
    setItems(flows)
    setPacks(businessPacks)
  }), [])

  useEffect(() => { load().catch((reason) => setError(reason.message)) }, [load])

  const visibleItems = useMemo(() => items.filter((item) => {
    const matchesQuery = !query || `${item.name} ${item.id}`.toLowerCase().includes(query.toLowerCase())
    const matchesBusiness = !businessType || item.business_type === businessType
    const matchesStatus = !status || (status === 'deployed' ? item.deployed_version_id : !item.deployed_version_id)
    return matchesQuery && matchesBusiness && matchesStatus
  }), [items, query, businessType, status])

  const deployedCount = items.filter((item) => item.deployed_version_id).length
  const activeCount = items.filter((item) => item.status !== 'archived').length

  const create = async (event) => {
    event.preventDefault()
    setCreating(true)
    setError('')
    const data = new FormData(event.currentTarget)
    try {
      const flow = await snowGrassApi.createWorkflow({
        name: data.get('name'), description: '', business_type: data.get('business_type'),
      })
      setCreateOpen(false)
      navigate(`/workflows/${flow.id}`)
    } catch (reason) { setError(reason.message) } finally { setCreating(false) }
  }

  const copy = async (item) => {
    try {
      const flow = await snowGrassApi.copyWorkflow(item.id, `${item.name} 副本`)
      navigate(`/workflows/${flow.id}`)
    } catch (reason) { setError(reason.message) }
  }

  const archive = async (item) => {
    try {
      await snowGrassApi.setWorkflowStatus(item.id, item.status === 'archived' ? 'active' : 'archived')
      await load()
    } catch (reason) { setError(reason.message) }
  }

  return (
    <div className="definition-page">
      <aside className="definition-sidebar side-panel">
        <div className="side-panel-heading"><h2>流程目录</h2><span>{items.length} 个</span></div>
        <div className="definition-nav">
          <button className={!businessType ? 'is-active' : ''} type="button" onClick={() => setBusinessType('')}><Icon name="flow" size={17} /><span>流程定义</span><b>{items.length}</b></button>
          <button type="button"><Icon name="edge" size={17} /><span>业务类型</span><b>{packs.length}</b></button>
          <button type="button"><Icon name="history" size={17} /><span>发布版本</span></button>
          <button type="button"><Icon name="settings" size={17} /><span>部署管理</span></button>
        </div>
        {packs.length > 0 && <div className="definition-category-list"><strong>按业务查看</strong>{packs.map((pack) => <button className={businessType === pack.business_type ? 'is-active' : ''} key={pack.business_type} type="button" onClick={() => setBusinessType(pack.business_type)}><span>{pack.title}</span><b>{items.filter((item) => item.business_type === pack.business_type).length}</b></button>)}</div>}
      </aside>

      <main className="definition-main">
        <header className="definition-topbar">
          <div><span className="definition-topbar-icon"><Icon name="flow" size={18} weight="fill" /></span><div><h1>流程编排</h1><p>定义、发布并部署由组件版本组成的 DAG</p></div></div>
          <div className="definition-top-actions"><Link to="/runs"><Icon name="history" size={15} />全部运行记录</Link><button className="definition-create-trigger" type="button" onClick={() => setCreateOpen(true)}><Icon name="plus" size={15} />新建流程</button></div>
        </header>
        <div className="definition-scroll">
          {error && <div className="definition-message is-error">{error}<button type="button" onClick={() => setError('')}>关闭</button></div>}
          <div className="definition-toolbar">
            <label className="definition-search"><Icon name="search" size={16} /><input value={query} placeholder="搜索流程名称或 ID" onChange={(event) => setQuery(event.target.value)} /></label>
            <label><span>业务类型</span><select value={businessType} onChange={(event) => setBusinessType(event.target.value)}><option value="">全部</option>{packs.map((pack) => <option key={pack.business_type} value={pack.business_type}>{pack.title}</option>)}</select></label>
            <label><span>部署状态</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">全部</option><option value="deployed">已部署</option><option value="draft">未部署</option></select></label>
          </div>
          <section className="definition-metrics" aria-label="流程概览">
            <article><Icon name="flow" size={20} /><span>流程总数</span><strong>{items.length}</strong></article>
            <article><Icon name="success" size={20} /><span>已部署</span><strong>{deployedCount}</strong></article>
            <article><Icon name="settings" size={20} /><span>有效流程</span><strong>{activeCount}</strong></article>
          </section>
          <section className="definition-ledger" aria-label="流程列表">
            <header><div><strong>{visibleItems.length}</strong><span>个匹配流程</span></div><small>组件版本在发布时固定</small></header>
            <div className="workflow-ledger-head"><span>流程</span><span>业务类型</span><span>草稿</span><span>最新版本</span><span>部署状态</span><span>操作</span></div>
            {visibleItems.map((item, index) => <div className="workflow-ledger-row" key={item.id}>
              <div className="ledger-identity"><b>{String(index + 1).padStart(2, '0')}</b><div><Link to={`/workflows/${item.id}`}>{item.name}</Link><code>{item.id}</code></div></div>
              <span>{packs.find((pack) => pack.business_type === item.business_type)?.title || item.business_type}</span>
              <strong>R{item.draft_revision}</strong>
              <strong>{item.latest_version ? `V${item.latest_version}` : '—'}</strong>
              <span className={`definition-status ${item.deployed_version_id ? 'is-active' : ''}`}><i />{item.deployed_version_id ? '已部署' : '未部署'}</span>
              <div className="ledger-actions"><Link to={`/workflows/${item.id}`}>编辑</Link><Link to={`/runs?workflow_id=${item.id}`}>运行记录</Link><button type="button" onClick={() => copy(item)}>复制</button><button className="is-danger" type="button" onClick={() => archive(item)}>{item.status === 'archived' ? '恢复' : '归档'}</button></div>
            </div>)}
            {visibleItems.length === 0 && <div className="definition-empty">没有符合条件的流程。</div>}
          </section>
          {createOpen && <div className="definition-create-popover"><form onSubmit={create}><header><div><strong>新建流程</strong><small>选择业务类型后进入 DAG 编排。</small></div><button type="button" aria-label="关闭新建流程" onClick={() => setCreateOpen(false)}><Icon name="close" size={15} /></button></header><div className="definition-create-fields"><label>流程名称<input name="name" placeholder="例如：活动小时摘要" required /></label><label>业务类型<select name="business_type">{packs.map((pack) => <option key={pack.business_type} value={pack.business_type}>{pack.title}</option>)}</select></label></div><footer><button type="button" onClick={() => setCreateOpen(false)}>取消</button><button className="primary" type="submit" disabled={creating}>{creating ? '创建中' : '创建并编排'}</button></footer></form></div>}
        </div>
      </main>
    </div>
  )
}

export default WorkflowListPage
