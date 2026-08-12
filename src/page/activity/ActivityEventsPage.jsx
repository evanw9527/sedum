import { useCallback, useEffect, useMemo, useState } from 'react'
import { snowGrassApi } from '../../api/snowGrassApi.js'
import Icon from '../../shared/ui/Icon.jsx'
import '../../styles/activity.css'

const PAGE_SIZE = 50

const SOURCE_LABELS = { local: '本地算法', deepseek: 'DeepSeek', rules: '安全规则' }
const CATEGORY_LABELS = {
  none: '无消极情绪', frustrated: '受挫', anxious: '焦虑', angry: '愤怒',
  tired: '疲惫', sad: '悲伤', high_risk: '高风险',
}
const ACTION_LABELS = {
  idle: '待机', like: '点赞', wave: '挥手', dance: '跳舞', sleep: '睡觉', angry: '生气', comfort: '安慰',
}

function toISO(localValue) {
  if (!localValue) return ''
  const date = new Date(localValue)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

function formatTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '时间未知'
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date)
}

function formatHourRange(start, end) {
  const options = { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }
  return `${new Intl.DateTimeFormat('zh-CN', options).format(new Date(start))} — ${new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(end))}`
}

function getAppPresentation(item) {
  const identity = `${item.bundle_id} ${item.app_name}`.toLowerCase()
  if (identity.includes('chrome') || identity.includes('browser')) return { icon: 'search', tone: 'cyan' }
  if (identity.includes('fatpet') || identity.includes('pet')) return { icon: 'agent', tone: 'orange' }
  if (identity.includes('openai') || identity.includes('chatgpt') || identity.includes('codex')) return { icon: 'chats', tone: 'blue' }
  return { icon: 'activity', tone: 'green' }
}

