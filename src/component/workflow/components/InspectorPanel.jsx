import { useState } from 'react'
import Icon from '../../../shared/ui/Icon.jsx'

const CONDITION_OPERATORS = [
  ['truthy', '为真'], ['falsy', '为假'], ['equals', '等于'], ['not_equals', '不等于'],
  ['greater_than', '大于'], ['greater_than_or_equal', '大于等于'], ['less_than', '小于'],
  ['less_than_or_equal', '小于等于'], ['contains', '包含'], ['exists', '存在'], ['not_exists', '不存在'],
]
const VALUE_OPERATORS = new Set(['equals', 'not_equals', 'greater_than', 'greater_than_or_equal', 'less_than', 'less_than_or_equal', 'contains'])

const formatValue = (value) => typeof value === 'string' ? value : JSON.stringify(value ?? '')
const parseValue = (value) => {
  const trimmed = value.trim()
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed)
  if (trimmed === 'true') return true
  if (trimmed === 'false') return false
  if (trimmed === 'null') return null
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) { try { return JSON.parse(trimmed) } catch { return value } }
  return value
}

function EdgeInspector({ edge, nodes, onUpdateEdge, onRemoveEdge }) {
  const source = nodes.find((node) => node.id === edge.source_node_id)
  const target = nodes.find((node) => node.id === edge.target_node_id)
  const condition = edge.condition
  const updateCondition = (changes) => onUpdateEdge({ condition: { path: '', operator: 'truthy', value: null, ...condition, ...changes } })
  return <aside className="v2-inspector edge-inspector"><header><div><h2>连线属性</h2><small>连接关系与分支条件</small></div><button className="inspector-delete" type="button" aria-label="删除连线" onClick={() => onRemoveEdge(edge.id)}><Icon name="trash" size={16} /></button></header>
    <div className="edge-route-card"><span><Icon name="edge" size={17} /></span><div><small>来源</small><strong>{source?.name || edge.source_node_id}</strong><code>{edge.source_port}</code></div><Icon name="next" size={14} /><div><small>目标</small><strong>{target?.name || edge.target_node_id}</strong><code>{edge.target_port}</code></div></div>
    <section className="edge-condition-editor"><div className="edge-condition-heading"><div><h3>分支条件</h3><p>条件成立时，数据才会进入目标节点。</p></div><select aria-label="条件模式" value={condition ? 'conditional' : 'always'} onChange={(event) => onUpdateEdge({ condition: event.target.value === 'always' ? null : { path: '', operator: 'truthy', value: null } })}><option value="always">始终执行</option><option value="conditional">满足条件</option></select></div>
      {condition && <div className="edge-condition-fields"><label>字段路径<input value={condition.path || ''} placeholder="例如 approved 或 result.score" onChange={(event) => updateCondition({ path: event.target.value })} /></label><label>判断方式<select value={condition.operator} onChange={(event) => updateCondition({ operator: event.target.value })}>{CONDITION_OPERATORS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>{VALUE_OPERATORS.has(condition.operator) && <label>比较值<input value={formatValue(condition.value)} placeholder="支持文本、数字、true、JSON" onChange={(event) => updateCondition({ value: parseValue(event.target.value) })} /></label>}<p className="condition-help"><Icon name="success" size={13} />字段路径从来源端口的输出数据开始，支持点号访问嵌套字段。</p></div>}
    </section>
    <section className="edge-reconnect-help"><Icon name="edge" size={16} /><div><strong>拖动改接</strong><p>直接拖动线的前半段或后半段，可分别改接来源或目标；也可以拖动两端圆点。</p></div></section>
    <button className="danger-action" type="button" onClick={() => onRemoveEdge(edge.id)}><Icon name="trash" size={15} />删除这条连线</button>
  </aside>
}

function InspectorPanel({ node, selectedEdge, nodes, versions, edges, onUpdate, onRemove, onSelectEdge, onUpdateEdge, onRemoveEdge }) {
  const [view, setView] = useState('instance')
  if (selectedEdge) return <EdgeInspector edge={selectedEdge} nodes={nodes} onUpdateEdge={onUpdateEdge} onRemoveEdge={onRemoveEdge} />
  if (!node) return <aside className="v2-inspector"><header><div><h2>节点属性</h2><small>选择画布中的节点</small></div></header><p className="empty-selection">选择节点后，可在这里配置实例参数与端口连接。</p></aside>
  const schema = node.component?.config_schema?.properties || {}
  return (
    <aside className="v2-inspector"><header><div><h2>节点属性</h2><small>实例与固定组件版本</small></div><button className="inspector-delete" type="button" aria-label="删除节点" onClick={onRemove}><Icon name="trash" size={16} /></button></header>
      <nav className="inspector-tabs" aria-label="属性面板"><button className={view === 'instance' ? 'is-active' : ''} type="button" onClick={() => setView('instance')}>实例配置</button><button className={view === 'definition' ? 'is-active' : ''} type="button" onClick={() => setView('definition')}>组件定义</button><button className={view === 'source' ? 'is-active' : ''} type="button" onClick={() => setView('source')}>源码</button></nav>
      <div className="instance-version"><span className="instance-version-icon"><Icon name={node.component?.icon || 'tool'} size={18} weight="fill" /></span><div><small>固定组件版本</small><strong>{node.component?.component_key}</strong><code>V{node.component?.version_number} · {node.component_version_id}</code></div></div>
      {view === 'instance' && <div className="inspector-view">
      <label>组件版本<select value={node.component_version_id} onChange={(event) => {
        const component = versions.find((item) => item.id === event.target.value)
        onUpdate({ component_version_id: component.id, component })
      }}>{versions.filter((item) => item.component_key === node.component?.component_key).map((item) => <option key={item.id} value={item.id}>V{item.version_number} · {item.implementation_digest.slice(0, 18)}</option>)}</select></label>
      <label>实例名称<input value={node.name} onChange={(event) => onUpdate({ name: event.target.value })} /></label>
      {Object.entries(schema).map(([key, definition]) => <label key={key}>{definition.title || key}<input type={['integer', 'number'].includes(definition.type) ? 'number' : 'text'} value={node.config?.[key] ?? definition.default ?? ''} onChange={(event) => onUpdate({ config: { ...node.config, [key]: ['integer', 'number'].includes(definition.type) ? Number(event.target.value) : event.target.value } })} /></label>)}
      <section className="inspector-ports"><h3>类型化端口</h3>{node.component?.input_ports.map((port) => <div key={`in-${port.key}`}><span className="port-mark in" />输入 · {port.name}<code>{port.key} / {port.schema.type}</code></div>)}{node.component?.output_ports.map((port) => <div key={`out-${port.key}`}><span className="port-mark out" />输出 · {port.name}<code>{port.key} / {port.schema.type}</code></div>)}</section>
      <section className="instance-edges"><h3>相关连线</h3>{edges.map((edge) => <button type="button" key={edge.id} onClick={() => onSelectEdge(edge.id)}>{edge.source_port} → {edge.target_port}<small>{edge.condition ? '有条件' : '选择'}</small></button>)}</section>
      <button className="danger-action" type="button" onClick={onRemove}><Icon name="trash" size={15} />删除节点实例</button>
      </div>}
      {view === 'definition' && <div className="inspector-view component-definition-view">
        <dl><div><dt>组件名称</dt><dd>{node.component?.component_name || node.component?.component_key}</dd></div><div><dt>图标</dt><dd className="definition-icon-value"><Icon name={node.component?.icon || 'tool'} size={16} weight="fill" />{node.component?.icon || 'tool'}</dd></div><div><dt>分类</dt><dd>{node.component?.category || '未分类'}</dd></div><div><dt>实现标识</dt><dd><code>{node.component?.implementation_key}</code></dd></div><div><dt>实现摘要</dt><dd><code>{node.component?.implementation_digest}</code></dd></div><div><dt>执行器协议</dt><dd>V{node.component?.executor_contract_version}</dd></div><div><dt>发布时间</dt><dd>{node.component?.published_at ? new Date(node.component.published_at).toLocaleString() : '—'}</dd></div></dl>
        {node.component?.component_description && <section><h3>说明</h3><p>{node.component.component_description}</p></section>}
        <section><h3>参数 Schema</h3><pre><code>{JSON.stringify(node.component?.config_schema || {}, null, 2)}</code></pre></section>
        <section><h3>UI Schema</h3><pre><code>{JSON.stringify(node.component?.ui_schema || {}, null, 2)}</code></pre></section>
        <section className="inspector-ports"><h3>类型化端口</h3>{node.component?.input_ports.map((port) => <div key={`definition-in-${port.key}`}><span className="port-mark in" />输入 · {port.name}<code>{port.key} / {port.schema.type}</code></div>)}{node.component?.output_ports.map((port) => <div key={`definition-out-${port.key}`}><span className="port-mark out" />输出 · {port.name}<code>{port.key} / {port.schema.type}</code></div>)}</section>
      </div>}
      {view === 'source' && <div className="inspector-view component-source-view">
        <div className="source-heading"><div><strong>{node.component?.source_path || node.component?.implementation_key}</strong><small>{node.component?.source_language || 'text'} · 版本源码快照</small></div><span>只读</span></div>
        {node.component?.implementation_source ? <pre><code>{node.component.implementation_source}</code></pre> : <div className="source-empty">该历史版本尚未保存源码快照。重新启动后端会为内置组件补齐；后续发布版本会在发布时自动固化源码。</div>}
      </div>}
    </aside>
  )
}
export default InspectorPanel
