import { useCallback, useEffect, useMemo, useState } from 'react'
import { snowGrassApi } from '../../api/snowGrassApi.js'
import Icon from '../../shared/ui/Icon.jsx'
import '../../styles/usage.css'

const PERIODS = [7, 30, 90]

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
  return (
    <div className="usage-source-row">
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
      <header className="usage-hero">
        <div>
          <p>本地 AI 使用统计</p>
          <h1>Token 用量</h1>
        </div>
        <div className="usage-actions">
          <div className="usage-period" aria-label="统计周期">
            {PERIODS.map((days) => <button className={period === days ? 'is-active' : ''} key={days} type="button" onClick={() => setPeriod(days)}>{days} 天</button>)}
          </div>
          <button className="usage-refresh" type="button" onClick={loadUsage} disabled={loading}><Icon name={loading ? 'loading' : 'history'} size={16} />刷新</button>
        </div>
      </header>

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
            <div><span>记录</span><strong>{formatExact(data.sessions)}</strong></div>
            <div><span>日均</span><strong title={`${formatExact(average)} Token`}>{formatTokens(average)}</strong></div>
            <div><span>峰值日</span><strong title={peak.date || undefined}>{peak.total_tokens ? formatTokens(peak.total_tokens) : '—'}</strong></div>
          </div>
        </section>

        <section className="usage-grid usage-overview-grid">
          <article className="usage-panel usage-trend-panel">
            <div className="usage-panel-heading"><div><span>按日归集</span><h2>使用趋势</h2></div><p>Codex 增量事件按上海自然日归集</p></div>
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
        <footer className="usage-note">Codex Token 从本机任务日志增量采集并持久化，按事件发生时间统计；输入量包含任务上下文的重复计入。更新时间：{new Date(data.updated_at).toLocaleString('zh-CN')}</footer>
      </div>}
    </main>
  )
}

export default TokenUsagePage
