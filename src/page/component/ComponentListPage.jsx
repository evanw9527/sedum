import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { snowGrassApi } from '../../api/snowGrassApi.js'
import Icon from '../../shared/ui/Icon.jsx'
import ComponentIconPicker from '../../component/component/ComponentIconPicker.jsx'
import '../../styles/component.css'

const IMPLEMENTATIONS = [
  'core.input@1', 'core.output@1', 'activity.normalize@1', 'activity.filter@1',
  'activity.summarize@1', 'activity.validate@1', 'feedback.classify@1', 'feedback.reply@1',
]

function ComponentListPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')
  const [creating, setCreating] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [createIcon, setCreateIcon] = useState('tool')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    snowGrassApi.listComponents().then((data) => active && setItems(data)).catch((reason) => active && setError(reason.message))
    return () => { active = false }
  }, [])

  const categories = useMemo(() => [...new Set(items.map((item) => item.category).filter(Boolean))], [items])
  const visibleItems = useMemo(() => items.filter((item) => {
    const matchesQuery = !query || `${item.name} ${item.key}`.toLowerCase().includes(query.toLowerCase())
    return matchesQuery && (!category || item.category === category) && (!status || item.status === status)
  }), [items, query, category, status])
  const publishedCount = items.filter((item) => item.latest_version).length
  const referencedCount = items.filter((item) => item.reference_count > 0).length

  const create = async (event) => {
    event.preventDefault()
    setCreating(true)
    setError('')
    const data = new FormData(event.currentTarget)
    try {
      const created = await snowGrassApi.createComponent({
        key: data.get('key'), name: data.get('name'), description: '',
        category: data.get('category'), implementation_key: data.get('implementation_key'),
        icon: createIcon,
      })
      setCreateOpen(false)
      navigate(`/components/${created.id}`)
    } catch (reason) { setError(reason.message) } finally { setCreating(false) }
  }

  return (
    <div className="definition-page">
      <aside className="definition-sidebar side-panel">
        <div className="side-panel-heading"><h2>组件目录</h2><span>{items.length} 个</span></div>
        <div className="definition-nav">
          <button className={!category ? 'is-active' : ''} type="button" onClick={() => setCategory('')}><Icon name="tool" size={17} /><span>组件管理</span><b>{items.length}</b></button>
          <button type="button"><Icon name="settings" size={17} /><span>组件分类</span><b>{categories.length}</b></button>
          <button type="button"><Icon name="edge" size={17} /><span>实现管理</span></button>
          <button type="button"><Icon name="history" size={17} /><span>版本管理</span></button>
          <button type="button"><Icon name="flow" size={17} /><span>引用分析</span></button>
        </div>
        {categories.length > 0 && <div className="definition-category-list"><strong>按分类查看</strong>{categories.map((value) => <button className={category === value ? 'is-active' : ''} key={value} type="button" onClick={() => setCategory(value)}><span>{value}</span><b>{items.filter((item) => item.category === value).length}</b></button>)}</div>}
      </aside>

      <main className="definition-main">
        <header className="definition-topbar">
          <div><span className="definition-topbar-icon"><Icon name="tool" size={18} weight="fill" /></span><div><h1>组件管理</h1><p>管理无状态组件的协议、参数、端口和不可变版本</p></div></div>
          <button className="definition-create-trigger" type="button" onClick={() => setCreateOpen(true)}><Icon name="plus" size={15} />新建组件</button>
        </header>
        <div className="definition-scroll">
          {error && <div className="definition-message is-error">{error}<button type="button" onClick={() => setError('')}>关闭</button></div>}
          <div className="definition-toolbar">
            <label className="definition-search"><Icon name="search" size={16} /><input value={query} placeholder="搜索组件名称、标识或描述" onChange={(event) => setQuery(event.target.value)} /></label>
            <label><span>状态</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">全部</option><option value="active">启用</option><option value="disabled">停用</option><option value="archived">归档</option></select></label>
            <label><span>分类</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">全部</option>{categories.map((value) => <option key={value}>{value}</option>)}</select></label>
          </div>
          <section className="definition-metrics" aria-label="组件概览">
            <article><Icon name="tool" size={20} /><span>组件总数</span><strong>{items.length}</strong></article>
            <article><Icon name="success" size={20} /><span>已有版本</span><strong>{publishedCount}</strong></article>
            <article><Icon name="edge" size={20} /><span>被流程引用</span><strong>{referencedCount}</strong></article>
          </section>
          <section className="definition-ledger" aria-label="组件列表">
            <header><div><strong>{visibleItems.length}</strong><span>个匹配组件</span></div><small>实现变更必须发布新版本</small></header>
            <div className="component-ledger-head"><span>组件</span><span>分类</span><span>最新版本</span><span>流程引用</span><span>状态</span><span>操作</span></div>
            {visibleItems.map((item, index) => <div className="component-ledger-row" key={item.id}>
              <div className="ledger-identity"><b>{String(index + 1).padStart(2, '0')}</b><div><Link to={`/components/${item.id}`}>{item.name}</Link><code>{item.key}</code></div></div>
              <span>{item.category}</span>
              <strong>{item.latest_version ? `V${item.latest_version}` : '草稿'}</strong>
              <strong>{item.reference_count}</strong>
              <span className={`definition-status is-${item.status}`}><i />{item.status === 'active' ? '启用' : item.status === 'disabled' ? '停用' : '归档'}</span>
              <div className="ledger-actions"><Link to={`/components/${item.id}`}>编辑定义</Link></div>
            </div>)}
            {visibleItems.length === 0 && <div className="definition-empty">没有符合条件的组件。</div>}
          </section>
          {createOpen && <div className="definition-create-popover"><form onSubmit={create}><header><div><strong>新建组件</strong><small>创建组件定义后，在侧面抽屉中完善协议与参数。</small></div><button type="button" aria-label="关闭新建组件" onClick={() => setCreateOpen(false)}><Icon name="close" size={15} /></button></header><div className="definition-create-fields"><label>组件标识<input name="key" pattern="[a-z][a-z0-9_.-]*" placeholder="activity.normalize" required /></label><label>组件名称<input name="name" placeholder="活动归一化" required /></label><label>分类<input name="category" placeholder="数据处理" required /></label><label>实现<select name="implementation_key">{IMPLEMENTATIONS.map((item) => <option key={item}>{item}</option>)}</select></label><div className="definition-icon-field"><span>默认图标</span><ComponentIconPicker compact value={createIcon} onChange={setCreateIcon} /></div></div><footer><button type="button" onClick={() => setCreateOpen(false)}>取消</button><button className="primary" type="submit" disabled={creating}>{creating ? '创建中' : '创建并编辑'}</button></footer></form></div>}
        </div>
      </main>
    </div>
  )
}

export default ComponentListPage
