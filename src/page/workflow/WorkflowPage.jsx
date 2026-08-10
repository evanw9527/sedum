import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from '../../shared/ui/Icon.jsx'
import '../../styles/workflow.css'
import InspectorPanel from '../../component/workflow/components/InspectorPanel.jsx'
import NodeLibrary from '../../component/workflow/components/NodeLibrary.jsx'
import WorkflowActions from '../../component/workflow/components/WorkflowActions.jsx'
import { INITIAL_EDGES, INITIAL_NODES, KIND_LABELS, NODE_LIBRARY } from '../../component/workflow/workflow.data.js'
import { edgePath } from '../../component/workflow/workflow.utils.js'

function WorkflowPage() {
  const [nodes, setNodes] = useState(INITIAL_NODES)
  const [edges, setEdges] = useState(INITIAL_EDGES)
  const [selected, setSelected] = useState({ type: 'node', id: 'condition' })
  const [zoom, setZoom] = useState(() => window.innerWidth <= 760 ? .66 : window.innerWidth <= 1100 ? .85 : 1)
  const [saved, setSaved] = useState(true)
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)
  const [dragging, setDragging] = useState(null)
  const [search, setSearch] = useState('')
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [inspectorOpen, setInspectorOpen] = useState(false)
  const [connection, setConnection] = useState(null)
  const [libraryDragOver, setLibraryDragOver] = useState(false)
  const canvasRef = useRef(null)
  const flowStageRef = useRef(null)
  const zoomRef = useRef(zoom)

  const selectedNode = selected.type === 'node' ? nodes.find((node) => node.id === selected.id) : null
  const selectedEdge = selected.type === 'edge' ? edges.find((edge) => edge.id === selected.id) : null
  const visibleLibrary = NODE_LIBRARY.filter((item) =>
    item.title.toLowerCase().includes(search.toLowerCase()),
  )

  const nodeMap = useMemo(
    () => Object.fromEntries(nodes.map((node) => [node.id, node])),
    [nodes],
  )

  useEffect(() => {
    zoomRef.current = zoom
  }, [zoom])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const handleWheel = (event) => {
      if (!event.ctrlKey && !event.metaKey) return
      event.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const pointerX = event.clientX - rect.left + canvas.scrollLeft
      const pointerY = event.clientY - rect.top + canvas.scrollTop
      const currentZoom = zoomRef.current
      const nextZoom = Math.min(1.5, Math.max(.5, currentZoom - event.deltaY * .002))
      const ratio = nextZoom / currentZoom

      zoomRef.current = nextZoom
      setZoom(nextZoom)
      requestAnimationFrame(() => {
        canvas.scrollLeft = pointerX * ratio - (event.clientX - rect.left)
        canvas.scrollTop = pointerY * ratio - (event.clientY - rect.top)
      })
    }

    canvas.addEventListener('wheel', handleWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', handleWheel)
  }, [])

  const updateNode = (id, changes) => {
    setNodes((current) => current.map((node) => node.id === id ? { ...node, ...changes } : node))
    setSaved(false)
  }

  const updateEdge = (id, changes) => {
    setEdges((current) => current.map((edge) => edge.id === id ? { ...edge, ...changes } : edge))
    setSaved(false)
  }

  const saveWorkflow = () => {
    if (saved || saving) return
    setSaving(true)
    window.setTimeout(() => {
      setSaved(true)
      setSaving(false)
    }, 650)
  }

  const addNode = (item, position) => {
    const id = `${item.kind}-${Date.now()}`
    const count = nodes.length
    const node = {
      id,
      kind: item.kind,
      title: item.title,
      description: item.description,
      x: position?.x ?? 150 + (count % 3) * 250,
      y: position?.y ?? 500 + Math.floor(count / 3) * 130,
    }
    setNodes((current) => [...current, node])
    setSelected({ type: 'node', id })
    setInspectorOpen(true)
    setLibraryOpen(false)
    setSaved(false)
  }

  const startLibraryDrag = (event, item) => {
    event.dataTransfer.effectAllowed = 'copy'
    event.dataTransfer.setData('application/x-sedum-node', JSON.stringify(item))
    event.dataTransfer.setData('text/plain', item.kind)
  }

  const dropLibraryNode = (event) => {
    event.preventDefault()
    setLibraryDragOver(false)
    if (!flowStageRef.current) return

    const serialized = event.dataTransfer.getData('application/x-sedum-node')
    const item = serialized
      ? JSON.parse(serialized)
      : NODE_LIBRARY.find((candidate) => candidate.kind === event.dataTransfer.getData('text/plain'))
    if (!item) return

    const stageRect = flowStageRef.current.getBoundingClientRect()
    addNode(item, {
      x: Math.max(24, (event.clientX - stageRect.left) / zoomRef.current - 110),
      y: Math.max(72, (event.clientY - stageRect.top) / zoomRef.current - 48),
    })
  }

  const removeSelected = () => {
    if (selectedEdge) {
      setEdges((current) => current.filter((edge) => edge.id !== selectedEdge.id))
      setSelected({ type: 'node', id: 'condition' })
      setSaved(false)
      return
    }
    if (!selectedNode || selectedNode.kind === 'trigger') return
    setNodes((current) => current.filter((node) => node.id !== selectedNode.id))
    setEdges((current) => current.filter((edge) => edge.from !== selectedNode.id && edge.to !== selectedNode.id))
    setSelected({ type: 'node', id: 'trigger' })
    setSaved(false)
  }

  const beginDrag = (event, node) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    setSelected({ type: 'node', id: node.id })
    setDragging({ id: node.id, pointerX: event.clientX, pointerY: event.clientY, x: node.x, y: node.y })
  }

  const moveNode = (event) => {
    if (!dragging) return
    const x = Math.max(24, dragging.x + (event.clientX - dragging.pointerX) / zoom)
    const y = Math.max(72, dragging.y + (event.clientY - dragging.pointerY) / zoom)
    setNodes((current) => current.map((node) => node.id === dragging.id ? { ...node, x, y } : node))
    setSaved(false)
  }

  const startConnection = (event, node) => {
    event.preventDefault()
    event.stopPropagation()
    setConnection({ from: node.id, x: node.x + 220, y: node.y + 48 })
    setSelected({ type: 'node', id: node.id })
  }

  const moveConnection = (event) => {
    if (!connection || !flowStageRef.current) return
    const rect = flowStageRef.current.getBoundingClientRect()
    setConnection((current) => current ? {
      ...current,
      x: (event.clientX - rect.left) / zoomRef.current,
      y: (event.clientY - rect.top) / zoomRef.current,
    } : null)
  }

  const finishConnection = (event, targetNode) => {
    event.preventDefault()
    event.stopPropagation()
    if (!connection || connection.from === targetNode.id) return

    const existingEdge = edges.find((edge) => edge.from === connection.from && edge.to === targetNode.id)
    if (existingEdge) {
      setConnection(null)
      return
    }

    const sourceNode = nodeMap[connection.from]
    const isDecision = sourceNode?.kind === 'condition' || sourceNode?.kind === 'classifier'
    const newEdge = {
      id: `edge-${connection.from}-${targetNode.id}-${Date.now()}`,
      from: connection.from,
      to: targetNode.id,
      label: isDecision ? '新条件' : '继续',
      ruleType: isDecision ? 'condition' : 'always',
      field: '',
      operator: 'equals',
      value: '',
    }

    setEdges((current) => [...current, newEdge])
    setConnection(null)
    setSaved(false)
  }

  return (
    <div className="app-shell">
      <main className="workspace">
        <NodeLibrary open={libraryOpen} search={search} items={visibleLibrary} onSearch={setSearch} onAdd={addNode} onDragStart={startLibraryDrag} />

        <section
          ref={canvasRef}
          className={`canvas-panel ${libraryDragOver ? 'is-drop-target' : ''}`}
          aria-label="流程画布"
          onDragOver={(event) => {
            event.preventDefault()
            event.dataTransfer.dropEffect = 'copy'
            setLibraryDragOver(true)
          }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setLibraryDragOver(false)
          }}
          onDrop={dropLibraryNode}
        >
          <div className="canvas-meta">
            <div><span className="folio">02</span><h1>未命名流程</h1></div>
            {connection
              ? <p>选择目标节点的左侧端口完成连线</p>
              : <WorkflowActions saved={saved} saving={saving} running={running} onSave={saveWorkflow} onToggleRun={() => setRunning((value) => !value)} />}
          </div>

          <div className="canvas-toolbar" aria-label="画布工具">
            <button type="button" onClick={() => setZoom((value) => Math.max(.5, value - .1))} aria-label="缩小"><Icon name="zoomOut" /></button>
            <span>{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => setZoom((value) => Math.min(1.5, value + .1))} aria-label="放大"><Icon name="zoomIn" /></button>
            <button type="button" onClick={() => setZoom(1)} aria-label="恢复实际大小"><Icon name="fit" /></button>
          </div>

          {connection && (
            <div className="connection-mode" role="status">
              <span><Icon name="edge" size={15} />正在连线</span>
              <strong>{nodeMap[connection.from]?.title}</strong>
              <button type="button" onClick={() => setConnection(null)}>取消</button>
            </div>
          )}

          <div ref={flowStageRef} className={`flow-stage ${running ? 'is-running' : ''} ${connection ? 'is-connecting' : ''}`} style={{ transform: `scale(${zoom})` }} onPointerMove={moveConnection}>
            <svg className="connections" width="1120" height="720" aria-label="流程连线">
              <defs>
                <marker id="flow-arrow" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="12" markerHeight="12" orient="auto" markerUnits="userSpaceOnUse">
                  <path className="arrow-default" d="M 1 1 L 11 6 L 1 11 Z" />
                </marker>
                <marker id="flow-arrow-active" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="12" markerHeight="12" orient="auto" markerUnits="userSpaceOnUse">
                  <path className="arrow-active" d="M 1 1 L 11 6 L 1 11 Z" />
                </marker>
              </defs>
              {connection && nodeMap[connection.from] && (
                <path className="connection-preview" markerEnd="url(#flow-arrow-active)" d={`M ${nodeMap[connection.from].x + 220} ${nodeMap[connection.from].y + 48} C ${nodeMap[connection.from].x + 290} ${nodeMap[connection.from].y + 48}, ${connection.x - 70} ${connection.y}, ${connection.x} ${connection.y}`} />
              )}
              {edges.map((edge) => {
                const from = nodeMap[edge.from]
                const to = nodeMap[edge.to]
                if (!from || !to) return null
                const labelX = (from.x + 220 + to.x) / 2
                const labelY = (from.y + to.y) / 2 + 36
                const isSelected = selected.type === 'edge' && selected.id === edge.id
                const selectEdge = () => {
                  setSelected({ type: 'edge', id: edge.id })
                  setInspectorOpen(true)
                }
                return (
                  <g key={edge.id} className={`edge-group ${isSelected ? 'is-selected' : ''}`}>
                    <path className="connection-underlay" d={edgePath(from, to)} />
                    <path className="connection-line" markerEnd={isSelected ? 'url(#flow-arrow-active)' : 'url(#flow-arrow)'} d={edgePath(from, to)} />
                    <path className="connection-hit" d={edgePath(from, to)} onClick={selectEdge} />
                    <g className="factor-badge" transform={`translate(${labelX - 28} ${labelY - 17})`} role="button" tabIndex="0" aria-label={`配置决策因子：${edge.label}`} onClick={selectEdge} onKeyDown={(event) => event.key === 'Enter' && selectEdge()}>
                      <rect width="56" height="24" />
                      <text x="28" y="15" textAnchor="middle">{edge.label}</text>
                    </g>
                  </g>
                )
              })}
            </svg>

            {nodes.map((node) => (
              <div
                key={node.id}
                className={`flow-node is-${node.kind} ${selected.type === 'node' && selected.id === node.id ? 'is-selected' : ''}`}
                style={{ left: node.x, top: node.y }}
                onPointerDown={(event) => beginDrag(event, node)}
                onPointerMove={moveNode}
                onPointerUp={() => setDragging(null)}
                onPointerCancel={() => setDragging(null)}
                onClick={() => {
                  setSelected({ type: 'node', id: node.id })
                  setInspectorOpen(true)
                }}
                role="button"
                tabIndex="0"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    setSelected({ type: 'node', id: node.id })
                    setInspectorOpen(true)
                  }
                }}
              >
                <span className="node-icon"><Icon name={node.kind} size={20} weight="bold" /></span>
                <span className="node-copy"><small>{KIND_LABELS[node.kind]}</small><strong>{node.title}</strong><em>{node.description}</em></span>
                <button className="port port-in" type="button" aria-label={`连接到${node.title}`} onPointerDown={(event) => event.stopPropagation()} onPointerUp={(event) => finishConnection(event, node)} />
                <button className="port port-out" type="button" aria-label={`从${node.title}开始连线`} onPointerDown={(event) => startConnection(event, node)} />
              </div>
            ))}
          </div>
        </section>

        <InspectorPanel
          open={inspectorOpen}
          selectedNode={selectedNode}
          selectedEdge={selectedEdge}
          nodeMap={nodeMap}
          kindLabels={KIND_LABELS}
          onClose={() => setInspectorOpen(false)}
          onRemove={removeSelected}
          onUpdateNode={updateNode}
          onUpdateEdge={updateEdge}
        />
        {(libraryOpen || inspectorOpen) && <button className="panel-scrim" type="button" aria-label="关闭面板" onClick={() => { setLibraryOpen(false); setInspectorOpen(false) }} />}
      </main>
    </div>
  )
}

export default WorkflowPage
