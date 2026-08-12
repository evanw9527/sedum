import { useEffect, useMemo, useRef, useState } from 'react'
import { snowGrassApi } from '../../api/snowGrassApi.js'
import Icon from '../../shared/ui/Icon.jsx'
import '../../styles/knowledge.css'

const PAGE_SIZE = 40
const SOURCE_LABELS = {
  activity_event: '本地活动输入',
  hourly_summary: 'DeepSeek 小时总结',
}
const STATUS_LABELS = { active: '有效', disabled: '历史停用', deleted: '已删除' }

function formatTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}

function displayTitle(item) {
  if (item.source_type === 'activity_event') {
    return `${item.source_app || '本地活动'} · ${formatTime(item.occurred_at)}`
  }
  return item.title || '无标题知识'
}

function KnowledgeManagementPage() {
  const [stats, setStats] = useState(null)
  const [bases, setBases] = useState([])
  const [pageData, setPageData] = useState({ items: [], total: 0, page: 1, page_size: PAGE_SIZE })
  const [page, setPage] = useState(1)
  const [queryInput, setQueryInput] = useState('')
  const [query, setQuery] = useState('')
  const [sourceType, setSourceType] = useState('')
  const [status, setStatus] = useState('')
  const [selected, setSelected] = useState([])
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mutating, setMutating] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [reloadToken, setReloadToken] = useState(0)
  const abortRef = useRef(null)

  useEffect(() => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    setError('')
    Promise.all([
      snowGrassApi.knowledgeStats(),
      snowGrassApi.listKnowledgeBases(),
      snowGrassApi.listKnowledgeDocuments({
        page,
        pageSize: PAGE_SIZE,
        query,
        sourceType,
        status,
        signal: controller.signal,
      }),
    ]).then(([nextStats, nextBases, documents]) => {
      setStats(nextStats)
      setBases(nextBases)
      setPageData(documents)
      setSelected([])
      setDetail((current) => documents.items.find((item) => item.id === current?.id) || null)
    }).catch((requestError) => {
      if (requestError.name !== 'AbortError') setError(requestError.message)
    }).finally(() => setLoading(false))
    return () => controller.abort()
  }, [page, query, sourceType, status, reloadToken])

  const selectedSet = useMemo(() => new Set(selected), [selected])
  const pageCount = Math.max(1, Math.ceil(pageData.total / PAGE_SIZE))
  const allSelected = pageData.items.length > 0 && pageData.items.every((item) => selectedSet.has(item.id))

  const refresh = (message = '') => {
    setNotice(message)
    setReloadToken((value) => value + 1)
  }

  const toggleBase = async (base) => {
    setMutating(true)
    setError('')
    try {
      const updated = await snowGrassApi.updateKnowledgeBase(
        base.source_type,
        !base.enabled,
      )
      setBases((current) => current.map((item) => (
        item.source_type === updated.source_type ? updated : item
      )))
      setNotice(`${updated.name}已${updated.enabled ? '启用' : '停用'}`)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setMutating(false)
    }
  }

  const removeOne = async (item) => {
    if (!window.confirm(`确认软删除“${displayTitle(item)}”？普通重建索引不会恢复它。`)) return
    setMutating(true)
    try {
      await snowGrassApi.deleteKnowledgeDocument(item.id)
      setDetail(null)
      refresh('知识条目已软删除')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setMutating(false)
    }
  }

  const batchDelete = async () => {
    if (!selected.length) return
    if (!window.confirm(`确认软删除选中的 ${selected.length} 条知识？`)) return
    setMutating(true)
    try {
      const result = await snowGrassApi.batchKnowledge(selected, 'delete')
      refresh(`已更新 ${result.updated} 条，跳过 ${result.skipped} 条`)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setMutating(false)
    }
  }

  const reindex = async (restoreDeleted = false) => {
    if (restoreDeleted && !window.confirm('这会恢复所有仍有来源数据的已删除知识，确认继续？')) return
    setMutating(true)
    setError('')
    try {
      const result = await snowGrassApi.reindexKnowledge({ restoreDeleted })
      refresh(`重建完成：新增 ${result.indexed}，更新 ${result.updated}，跳过 ${result.skipped}`)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setMutating(false)
    }
  }

  return (
    <div className="knowledge-page">
      <aside className="knowledge-sidebar side-panel">
        <div className="side-panel-heading"><h2>知识库</h2><span>{stats?.total ?? '—'} 条</span></div>
        <div className="knowledge-source-nav">
          {[
            ['', '全部知识', stats?.total],
            ...bases.map((base) => [base.source_type, base.name, base.total]),
          ].map(([value, label, count]) => (
            <button key={label} className={sourceType === value ? 'is-active' : ''} type="button" onClick={() => { setSourceType(value); setPage(1) }}>
              <Icon name={value === 'hourly_summary' ? 'llm' : 'knowledge'} size={17} />
              <span>{label}</span><b>{count ?? '—'}</b>
            </button>
          ))}
        </div>
        <form className="knowledge-filters" onSubmit={(event) => { event.preventDefault(); setQuery(queryInput.trim()); setPage(1) }}>
          <label><span>检索内容</span><div><Icon name="search" size={14} /><input value={queryInput} placeholder="标题、正文、来源…" onChange={(event) => setQueryInput(event.target.value)} /></div></label>
          <label><span>条目状态</span><select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }}><option value="">全部状态</option><option value="active">有效</option><option value="deleted">已删除</option></select></label>
          <button type="submit">应用筛选</button>
          {(query || sourceType || status) && <button className="is-quiet" type="button" onClick={() => { setQueryInput(''); setQuery(''); setSourceType(''); setStatus(''); setPage(1) }}>清除筛选</button>}
        </form>
        <div className="knowledge-policy"><Icon name="success" size={18} weight="fill" /><div><strong>两级使用控制</strong><span>先启用知识库，再由 FatPet 或 Agent 会话决定是否挂载。删除条目不会进入检索。</span></div></div>
      </aside>

      <main className="knowledge-main">
        <header className="knowledge-topbar">
          <div><span className="knowledge-topbar-icon"><Icon name="knowledge" size={18} weight="fill" /></span><div><h1>个人知识库管理</h1><p>来源可追溯 · 检索可控制 · 删除保留墓碑</p></div></div>
          <div className="knowledge-top-actions">
            {status === 'deleted' && <button type="button" disabled={mutating} onClick={() => reindex(true)}><Icon name="history" size={15} />恢复并重建</button>}
            <button type="button" disabled={mutating} onClick={() => reindex(false)}><Icon name="history" size={15} />重建索引</button>
          </div>
        </header>

        <div className="knowledge-scroll">
          {!stats?.globally_enabled && <div className="knowledge-global-warning">服务端全局知识检索已关闭。这里仍可管理数据，但任何会话都不会挂载知识。</div>}
          {error && <div className="knowledge-message is-error">{error}<button type="button" onClick={() => refresh()}>重试</button></div>}
          {notice && <div className="knowledge-message">{notice}<button type="button" onClick={() => setNotice('')}>关闭</button></div>}

          <section className="knowledge-base-directory" aria-label="知识库目录">
            {bases.map((base, index) => (
              <article className={base.enabled ? 'is-enabled' : 'is-disabled'} key={base.source_type}>
                <div className="knowledge-base-number">0{index + 1}</div>
                <div className="knowledge-base-copy">
                  <span>{base.source_type === 'activity_event' ? '持续同步' : '按小时生成'}</span>
                  <h2>{base.name}</h2>
                  <p>{base.description}</p>
                  <small>{base.total} 条知识 · 最近更新 {formatTime(base.last_indexed_at)}</small>
                </div>
                <button
                  className={base.enabled ? 'is-on' : ''}
                  type="button"
                  role="switch"
                  aria-checked={base.enabled}
                  disabled={mutating}
                  onClick={() => toggleBase(base)}
                >
                  <i />{base.enabled ? '已启用' : '已停用'}
                </button>
              </article>
            ))}
          </section>

          <section className={`knowledge-ledger ${loading ? 'is-loading' : ''}`}>
            <header>
              <div><strong>{pageData.total}</strong><span>条匹配知识</span><small>{stats?.index_mode === 'fts5_trigram' ? 'FTS5 Trigram 索引' : '兼容检索模式'}</small></div>
              <div className="knowledge-batch">
                <span>已选 {selected.length}</span>
                <button className="is-danger" type="button" disabled={!selected.length || mutating} onClick={batchDelete}>删除条目</button>
              </div>
            </header>
            <div className="knowledge-table-head"><input type="checkbox" aria-label="选择本页" checked={allSelected} onChange={() => setSelected(allSelected ? [] : pageData.items.map((item) => item.id))} /><span>来源</span><span>知识内容</span><span>状态</span><span>发生时间</span><span>操作</span></div>
            {loading && <div className="knowledge-empty"><Icon name="loading" size={18} />正在读取知识库…</div>}
            {!loading && !pageData.items.length && <div className="knowledge-empty">没有匹配的知识条目</div>}
            {!loading && pageData.items.map((item) => (
              <article className={`knowledge-row source-${item.source_type}`} key={item.id}>
                <input type="checkbox" aria-label={`选择 ${displayTitle(item)}`} checked={selectedSet.has(item.id)} onChange={() => setSelected((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])} />
                <div className="knowledge-source"><i /><div><strong>{SOURCE_LABELS[item.source_type]}</strong><span>{item.source_app || item.source_id}</span></div></div>
                <button className="knowledge-content" type="button" onClick={() => setDetail(item)}><strong>{displayTitle(item)}</strong><span>{item.content}</span>{item.keywords.length > 0 && <small>{item.keywords.map((keyword) => <b key={keyword}>{keyword}</b>)}</small>}</button>
                <span className={`knowledge-status is-${item.status}`}>{STATUS_LABELS[item.status]}</span>
                <time>{formatTime(item.occurred_at)}</time>
                <div className="knowledge-row-actions">
                  {item.status !== 'deleted' && <button className="is-danger" type="button" disabled={mutating} onClick={() => removeOne(item)}><Icon name="trash" size={14} /></button>}
                </div>
              </article>
            ))}
            <footer><button type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}><Icon name="previous" size={14} />上一页</button><span>第 {page} / {pageCount} 页</span><button type="button" disabled={page >= pageCount || loading} onClick={() => setPage((value) => value + 1)}>下一页<Icon name="next" size={14} /></button></footer>
          </section>
        </div>
      </main>

      {detail && <div className="knowledge-detail-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetail(null) }}><aside className="knowledge-detail" role="dialog" aria-modal="true" aria-label="知识来源详情"><header><div><span>{SOURCE_LABELS[detail.source_type]}</span><h2>{displayTitle(detail)}</h2></div><button type="button" aria-label="关闭详情" onClick={() => setDetail(null)}><Icon name="close" size={18} /></button></header><dl><div><dt>来源 ID</dt><dd>{detail.source_id}</dd></div><div><dt>来源应用</dt><dd>{detail.source_app || '—'}</dd></div><div><dt>发生时间</dt><dd>{formatTime(detail.occurred_at)}</dd></div><div><dt>当前状态</dt><dd>{STATUS_LABELS[detail.status]}</dd></div></dl><section><span>原始知识内容</span><p>{detail.content}</p></section><footer><small>此内容由来源数据生成，不支持直接编辑。知识库是否参与检索请在目录卡片中控制；此处只管理单条知识。</small>{detail.status !== 'deleted' && <div><button className="is-danger" type="button" onClick={() => removeOne(detail)}>软删除</button></div>}</footer></aside></div>}
    </div>
  )
}

export default KnowledgeManagementPage