function ActivityEventsPage() {
  const [activityView, setActivityView] = useState('events')
  const [queryInput, setQueryInput] = useState('')
  const [query, setQuery] = useState('')
  const [bundleId, setBundleId] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [summary, setSummary] = useState(null)
  const [analysisStats, setAnalysisStats] = useState(null)
  const [deduplicate, setDeduplicate] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState('')
  const [deletingRange, setDeletingRange] = useState(false)
  const [expandedIds, setExpandedIds] = useState(() => new Set())
  const [hourlySummaries, setHourlySummaries] = useState([])
  const [hourlyLoading, setHourlyLoading] = useState(false)
  const [hourlyError, setHourlyError] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(queryInput.trim())
      setPage(1)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [queryInput])

  const loadEvents = useCallback(async (signal) => {
    setLoading(true)
    setError('')
    try {
      const filters = {
        query,
        bundleId: bundleId.trim(),
        start: toISO(start),
        end: toISO(end),
        signal,
      }
      const [eventsResult, summaryResult, analysisResult] = await Promise.all([
        snowGrassApi.listActivityEvents({
          ...filters,
          page,
          pageSize: PAGE_SIZE,
          deduplicate,
        }),
        snowGrassApi.activitySummary(filters),
        snowGrassApi.activityAnalysisStats(filters),
      ])
      setData(eventsResult)
      setSummary(summaryResult)
      setAnalysisStats(analysisResult)
    } catch (loadError) {
      if (loadError.name !== 'AbortError') setError(loadError.message || '活动记录加载失败')
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [bundleId, deduplicate, end, page, query, start])

  const loadHourlySummaries = useCallback(async (signal) => {
    setHourlyLoading(true)
    setHourlyError('')
    try {
      const result = await snowGrassApi.listHourlyActivitySummaries({
        start: toISO(start),
        end: toISO(end),
        signal,
      })
      setHourlySummaries(result)
    } catch (loadError) {
      if (loadError.name !== 'AbortError') setHourlyError(loadError.message || '小时总结加载失败')
    } finally {
      if (!signal?.aborted) setHourlyLoading(false)
    }
  }, [end, start])

  useEffect(() => {
    const controller = new AbortController()
    if (activityView === 'events') loadEvents(controller.signal)
    else loadHourlySummaries(controller.signal)
    return () => controller.abort()
  }, [activityView, loadEvents, loadHourlySummaries])

  const totalPages = Math.max(Math.ceil((data?.total || 0) / PAGE_SIZE), 1)
  const hasFilters = Boolean(queryInput || bundleId || start || end)
  const hasValidRange = Boolean(start && end && new Date(start) <= new Date(end))

  const appCount = useMemo(() => {
    if (!data) return 0
    return new Set(data.items.map((item) => item.bundle_id)).size
  }, [data])

  const trendMaximum = useMemo(
    () => Math.max(...(summary?.daily || []).map((item) => item.event_count), 1),
    [summary],
  )

  const summaryCards = [
    { label: '有效输入', value: summary?.unique_event_count || 0, note: `原始 ${summary?.raw_event_count || 0} 条`, icon: 'activity', tone: 'blue' },
    { label: '输入字符', value: summary?.character_count || 0, note: '按最终文本统计', icon: 'chats', tone: 'cyan' },
    { label: '合并重复', value: summary?.duplicate_event_count || 0, note: '5 秒窗口，原始数据保留', icon: 'success', tone: 'green' },
    { label: '活跃应用', value: summary?.active_app_count || 0, note: '按 Bundle ID 统计', icon: 'flow', tone: 'orange' },
  ]

  const analyzedTotal = analysisStats?.analyzed_count || 0
  const sourceSegments = [
    { key: 'local', label: '本地算法', value: analysisStats?.local_count || 0 },
    { key: 'deepseek', label: 'DeepSeek', value: analysisStats?.deepseek_count || 0 },
    { key: 'rules', label: '安全规则', value: analysisStats?.rules_count || 0 },
  ]

  const hourlyStats = useMemo(() => ({
    generated: hourlySummaries.filter((item) => item.status === 'generated').length,
    inputs: hourlySummaries.reduce((total, item) => total + item.event_count, 0),
  }), [hourlySummaries])

  const clearFilters = () => {
    setQueryInput('')
    setQuery('')
    setBundleId('')
    setStart('')
    setEnd('')
    setPage(1)
  }

  const toggleExpanded = (eventId) => {
    setExpandedIds((current) => {
      const next = new Set(current)
      if (next.has(eventId)) next.delete(eventId)
      else next.add(eventId)
      return next
    })
  }

  const deleteEvent = async (item) => {
    if (!window.confirm(`确认删除 ${item.app_name} 的这条文字记录吗？此操作不可撤销。`)) return
    setDeletingId(item.id)
    setError('')
    try {
      await snowGrassApi.deleteActivityEvent(item.id)
      if (data?.items.length === 1 && page > 1) setPage((current) => current - 1)
      else await loadEvents()
    } catch (deleteError) {
      setError(deleteError.message || '删除记录失败')
    } finally {
      setDeletingId('')
    }
  }

  const deleteRange = async () => {
    if (!hasValidRange) return
    const message = `确认删除 ${new Date(start).toLocaleString('zh-CN')} 至 ${new Date(end).toLocaleString('zh-CN')} 之间的全部活动记录吗？此操作不可撤销。`
    if (!window.confirm(message)) return
    setDeletingRange(true)
    setError('')
    try {
      await snowGrassApi.deleteActivityRange({ start: toISO(start), end: toISO(end) })
      setPage(1)
      await loadEvents()
    } catch (deleteError) {
      setError(deleteError.message || '删除时间范围失败')
    } finally {
      setDeletingRange(false)
    }
  }

  return (
    <main className="activity-page">
      <aside className="activity-sidebar side-panel">
        <header className="side-panel-heading activity-sidebar-heading">
          <div><strong>活动</strong><span>{activityView === 'events' ? '输入记录' : '工作总结'}</span></div>
        </header>

        <div className="activity-view-switch" role="tablist" aria-label="活动数据视图">
          <button type="button" role="tab" aria-selected={activityView === 'events'} className={activityView === 'events' ? 'is-active' : ''} onClick={() => setActivityView('events')}>
            <span className="activity-tab-icon is-blue"><Icon name="activity" size={17} weight="bold" /></span>
            <span><strong>原始活动</strong><small>查看捕获的输入记录</small></span>
            {data && <b>{data.total.toLocaleString('zh-CN')}</b>}
          </button>
          <button type="button" role="tab" aria-selected={activityView === 'hourly'} className={activityView === 'hourly' ? 'is-active' : ''} onClick={() => setActivityView('hourly')}>
            <span className="activity-tab-icon is-green"><Icon name="history" size={17} weight="bold" /></span>
            <span><strong>小时总结</strong><small>回顾阶段工作进展</small></span>
            {hourlySummaries.length > 0 && <b>{hourlySummaries.length}</b>}
          </button>
        </div>

        <section className="activity-filters" aria-label="活动记录筛选">
          <header><Icon name="settings" size={14} /><strong>筛选条件</strong></header>
        {activityView === 'events' && <label className="activity-search">
          <span>关键词</span>
          <div><Icon name="search" size={15} /><input value={queryInput} onChange={(event) => setQueryInput(event.target.value)} placeholder="搜索文字或应用" /></div>
        </label>}
        {activityView === 'events' && <label>
          <span>Bundle ID</span>
          <input value={bundleId} onChange={(event) => { setBundleId(event.target.value); setPage(1) }} placeholder="例如 com.apple.Notes" />
        </label>}
        <label>
          <span>开始时间</span>
          <input type="datetime-local" value={start} max={end || undefined} onChange={(event) => { setStart(event.target.value); setPage(1) }} />
        </label>
        <label>
          <span>结束时间</span>
          <input type="datetime-local" value={end} min={start || undefined} onChange={(event) => { setEnd(event.target.value); setPage(1) }} />
        </label>
        <div className="activity-filter-actions">
          <button type="button" onClick={clearFilters} disabled={!hasFilters}>清除筛选</button>
          {activityView === 'events' && <button className="is-danger" type="button" onClick={deleteRange} disabled={!hasValidRange || deletingRange}>
            <Icon name={deletingRange ? 'loading' : 'trash'} size={15} />删除时间范围
          </button>}
        </div>
        </section>

        <section className="activity-privacy" aria-label="隐私说明">
          <span className="activity-privacy-icon"><Icon name="success" size={16} weight="bold" /></span>
          <div><strong>本地隐私保护</strong><span>不保存窗口标题，疑似凭据入库时脱敏。</span></div>
        </section>
        <p className="activity-retention"><Icon name="history" size={14} />活动记录默认保留 30 天</p>
      </aside>

      <section className="activity-main">
        <header className="activity-topbar">
          <div>
            <span className={`activity-topbar-icon is-${activityView === 'events' ? 'blue' : 'green'}`}><Icon name={activityView === 'events' ? 'activity' : 'history'} size={18} weight="bold" /></span>
            <div><h1>{activityView === 'events' ? '活动记录' : '小时总结'}</h1><p>{activityView === 'events' ? '输入趋势、活跃应用与完整记录' : '按时间回顾已完成、进行中、阻塞与下一步'}</p></div>
          </div>
          <button className="activity-refresh" type="button" onClick={() => activityView === 'events' ? loadEvents() : loadHourlySummaries()} disabled={loading || hourlyLoading}>
            <Icon name={loading || hourlyLoading ? 'loading' : 'history'} size={16} />刷新
          </button>
        </header>

        <div className="activity-scroll">

      {activityView === 'events' && <section className="activity-summary" aria-label="活动统计汇总">
        <div className="activity-summary-cards">
          {summaryCards.map((card) => (
            <article className="activity-summary-card" key={card.label}>
              <span className={`activity-metric-icon is-${card.tone}`}><Icon name={card.icon} size={18} weight="bold" /></span>
              <div><span>{card.label}</span><strong>{card.value.toLocaleString('zh-CN')}</strong><small>{card.note}</small></div>
            </article>
          ))}
        </div>

        <div className="activity-summary-detail">
          <article className="activity-trend">
            <header><strong>每日输入趋势</strong><span>事件 / 字符</span></header>
            {summary?.daily?.length ? (
              <div className="activity-trend-list">
                {summary.daily.map((item) => (
                  <div className="activity-trend-row" key={item.date}>
                    <time dateTime={item.date}>{item.date.slice(5)}</time>
                    <div><i style={{ width: `${Math.max((item.event_count / trendMaximum) * 100, 3)}%` }} /></div>
                    <strong>{item.event_count}</strong>
                    <span>{item.character_count.toLocaleString('zh-CN')} 字</span>
                  </div>
                ))}
              </div>
            ) : <p className="activity-summary-empty">暂无趋势数据</p>}
          </article>

          <article className="activity-ranking">
            <header><strong>应用排行</strong><span>按有效输入</span></header>
            {summary?.apps?.length ? (
              <ol>
                {summary.apps.slice(0, 6).map((item) => (
                  <li key={item.bundle_id}>
                    <div><strong>{item.app_name}</strong><span title={item.bundle_id}>{item.bundle_id}</span></div>
                    <p><b>{item.event_count}</b><span>{item.character_count.toLocaleString('zh-CN')} 字</span></p>
                  </li>
                ))}
              </ol>
            ) : <p className="activity-summary-empty">暂无应用数据</p>}
          </article>
        </div>


        <section className="analysis-routing" aria-label="情绪识别来源统计">
          <header>
            <div><h2>情绪识别来源</h2><p>每条已分析输入由本地加权词典、DeepSeek 回退或固定安全规则处理</p></div>
            <span><strong>{analyzedTotal.toLocaleString('zh-CN')}</strong> 条已分析 · {analysisStats?.pending_count || 0} 条待分析</span>
          </header>
          {analyzedTotal > 0 ? <>
            <div className="analysis-route-track" aria-label="识别来源占比">
              {sourceSegments.filter((item) => item.value > 0).map((item) => (
                <i key={item.key} className={`is-${item.key}`} style={{ width: `${(item.value / analyzedTotal) * 100}%` }} title={`${item.label} ${item.value} 条`} />
              ))}
            </div>
            <div className="analysis-source-cards">
              {sourceSegments.map((item) => <article key={item.key} className={`is-${item.key}`}>
                <span>{item.label}</span><strong>{item.value.toLocaleString('zh-CN')}</strong><small>{Math.round((item.value / analyzedTotal) * 100)}%</small>
              </article>)}
            </div>
            <div className="analysis-category-table">
              <div className="analysis-category-head"><span>识别结果</span><span>总计</span><span>本地</span><span>DeepSeek</span><span>规则</span></div>
              {analysisStats.categories.map((item) => <div className="analysis-category-row" key={item.category}>
                <strong>{CATEGORY_LABELS[item.category] || item.category}</strong>
                <span>{item.total}</span><span>{item.local}</span><span>{item.deepseek}</span><span>{item.rules}</span>
              </div>)}
            </div>
          </> : <p className="analysis-empty">当前筛选范围内还没有完成情绪分析的输入。</p>}
        </section>
      </section>}

      {activityView === 'events' && error && <div className="activity-error" role="alert"><span>{error}</span><button type="button" onClick={() => loadEvents()}>重试</button></div>}

      {activityView === 'events' && <section className={loading ? 'activity-ledger is-loading' : 'activity-ledger'} aria-busy={loading}>
        <header className="activity-ledger-heading">
          <div><strong>{data?.total?.toLocaleString('zh-CN') || 0}</strong><span>{deduplicate ? '条去重记录' : '条原始记录'}</span></div>
          <div className="activity-ledger-tools">
            <div className="activity-mode" role="group" aria-label="记录展示模式">
              <button type="button" className={deduplicate ? 'is-active' : ''} aria-pressed={deduplicate} onClick={() => { setDeduplicate(true); setPage(1) }}>合并重复</button>
              <button type="button" className={!deduplicate ? 'is-active' : ''} aria-pressed={!deduplicate} onClick={() => { setDeduplicate(false); setPage(1) }}>显示原始</button>
            </div>
            <p>本页涉及 {appCount} 个应用 · 第 {page} / {totalPages} 页</p>
          </div>
        </header>

        {!data && loading && <div className="activity-state"><Icon name="loading" size={20} />正在加载活动记录…</div>}
        {data && !data.items.length && <div className="activity-state">{hasFilters ? '当前筛选没有匹配记录' : '暂时没有活动记录'}</div>}

        {data?.items.map((item, index) => {
          const expanded = expandedIds.has(item.id)
          const canExpand = item.text.length > 180 || item.text.includes('\n')
          const presentation = getAppPresentation(item)
          return (
            <article className="activity-row" key={item.id}>
              <div className="activity-index">{String((page - 1) * PAGE_SIZE + index + 1).padStart(3, '0')}</div>
              <time dateTime={item.occurred_at}>{formatTime(item.occurred_at)}</time>
              <div className="activity-app">
                <span className={`activity-app-icon is-${presentation.tone}`}><Icon name={presentation.icon} size={17} weight="bold" /></span>
                <div><strong>{item.app_name}</strong><span title={item.bundle_id}>{item.bundle_id}</span></div>
              </div>
              <div className={expanded ? 'activity-text is-expanded' : 'activity-text'}>
                <p>{item.text}</p>
                {item.analysis_source && <div className="activity-analysis-meta">
                  <span className={`is-${item.analysis_source}`}>{SOURCE_LABELS[item.analysis_source] || item.analysis_source}</span>
                  <span>{CATEGORY_LABELS[item.analysis_category] || item.analysis_category}</span>
                  <span>动作 {ACTION_LABELS[item.analysis_action] || item.analysis_action}</span>
                </div>}
                {canExpand && <button type="button" onClick={() => toggleExpanded(item.id)}>{expanded ? '收起' : '展开全文'}</button>}
              </div>
              <button className="activity-delete" type="button" aria-label={`删除 ${item.app_name} 的记录`} onClick={() => deleteEvent(item)} disabled={deletingId === item.id}>
                <Icon name={deletingId === item.id ? 'loading' : 'trash'} size={16} />
              </button>
            </article>
          )
        })}

        {data && data.total > 0 && <footer className="activity-pagination">
          <button type="button" onClick={() => setPage((current) => current - 1)} disabled={page <= 1 || loading}><Icon name="previous" size={15} />上一页</button>
          <span>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, data.total)} / {data.total}</span>
          <button type="button" onClick={() => setPage((current) => current + 1)} disabled={page >= totalPages || loading}>下一页<Icon name="next" size={15} /></button>
        </footer>}
      </section>}

      {activityView === 'hourly' && <section className={hourlyLoading ? 'hourly-summary-list is-loading' : 'hourly-summary-list'} aria-busy={hourlyLoading}>
        <header>
          <div><h2>每小时工作总结</h2><p>按时间倒序回顾已完成、进行中、阻塞与下一步</p></div>
          <div className="hourly-summary-overview">
            <span><strong>{hourlyStats.generated}</strong>份总结</span>
            <span><strong>{hourlyStats.inputs.toLocaleString('zh-CN')}</strong>条有效输入</span>
          </div>
        </header>
        {hourlyError && <div className="activity-error" role="alert"><span>{hourlyError}</span><button type="button" onClick={() => loadHourlySummaries()}>重试</button></div>}
        {!hourlyLoading && !hourlyError && !hourlySummaries.length && <div className="activity-state">暂时没有小时总结</div>}
        <div className="hourly-summary-timeline">
          {hourlySummaries.map((item) => {
            const sections = [
              { title: '已完成', values: item.completed, icon: 'success', tone: 'green' },
              { title: '进行中', values: item.in_progress, icon: 'loading', tone: 'blue' },
              { title: '阻塞 / 风险', values: item.blockers, icon: 'finish', tone: 'orange' },
              { title: '下一步', values: item.next_steps, icon: 'flow', tone: 'cyan' },
            ].filter((section) => section.values.length)
            return <article className="hourly-summary-card" key={item.id}>
              <span className="hourly-summary-marker" aria-hidden="true" />
              <div className="hourly-summary-time"><time dateTime={item.period_start}>{formatHourRange(item.period_start, item.period_end)}</time><span>{item.event_count} 条有效输入</span></div>
              <div className={`hourly-summary-status is-${item.status}`}>{item.status === 'generated' ? '已生成' : '内容不足'}</div>
              {sections.length ? <div className="hourly-summary-content">{sections.map((section) => <section className={`is-${section.tone}`} key={section.title}><h3><Icon name={section.icon} size={14} weight="bold" />{section.title}</h3><ul>{section.values.map((value) => <li key={value}>{value}</li>)}</ul></section>)}</div> : <p className="hourly-summary-insufficient">这一小时没有足够内容生成工作总结。</p>}
            </article>
          })}
        </div>
      </section>}
        </div>
      </section>
    </main>
  )
}

export default ActivityEventsPage
