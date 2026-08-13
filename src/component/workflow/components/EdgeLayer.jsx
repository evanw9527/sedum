import Icon from '../../../shared/ui/Icon.jsx'

const OPERATOR_LABELS = {
  equals: '等于', not_equals: '不等于', greater_than: '大于', greater_than_or_equal: '大于等于',
  less_than: '小于', less_than_or_equal: '小于等于', contains: '包含', truthy: '为真', falsy: '为假',
  exists: '存在', not_exists: '不存在',
}

function portPoint(node, portKey, direction) {
  const ports = direction === 'output' ? node.component?.output_ports : node.component?.input_ports
  const index = Math.max(0, ports?.findIndex((port) => port.key === portKey) ?? 0)
  return { x: node.x + (direction === 'output' ? 220 : 0), y: node.y + 78 + index * 20 }
}

function curvePath(source, target) {
  const bend = Math.max(54, Math.abs(target.x - source.x) * .42)
  return `M ${source.x} ${source.y} C ${source.x + bend} ${source.y}, ${target.x - bend} ${target.y}, ${target.x} ${target.y}`
}

function conditionLabel(condition) {
  if (!condition) return ''
  const subject = condition.path || '输出值'
  const operator = OPERATOR_LABELS[condition.operator] || condition.operator
  if (['truthy', 'falsy', 'exists', 'not_exists'].includes(condition.operator)) return `${subject} ${operator}`
  const value = typeof condition.value === 'string' ? condition.value : JSON.stringify(condition.value)
  return `${subject} ${operator} ${value}`
}

function nearestEnd(event, source, target) {
  const svg = event.currentTarget.ownerSVGElement
  const rect = svg.getBoundingClientRect()
  const scaleX = rect.width / 1600
  const scaleY = rect.height / 1000
  const distanceTo = (point) => Math.hypot(
    event.clientX - (rect.left + point.x * scaleX),
    event.clientY - (rect.top + point.y * scaleY),
  )
  return distanceTo(source) <= distanceTo(target) ? 'source' : 'target'
}

function EdgeLayer({ nodes, edges, selectedEdgeId, pendingPort, reconnecting, onSelect, onReconnectStart }) {
  return (
    <svg className="v2-edges">
      <defs>
        <marker id="v2-arrow" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="9" markerHeight="9" orient="auto"><path d="M 1 1 L 11 6 L 1 11 Z" /></marker>
        <marker id="v2-arrow-selected" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="10" markerHeight="10" orient="auto"><path d="M 1 1 L 11 6 L 1 11 Z" /></marker>
      </defs>
      {edges.map((edge) => {
        const sourceNode = nodes.find((node) => node.id === edge.source_node_id)
        const targetNode = nodes.find((node) => node.id === edge.target_node_id)
        if (!sourceNode || !targetNode) return null
        let source = portPoint(sourceNode, edge.source_port, 'output')
        let target = portPoint(targetNode, edge.target_port, 'input')
        if (reconnecting?.edgeId === edge.id && reconnecting.cursor) {
          if (reconnecting.end === 'source') source = reconnecting.cursor
          else target = reconnecting.cursor
        }
        const path = curvePath(source, target)
        const selected = edge.id === selectedEdgeId
        const center = { x: (source.x + target.x) / 2, y: (source.y + target.y) / 2 }
        const label = conditionLabel(edge.condition)
        const startReconnect = (event, end) => {
          event.currentTarget.setPointerCapture?.(event.pointerId)
          onReconnectStart(event, edge, end)
        }
        return <g className={`v2-edge ${selected ? 'is-selected' : ''} ${edge.condition ? 'has-condition' : ''}`} key={edge.id}>
          <path className="edge-line" markerEnd={selected ? 'url(#v2-arrow-selected)' : 'url(#v2-arrow)'} d={path} />
          <path className="edge-hit" d={path}
            onClick={(event) => { event.stopPropagation(); onSelect(edge.id) }}
            onPointerDown={(event) => startReconnect(event, nearestEnd(event, source, target))}>
            <title>拖动线的前半段改接来源，拖动后半段改接目标</title>
          </path>
          {label && <foreignObject className="edge-condition-label" x={center.x - 70} y={center.y - 28} width="140" height="24"><button type="button" title={label} onClick={(event) => { event.stopPropagation(); onSelect(edge.id) }}><Icon name="condition" size={12} weight="fill" /><span>{label}</span></button></foreignObject>}
          {selected && <>
            <circle className="edge-endpoint-hit source" cx={source.x} cy={source.y} r="16" onPointerDown={(event) => startReconnect(event, 'source')}><title>拖动改接来源</title></circle>
            <circle className="edge-endpoint source" cx={source.x} cy={source.y} r="6" />
            <circle className="edge-endpoint-hit target" cx={target.x} cy={target.y} r="16" onPointerDown={(event) => startReconnect(event, 'target')}><title>拖动改接目标</title></circle>
            <circle className="edge-endpoint target" cx={target.x} cy={target.y} r="6" />
          </>}
        </g>
      })}
      {pendingPort?.cursor && (() => { const sourceNode = nodes.find((node) => node.id === pendingPort.nodeId); if (!sourceNode) return null; return <path className="connection-preview" d={curvePath(portPoint(sourceNode, pendingPort.port, 'output'), pendingPort.cursor)} /> })()}
    </svg>
  )
}

export default EdgeLayer
