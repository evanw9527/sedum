import { useCallback, useEffect, useMemo, useState } from 'react'
import { snowGrassApi } from '../../api/snowGrassApi.js'
import Icon from '../../shared/ui/Icon.jsx'
import '../../styles/usage.css'

const PERIODS = [1, 7, 30, 90]

function localDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatTokens(value) {
  const number = Number(value || 0)
  if (number >= 1_000_000_000) return `${(number / 1_000_000_000).toFixed(number >= 10_000_000_000 ? 1 : 2)}B`
  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(number >= 100_000_000 ? 0 : 1)}M`
  if (number >= 1_000) return `${(number / 1_000).toFixed(number >= 100_000 ? 0 : 1)}K`
  return number.toLocaleString('zh-CN')
}

function formatExact(value) {
  return Number(value || 0).toLocaleString('zh-CN')
}

function formatDate(value) {
  return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric' }).format(new Date(`${value}T00:00:00`))
}

function getSourcePresentation(source) {
  if (source.id === 'codex') return { icon: 'agent', tone: 'blue' }
  return { icon: 'flow', tone: 'green' }
}

function DailyChart({ points }) {
  const max = Math.max(...points.map((point) => point.total_tokens), 1)
  return (
    <div className="usage-chart" role="img" aria-label="每日 Token 用量柱状图">
      {points.map((point, index) => (
        <div className="usage-chart-column" key={point.date} title={`${point.date}：${formatExact(point.total_tokens)} Token`}>
          <span className="usage-chart-value">{point.total_tokens ? formatTokens(point.total_tokens) : ''}</span>
          <i style={{ height: `${Math.max((point.total_tokens / max) * 100, point.total_tokens ? 3 : 1)}%` }} />
          {(index === 0 || index === points.length - 1 || (points.length > 14 && index === Math.floor(points.length / 2))) && <small>{formatDate(point.date)}</small>}
        </div>
      ))}
    </div>
  )
}

function SourceRow({ source, total }) {
  const ratio = total ? (source.total_tokens / total) * 100 : 0
  const recordLabel = source.id === 'codex' ? '个任务' : '个会话'
  const presentation = getSourcePresentation(source)
  return (
    <div className="usage-source-row">
      <span className={`usage-source-icon is-${presentation.tone}`}><Icon name={presentation.icon} size={18} weight="bold" /></span>
      <div><strong>{source.name}</strong><span>{source.available ? `${source.sessions} ${recordLabel}` : '未找到本地数据'}</span></div>
      <div className="usage-source-value" title={`${formatExact(source.total_tokens)} Token`}>{formatTokens(source.total_tokens)}<span>{ratio.toFixed(1)}%</span></div>
      <div className="usage-source-track"><i style={{ width: `${ratio}%` }} /></div>
    </div>
  )
}

function TokenUsagePage() {
  const [period, setPeriod] = useState(90)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadUsage = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await snowGrassApi.localUsage(period))
    } catch (loadError) {
      setError(loadError.message || '用量数据加载失败')
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => { loadUsage() }, [loadUsage])

  const chartPoints = useMemo(() => {
    if (!data) return []
    const values = new Map(data.daily.map((point) => [point.date, point.total_tokens]))
    return Array.from({ length: period }, (_, offset) => {
      const date = new Date()
      date.setHours(0, 0, 0, 0)
      date.setDate(date.getDate() - (period - offset - 1))
      const key = localDateKey(date)
      return { date: key, total_tokens: values.get(key) || 0 }
    })
  }, [data, period])

  const peak = chartPoints.reduce((best, point) => point.total_tokens > best.total_tokens ? point : best, { date: '', total_tokens: 0 })
  const average = data ? Math.round(data.total_tokens / period) : 0

  return (
    <main className="usage-page">
      <aside className="usage-sidebar side-panel">
        <header className="side-panel-heading usage-sidebar-heading"><div><strong>用量</strong><span>本地统计</span></div></header>
        <section className="usage-period-section">
          <header><Icon name="history" size={14} /><strong>统计周期</strong></header>
          <div className="usage-period" aria-label="统计周期">
            {PERIODS.map((days) => <button className={period === days ? 'is-active' : ''} key={days} type="button" onClick={() => setPeriod(days)}><span>{days}</span><small>天</small></button>)}
          </div>
        </section>
        {data && <section className="usage-sidebar-sources">
          <header><Icon name="flow" size={14} /><strong>数据来源</strong></header>
          {data.sources.map((source) => {
            const presentation = getSourcePresentation(source)
            return <div className="usage-sidebar-source" key={source.id}>
              <span className={`is-${presentation.tone}`}><Icon name={presentation.icon} size={15} weight="bold" /></span>
              <div><strong>{source.name}</strong><small>{source.available ? `${source.sessions} 条记录` : '暂无数据'}</small></div>
              <b>{formatTokens(source.total_tokens)}</b>
            </div>
          })}
        </section>}
        <p className="usage-local-note"><Icon name="success" size={15} weight="bold" /><span><strong>仅统计本地数据</strong><small>Codex 任务日志与 Snow Grass 模型消息</small></span></p>
      </aside>

      <section className="usage-main">
        <header className="usage-topbar">
          <div><span className="usage-topbar-icon"><Icon name="usage" size={18} weight="bold" /></span><div><h1>Token 用量</h1><p>查看本地 AI 使用趋势、来源和项目分布</p></div></div>
          <button className="usage-refresh" type="button" onClick={loadUsage} disabled={loading}><Icon name={loading ? 'loading' : 'history'} size={16} />刷新</button>
        </header>

        <div className="usage-scroll">

      {error && <div className="usage-error" role="alert"><span>{error}</span><button type="button" onClick={loadUsage}>重试</button></div>}
      {!error && loading && !data && <div className="usage-loading"><Icon name="loading" size={20} />正在读取本地统计…</div>}

      {data && <div className={loading ? 'usage-content is-loading' : 'usage-content'}>
        <section className="usage-meter" aria-labelledby="usage-total-title">
          <div className="usage-total">
            <span id="usage-total-title">近 {period} 天总量</span>
            <strong title={`${formatExact(data.total_tokens)} Token`}>{formatTokens(data.total_tokens)}</strong>
            <small>Token</small>
          </div>
          <div className="usage-summary-stats">
            <div><span className="usage-stat-icon is-green"><Icon name="chats" size={16} weight="bold" /></span><p><span>记录</span><strong>{formatExact(data.sessions)}</strong></p></div>
            <div><span className="usage-stat-icon is-cyan"><Icon name="activity" size={16} weight="bold" /></span><p><span>日均</span><strong title={`${formatExact(average)} Token`}>{formatTokens(average)}</strong></p></div>
            <div><span className="usage-stat-icon is-orange"><Icon name="usage" size={16} weight="bold" /></span><p><span>峰值日</span><strong title={peak.date || undefined}>{peak.total_tokens ? formatTokens(peak.total_tokens) : '—'}</strong></p></div>
          </div>
        </section>

        <section className="usage-grid usage-overview-grid">
          <article className="usage-panel usage-trend-panel">
            <div className="usage-panel-heading"><div><span>按日归集</span><h2>使用趋势</h2></div><p>Codex 与 Snow Grass 按上海自然日归集</p></div>
            <DailyChart points={chartPoints} />
          </article>
          <article className="usage-panel usage-source-panel">
            <div className="usage-panel-heading"><div><span>数据源</span><h2>来源构成</h2></div></div>
            <div className="usage-source-list">
              {data.sources.map((source) => <SourceRow key={source.id} source={source} total={data.total_tokens} />)}
            </div>
          </article>
        </section>

        <section className="usage-grid usage-detail-grid">
          <article className="usage-panel">
            <div className="usage-panel-heading"><div><span>模型</span><h2>模型用量</h2></div></div>
            <div className="usage-table-wrap"><table><thead><tr><th>模型</th><th>来源</th><th>记录</th><th>Token</th></tr></thead><tbody>
              {data.models.length ? data.models.slice(0, 8).map((model) => <tr key={`${model.source}-${model.name}`}><td>{model.name}</td><td>{model.source}</td><td>{formatExact(model.sessions)}</td><td title={formatExact(model.total_tokens)}>{formatTokens(model.total_tokens)}</td></tr>) : <tr><td colSpan="4" className="usage-empty">当前周期暂无模型用量</td></tr>}
            </tbody></table></div>
          </article>
          <article className="usage-panel">
            <div className="usage-panel-heading"><div><span>工作目录</span><h2>项目排行</h2></div></div>
            <div className="usage-project-list">
              {data.projects.length ? data.projects.map((project, index) => <div className="usage-project" key={project.path || project.name}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{project.name}</strong><small title={project.path}>{project.path || '未记录路径'}</small></div><b title={formatExact(project.total_tokens)}>{formatTokens(project.total_tokens)}</b></div>) : <div className="usage-empty">当前周期暂无项目数据</div>}
            </div>
          </article>
        </section>
        <footer className="usage-note">Codex Token 从本机任务日志增量采集，Snow Grass Token 从模型消息记录统计；所有来源统一按上海自然日归集。更新时间：{new Date(data.updated_at).toLocaleString('zh-CN')}</footer>
      </div>}
        </div>
      </section>
    </main>
  )
}

export default TokenUsagePage
