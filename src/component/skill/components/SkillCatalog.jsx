import { useState } from 'react'
import Icon from '../../../shared/ui/Icon.jsx'

function SkillCatalog({ items, selectedId, filters, onFiltersChange, onSelect, onCreate }) {
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ id: '', name: '', description: '' })

  const submit = async (event) => {
    event.preventDefault()
    await onCreate(form)
    setForm({ id: '', name: '', description: '' })
    setCreating(false)
  }

  return (
    <aside className="skill-catalog">
      <div className="skill-pane-heading">
        <div><span>01</span><strong>技能目录</strong></div>
        <button className="icon-button" type="button" title="新建技能" onClick={() => setCreating((value) => !value)}>
          <Icon name={creating ? 'close' : 'plus'} size={16} weight="bold" />
        </button>
      </div>

      <div className="skill-search">
        <Icon name="search" size={15} />
        <input value={filters.query} placeholder="搜索名称或 ID" onChange={(event) => onFiltersChange({ ...filters, query: event.target.value })} />
      </div>
      <div className="skill-filters">
        <select value={filters.source} onChange={(event) => onFiltersChange({ ...filters, source: event.target.value })}>
          <option value="">全部来源</option>
          <option value="managed">自定义</option>
          <option value="builtin">内置</option>
        </select>
        <select value={filters.status} onChange={(event) => onFiltersChange({ ...filters, status: event.target.value })}>
          <option value="">全部状态</option>
          <option value="draft">草稿</option>
          <option value="published">已发布</option>
          <option value="archived">已归档</option>
        </select>
      </div>

      {creating && (
        <form className="skill-create-form" onSubmit={submit}>
          <strong>新建自定义技能</strong>
          <label>ID<input required pattern="[a-z][a-z0-9-]*" placeholder="release-notes" value={form.id} onChange={(event) => setForm({ ...form, id: event.target.value })} /></label>
          <label>名称<input required placeholder="发布说明助手" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label>描述<textarea required rows="2" placeholder="说明这个技能解决什么问题" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
          <button className="skill-button primary" type="submit">创建草稿</button>
        </form>
      )}

      <div className="skill-catalog-list">
        {items.map((item) => (
          <button className={`skill-catalog-item ${selectedId === item.id ? 'is-active' : ''}`} key={item.id} type="button" onClick={() => onSelect(item.id)}>
            <div><strong>{item.name}</strong><span className={`skill-source ${item.source}`}>{item.source === 'builtin' ? '内置' : '自定义'}</span></div>
            <p>{item.description}</p>
            <footer>
              <span className={`skill-dot ${item.enabled ? 'enabled' : ''}`} />
              <span>{item.active_version ? `v${item.active_version}` : '未发布'}</span>
              {item.has_unpublished_changes && <em>有新草稿</em>}
            </footer>
          </button>
        ))}
        {!items.length && <div className="skill-empty-list">没有符合条件的技能</div>}
      </div>
    </aside>
  )
}

export default SkillCatalog
