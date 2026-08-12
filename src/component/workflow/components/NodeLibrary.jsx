import Icon from '../../../shared/ui/Icon.jsx'

function NodeLibrary({ search, items, onSearch, onAdd, onDragStart }) {
  const groups = items.reduce((result, item) => {
    const key = item.category || '未分类'
    result[key] = [...(result[key] || []), item]
    return result
  }, {})
  return (
    <aside className="v2-library">
      <header><div><h2>组件库</h2><small>{items.length} 个可用版本</small></div></header>
      <label className="v2-library-search"><Icon name="search" size={16} /><input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="搜索组件" aria-label="搜索组件" /></label>
      <div className="v2-library-list">
        {Object.entries(groups).map(([category, group]) => <section key={category}><h3>{category}</h3>{group.map((item) => <button type="button" key={item.id} draggable onDragStart={(event) => onDragStart(event, item)} onClick={() => onAdd(item)}><span className="library-version-icon"><Icon name={item.icon || 'tool'} size={18} weight="fill" /></span><span className="library-version-copy"><strong>{item.component_key}</strong><small>{item.input_ports.length} 个输入 · {item.output_ports.length} 个输出</small></span><em>V{item.version_number}</em><Icon name="plus" size={14} /></button>)}</section>)}
      </div><p>点击或拖拽到画布添加。组件版本发布后不可变。</p>
    </aside>
  )
}
export default NodeLibrary
