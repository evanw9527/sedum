import Icon from '../../../shared/ui/Icon.jsx'

function NodeLibrary({ open, search, items, onSearch, onAdd, onDragStart }) {
  const groups = items.reduce((result, item) => {
    const group = result.find(([category]) => category === item.category)
    if (group) group[1].push(item)
    else result.push([item.category, [item]])
    return result
  }, [])

  return (
    <aside className={`side-panel library-panel ${open ? 'is-open' : ''}`}>
      <div className="side-panel-heading panel-heading">
        <div><h2>添加节点</h2></div>
        <span className="panel-count">{items.length} 个组件</span>
      </div>
      <label className="side-panel-primary search-box">
        <Icon name="search" size={22} />
        <input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="搜索节点" />
      </label>
      <div className="side-panel-list node-library" aria-live="polite">
        {groups.map(([category, groupItems]) => (
          <section className="library-group" key={category}>
            <h3 className="side-panel-section-label">{category}</h3>
            {groupItems.map((item) => (
              <button
                className="side-panel-item library-item"
                key={item.kind}
                type="button"
                title={`点击或拖拽添加${item.title}`}
                draggable="true"
                onClick={() => onAdd(item)}
                onDragStart={(event) => onDragStart(event, item)}
              >
                <span className={`library-icon is-${item.kind}`}><Icon name={item.kind} size={23} weight="bold" /></span>
                <span className="library-copy"><strong>{item.title}</strong><small>{item.description}</small></span>
                <Icon name="plus" size={17} />
              </button>
            ))}
          </section>
        ))}
        {groups.length === 0 && <p className="library-empty">没有匹配的节点</p>}
      </div>
      <p className="library-help">点击直接添加，或拖到画布中的指定位置。</p>
    </aside>
  )
}

export default NodeLibrary
