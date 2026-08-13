import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { snowGrassApi } from '../../api/snowGrassApi.js'
import NodeLibrary from '../../component/workflow/components/NodeLibrary.jsx'
import InspectorPanel from '../../component/workflow/components/InspectorPanel.jsx'
import FlowRunDrawer from '../../component/workflow/components/FlowRunDrawer.jsx'
import EdgeLayer from '../../component/workflow/components/EdgeLayer.jsx'
import ExecutionMonitorDrawer from '../../component/workflow/components/ExecutionMonitorDrawer.jsx'
import ExecutionRecordsDrawer from '../../component/workflow/components/ExecutionRecordsDrawer.jsx'
import ExecutionTraceDrawer from '../../component/workflow/components/ExecutionTraceDrawer.jsx'
import Icon from '../../shared/ui/Icon.jsx'
import '../../styles/workflow.css'

const serialize = (nodes, edges) => ({
  nodes: nodes.map(({ component: _component, ...node }) => node), edges,
})
const formatNodeDuration = (value) => value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)} s` : `${value} ms`
const CANVAS_GUTTER = { x: 420, y: 320 }

function WorkflowPage() {
  const { workflowId } = useParams()
  const canvasRef = useRef(null)
  const zoomRef = useRef(1)
  const reconnectingRef = useRef(null)
  const canvasPanRef = useRef(null)
  const [workflow, setWorkflow] = useState(null)
  const [library, setLibrary] = useState([])
  const [flowVersions, setFlowVersions] = useState([])
  const [rollbackVersion, setRollbackVersion] = useState('')
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState(null)
  const [pendingPort, setPendingPort] = useState(null)
  const [reconnecting, setReconnecting] = useState(null)
  const [dragging, setDragging] = useState(null)
  const [canvasPanning, setCanvasPanning] = useState(false)
  const [search, setSearch] = useState('')
  const [dirty, setDirty] = useState(false)
  const [validation, setValidation] = useState(null)
  const [run, setRun] = useState(null)
  const [workflowRuns, setWorkflowRuns] = useState([])
  const [runAggregate, setRunAggregate] = useState({ total: 0, succeeded: 0, failed: 0, node_executions: 0, total_duration_ms: 0 })
  const [recordsAggregate, setRecordsAggregate] = useState({ total: 0, succeeded: 0, failed: 0, node_executions: 0, total_duration_ms: 0 })
  const [workflowNodeStats, setWorkflowNodeStats] = useState([])
  const [recordsPage, setRecordsPage] = useState(1)
  const [recordsFilter, setRecordsFilter] = useState('all')
  const [recordsTotal, setRecordsTotal] = useState(0)
  const [recordsLoading, setRecordsLoading] = useState(false)
  const [runsRefresh, setRunsRefresh] = useState(0)
  const [monitorOpen, setMonitorOpen] = useState(false)
  const [recordsOpen, setRecordsOpen] = useState(false)
  const [traceRun, setTraceRun] = useState(null)
  const [traceLoading, setTraceLoading] = useState(false)
  const [lastPublished, setLastPublished] = useState(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [zoom, setZoom] = useState(1)

  const versions = useMemo(() => Object.fromEntries(library.map((item) => [item.id, item])), [library])
  const selected = nodes.find((node) => node.id === selectedId)
  const selectedEdge = edges.find((edge) => edge.id === selectedEdgeId)
  const canvasStats = useMemo(() => ({
    runs: runAggregate.total,
    successRate: runAggregate.total ? Math.round(runAggregate.succeeded / runAggregate.total * 100) : 0,
    nodeExecutions: runAggregate.node_executions,
    averageDuration: runAggregate.total ? Math.round(runAggregate.total_duration_ms / runAggregate.total) : 0,
  }), [runAggregate])
  const latestTrace = useMemo(() => Object.fromEntries((run?.trace || []).map((trace) => [trace.node_id, trace])), [run])
  const nodeHistory = useMemo(() => {
    return Object.fromEntries(workflowNodeStats.map((item) => [item.node_id, { count: item.execution_count, duration: item.total_duration_ms }]))
  }, [workflowNodeStats])

  useEffect(() => {
    let active = true
    const load = async () => {
      const detail = await snowGrassApi.getWorkflow(workflowId)
      const [componentItems, versionItems] = await Promise.all([
        snowGrassApi.getComponentLibrary(),
        snowGrassApi.listWorkflowVersions(workflowId),
      ])
      if (!active) return
      const map = Object.fromEntries(componentItems.map((item) => [item.id, item]))
      setWorkflow(detail); setLibrary(componentItems)
      setFlowVersions(versionItems); setRollbackVersion(versionItems[0]?.id || '')
      setNodes(detail.graph.nodes.map((node) => ({ ...node, component: map[node.component_version_id] })))
      setEdges(detail.graph.edges); setValidation(detail.validation)
      setSelectedId(detail.graph.nodes[0]?.id || null)
      setSelectedEdgeId(null)
      requestAnimationFrame(() => {
        if (!canvasRef.current) return
        canvasRef.current.scrollLeft = CANVAS_GUTTER.x
        canvasRef.current.scrollTop = CANVAS_GUTTER.y
      })
    }
    load().catch((reason) => setError(reason.message))
    return () => { active = false }
  }, [workflowId])

  useEffect(() => {
    if (!recordsOpen && !traceRun) return undefined
    const close = (event) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      if (traceRun) setTraceRun(null)
      else setRecordsOpen(false)
    }
    window.addEventListener('keydown', close, true)
    return () => window.removeEventListener('keydown', close, true)
  }, [recordsOpen, traceRun])

  useEffect(() => { zoomRef.current = zoom }, [zoom])

  useEffect(() => {
    let active = true
    setRecordsLoading(true)
    const startedAfter = new Date(Date.now() - 30 * 86400000).toISOString()
    const status = ['succeeded', 'failed'].includes(recordsFilter) ? recordsFilter : ''
    const preview = recordsFilter === 'preview' ? true : recordsFilter === 'formal' ? false : ''
    snowGrassApi.listWorkflowRuns({ workflowId, status, preview, startedAfter, limit: 10, offset: (recordsPage - 1) * 10 })
      .then((result) => { if (active) { setWorkflowRuns(result.items); setRecordsTotal(result.total); setRecordsAggregate(result.aggregate); if (recordsFilter === 'all') { setRunAggregate(result.aggregate); setWorkflowNodeStats(result.node_stats) } } })
      .catch(() => {})
      .finally(() => { if (active) setRecordsLoading(false) })
    return () => { active = false }
  }, [workflowId, recordsPage, recordsFilter, runsRefresh])

  useEffect(() => {
    const handleDelete = (event) => {
      if (!selectedEdgeId || !['Backspace', 'Delete'].includes(event.key) || event.target.closest('input, textarea, select')) return
      event.preventDefault()
      setEdges((current) => current.filter((edge) => edge.id !== selectedEdgeId))
      setSelectedEdgeId(null); setDirty(true)
    }
    window.addEventListener('keydown', handleDelete)
    return () => window.removeEventListener('keydown', handleDelete)
  }, [selectedEdgeId])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    let gesture = null
    const clampZoom = (value) => Math.min(1.8, Math.max(.45, value))
    const applyZoomAt = (nextZoom, clientX, clientY, baseZoom = zoomRef.current, baseScroll = null) => {
      const rect = canvas.getBoundingClientRect()
      const focusX = clientX - rect.left
      const focusY = clientY - rect.top
      const scrollLeft = baseScroll?.left ?? canvas.scrollLeft
      const scrollTop = baseScroll?.top ?? canvas.scrollTop
      const ratio = nextZoom / baseZoom
      zoomRef.current = nextZoom
      setZoom(nextZoom)
      requestAnimationFrame(() => {
        canvas.scrollLeft = CANVAS_GUTTER.x + (scrollLeft + focusX - CANVAS_GUTTER.x) * ratio - focusX
        canvas.scrollTop = CANVAS_GUTTER.y + (scrollTop + focusY - CANVAS_GUTTER.y) * ratio - focusY
      })
    }
    const wheel = (event) => {
      if (!event.ctrlKey && !event.metaKey) return
      event.preventDefault()
      const next = clampZoom(zoomRef.current * Math.exp(-event.deltaY * .008))
      applyZoomAt(next, event.clientX, event.clientY)
    }
    const distance = (touches) => Math.hypot(
      touches[0].clientX - touches[1].clientX,
      touches[0].clientY - touches[1].clientY,
    )
    const touchStart = (event) => {
      if (event.touches.length !== 2) return
      const centerX = (event.touches[0].clientX + event.touches[1].clientX) / 2
      const centerY = (event.touches[0].clientY + event.touches[1].clientY) / 2
      gesture = { distance: distance(event.touches), zoom: zoomRef.current, centerX, centerY, left: canvas.scrollLeft, top: canvas.scrollTop }
    }
    const touchMove = (event) => {
      if (!gesture || event.touches.length !== 2) return
      event.preventDefault()
      const centerX = (event.touches[0].clientX + event.touches[1].clientX) / 2
      const centerY = (event.touches[0].clientY + event.touches[1].clientY) / 2
      const next = clampZoom(gesture.zoom * distance(event.touches) / gesture.distance)
      applyZoomAt(next, centerX, centerY, gesture.zoom, { left: gesture.left, top: gesture.top })
    }
    const touchEnd = (event) => { if (event.touches.length < 2) gesture = null }
    canvas.addEventListener('wheel', wheel, { passive: false })
    canvas.addEventListener('touchstart', touchStart, { passive: true })
    canvas.addEventListener('touchmove', touchMove, { passive: false })
    canvas.addEventListener('touchend', touchEnd, { passive: true })
    canvas.addEventListener('touchcancel', touchEnd, { passive: true })
    return () => {
      canvas.removeEventListener('wheel', wheel)
      canvas.removeEventListener('touchstart', touchStart)
      canvas.removeEventListener('touchmove', touchMove)
      canvas.removeEventListener('touchend', touchEnd)
      canvas.removeEventListener('touchcancel', touchEnd)
    }
  }, [workflow])

  const addNode = (component, position = {}) => {
    const id = `node-${crypto.randomUUID()}`
    const defaults = Object.fromEntries(Object.entries(component.config_schema?.properties || {}).filter(([, definition]) => definition.default !== undefined).map(([key, definition]) => [key, definition.default]))
    setNodes((current) => [...current, { id, component_version_id: component.id,
      name: component.component_key, config: defaults, x: position.x ?? 120,
      y: position.y ?? 120 + current.length * 110, disabled: false, component }])
    setSelectedId(id); setSelectedEdgeId(null); setDirty(true)
  }
  const drop = (event) => {
    event.preventDefault(); const id = event.dataTransfer.getData('component-version-id')
    const component = versions[id]; if (!component) return
    const rect = canvasRef.current.querySelector('.v2-stage-content').getBoundingClientRect()
    addNode(component, { x: Math.max(0, (event.clientX - rect.left) / zoom - 100), y: Math.max(0, (event.clientY - rect.top) / zoom - 45) })
  }
  const completeConnection = (connection, node, port) => {
    if (!connection || connection.nodeId === node.id) return false
    const source = nodes.find((item) => item.id === connection.nodeId)
    const sourcePort = source?.component?.output_ports.find((item) => item.key === connection.port)
    if (sourcePort?.schema?.type !== port.schema?.type) { setError('端口类型不兼容'); return }
    setEdges((current) => current.some((edge) => edge.source_node_id === source.id && edge.source_port === connection.port && edge.target_node_id === node.id && edge.target_port === port.key) ? current : [...current, { id: `edge-${crypto.randomUUID()}`,
      source_node_id: source.id, source_port: connection.port,
      target_node_id: node.id, target_port: port.key, condition: null }])
    setPendingPort(null); setDirty(true); setError('')
    return true
  }
  const connect = (node, port, direction) => {
    if (direction === 'output') { setPendingPort({ nodeId: node.id, port: port.key, dragging: false }); return }
    completeConnection(pendingPort, node, port)
  }
  const stagePoint = (event) => {
    const rect = event.currentTarget.querySelector('.v2-stage-content').getBoundingClientRect()
    return { x: (event.clientX - rect.left) / zoom, y: (event.clientY - rect.top) / zoom }
  }
  const beginConnection = (event, node, port) => {
    event.preventDefault(); event.stopPropagation()
    setSelectedId(node.id); setSelectedEdgeId(null); setError('')
    setPendingPort({ nodeId: node.id, port: port.key, dragging: true, moved: false, clientX: event.clientX, clientY: event.clientY })
  }
  const moveConnection = (event) => {
    const activeReconnect = reconnectingRef.current
    if (!pendingPort?.dragging && !activeReconnect) return
    const cursor = stagePoint(event)
    if (pendingPort?.dragging) setPendingPort((current) => current ? { ...current, cursor, moved: current.moved || Math.hypot(event.clientX - current.clientX, event.clientY - current.clientY) > 4 } : current)
    if (activeReconnect) {
      const next = {
        ...activeReconnect,
        cursor,
        moved: activeReconnect.moved || Math.hypot(event.clientX - activeReconnect.clientX, event.clientY - activeReconnect.clientY) > 4,
      }
      reconnectingRef.current = next
      setReconnecting(next)
    }
  }
  const portAtPointer = (event, direction) => {
    const direct = event.target.closest?.(`[data-port-direction="${direction}"]`)
    if (direct) return direct
    const candidates = [...canvasRef.current.querySelectorAll(`[data-port-direction="${direction}"]`)]
    const nearest = candidates.map((element) => {
      const rect = element.getBoundingClientRect()
      const anchorX = direction === 'input' ? rect.left : rect.right
      const anchorY = rect.top + rect.height / 2
      return { element, distance: Math.hypot(event.clientX - anchorX, event.clientY - anchorY) }
    }).sort((left, right) => left.distance - right.distance)[0]
    return nearest?.distance <= 36 ? nearest.element : null
  }
  const endConnection = (event) => {
    const activeReconnect = reconnectingRef.current
    if (activeReconnect) {
      if (!activeReconnect.moved) { reconnectingRef.current = null; setReconnecting(null); return }
      const direction = activeReconnect.end === 'source' ? 'output' : 'input'
      const target = portAtPointer(event, direction)
      if (!target) { reconnectingRef.current = null; setReconnecting(null); return }
      const edge = edges.find((item) => item.id === activeReconnect.edgeId)
      const node = nodes.find((item) => item.id === target.dataset.nodeId)
      if (!edge || !node) { reconnectingRef.current = null; setReconnecting(null); return }
      const next = activeReconnect.end === 'source'
        ? { ...edge, source_node_id: node.id, source_port: target.dataset.portKey }
        : { ...edge, target_node_id: node.id, target_port: target.dataset.portKey }
      const sourceNode = nodes.find((item) => item.id === next.source_node_id)
      const targetNode = nodes.find((item) => item.id === next.target_node_id)
      const sourcePort = sourceNode?.component?.output_ports.find((port) => port.key === next.source_port)
      const targetPort = targetNode?.component?.input_ports.find((port) => port.key === next.target_port)
      if (next.source_node_id === next.target_node_id) setError('连线不能连接到同一个节点')
      else if (sourcePort?.schema?.type !== targetPort?.schema?.type) setError('端口类型不兼容')
      else { setEdges((current) => current.map((item) => item.id === next.id ? next : item)); setDirty(true); setError('') }
      reconnectingRef.current = null
      setReconnecting(null)
      return
    }
    if (!pendingPort?.dragging) return
    const target = portAtPointer(event, 'input')
    if (target) {
      const node = nodes.find((item) => item.id === target.dataset.nodeId)
      const port = node?.component?.input_ports.find((item) => item.key === target.dataset.portKey)
      if (node && port && completeConnection(pendingPort, node, port)) return
    }
    setPendingPort((current) => current?.moved ? null : { nodeId: current.nodeId, port: current.port, dragging: false })
  }
  const beginEdgeReconnect = (event, edge, end) => {
    event.preventDefault(); event.stopPropagation()
    setSelectedId(null); setSelectedEdgeId(edge.id); setPendingPort(null); setError('')
    const next = { edgeId: edge.id, end, moved: false, clientX: event.clientX, clientY: event.clientY }
    reconnectingRef.current = next
    setReconnecting(next)
  }
  const selectEdge = (edgeId) => { setSelectedEdgeId(edgeId); setSelectedId(null); setPendingPort(null) }
  const removeEdge = (edgeId) => { setEdges((current) => current.filter((edge) => edge.id !== edgeId)); setSelectedEdgeId((current) => current === edgeId ? null : current); setDirty(true) }
  const clearCanvasSelection = (event) => {
    const target = event.target
    const isBlank = target === event.currentTarget
      || target.classList?.contains('v2-stage')
      || target.classList?.contains('v2-stage-content')
      || target.classList?.contains('v2-edges')
    if (!isBlank) return
    setSelectedId(null)
    setSelectedEdgeId(null)
    setPendingPort(null)
    reconnectingRef.current = null
    setReconnecting(null)
  }
  const beginCanvasPan = (event) => {
    const target = event.target
    const isBlank = target === event.currentTarget
      || target.classList?.contains('v2-stage')
      || target.classList?.contains('v2-stage-content')
      || target.classList?.contains('v2-edges')
    if (!isBlank || event.pointerType === 'touch' || ![0, 1].includes(event.button) || pendingPort || reconnectingRef.current) return
    event.currentTarget.setPointerCapture(event.pointerId)
    canvasPanRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      scrollLeft: event.currentTarget.scrollLeft,
      scrollTop: event.currentTarget.scrollTop,
    }
    setCanvasPanning(true)
  }
  const moveCanvasPan = (event) => {
    const pan = canvasPanRef.current
    if (!pan || pan.pointerId !== event.pointerId) return false
    event.currentTarget.scrollLeft = pan.scrollLeft - (event.clientX - pan.clientX)
    event.currentTarget.scrollTop = pan.scrollTop - (event.clientY - pan.clientY)
    return true
  }
  const endCanvasPan = (event) => {
    const pan = canvasPanRef.current
    if (!pan || pan.pointerId !== event.pointerId) return false
    canvasPanRef.current = null
    setCanvasPanning(false)
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    return true
  }
  const beginNodeDrag = (event, node) => {
    if (event.target.closest('button')) return
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragging({ id: node.id, x: node.x, y: node.y, clientX: event.clientX, clientY: event.clientY })
  }
  const moveNode = (event) => {
    if (!dragging) return
    setNodes((current) => current.map((node) => node.id === dragging.id ? {
      ...node, x: Math.max(0, dragging.x + (event.clientX - dragging.clientX) / zoom),
      y: Math.max(0, dragging.y + (event.clientY - dragging.clientY) / zoom),
    } : node))
    setDirty(true)
  }
  const save = async () => {
    setBusy('save'); setError('')
    try { const detail = await snowGrassApi.saveWorkflowDraft(workflowId, workflow.draft_revision, serialize(nodes, edges)); setWorkflow(detail); setValidation(detail.validation); setDirty(false) }
    catch (reason) { setError(reason.status === 409 ? '草稿 revision 冲突，请刷新后重试。' : reason.message) }
    finally { setBusy('') }
  }
  const validate = async () => { setBusy('validate'); try { setValidation(await snowGrassApi.validateWorkflow(workflowId)) } catch (reason) { setError(reason.message) } finally { setBusy('') } }
  const preview = async () => {
    setBusy('preview'); setRun(null); setError(''); setMonitorOpen(true)
    try {
      const result = await snowGrassApi.previewWorkflow(workflowId, workflow.draft_revision, workflow.business_type === 'negative_feedback' ? { text: '预览输入' } : { period_start: new Date().toISOString() })
      setRun(result)
      setRecordsPage(1)
      setRecordsFilter('all')
      setRunsRefresh((value) => value + 1)
    } catch (reason) { setError(reason.message) }
    finally { setBusy('') }
  }
  const openTrace = async (item) => {
    setTraceRun(item); setTraceLoading(true)
    try { setTraceRun(await snowGrassApi.getWorkflowRun(item.run_id)) }
    catch (reason) { setError(reason.message) }
    finally { setTraceLoading(false) }
  }
  const publish = async () => { setBusy('publish'); try { const result = await snowGrassApi.publishWorkflow(workflowId, workflow.draft_revision, { activate: false }); setLastPublished(result.version_id) } catch (reason) { setError(reason.message) } finally { setBusy('') } }
  const deploy = async () => { if (!lastPublished) return; setBusy('deploy'); try { const result = await snowGrassApi.deployWorkflow(workflowId, lastPublished, workflow.deployed_version_id, '前端部署'); setWorkflow({ ...workflow, deployed_version_id: result.version_id }) } catch (reason) { setError(reason.message) } finally { setBusy('') } }
  const rollback = async () => { if (!rollbackVersion) return; setBusy('rollback'); try { const result = await snowGrassApi.rollbackWorkflow(workflowId, rollbackVersion, workflow.deployed_version_id, '前端回滚'); setWorkflow({ ...workflow, deployed_version_id: result.version_id }) } catch (reason) { setError(reason.message) } finally { setBusy('') } }
  if (!workflow) return <main className="workflow-v2"><p>{error || '加载中…'}</p></main>

  const visible = library.filter((item) => `${item.component_key} ${item.component_name} ${item.category}`.toLowerCase().includes(search.toLowerCase()))
  return <main className="workflow-v2">
    <div className="flow-command">
      <div className="flow-command-title"><span className="editor-context">流程定义</span><h1>{workflow.name}</h1><small>草稿 R{workflow.draft_revision}</small><span className={`deployment-state ${workflow.deployed_version_id ? 'is-live' : ''}`}>{workflow.deployed_version_id ? '已部署' : '未部署'}</span></div>
      <div className="flow-command-actions">
        <button className="flow-runs-action" type="button" onClick={() => setRecordsOpen(true)}><Icon name="list" size={15} />执行记录</button>
        <span className={`save-indicator ${dirty ? 'dirty' : ''}`}><i />{dirty ? '有未保存修改' : '已保存'}</span>
        <div className="flow-command-primary"><button type="button" disabled={!dirty || busy} onClick={save}><Icon name="save" size={15} />保存</button><button type="button" disabled={busy} onClick={validate}>校验</button><button className="primary" type="button" disabled={dirty || busy} onClick={preview}><Icon name="play" size={15} />运行预览</button></div>
        <details className="release-menu"><summary>发布管理 <Icon name="more" size={16} /></summary><div><button type="button" disabled={dirty || validation?.valid === false || busy} onClick={publish}>发布新版本</button><button type="button" disabled={!lastPublished || busy} onClick={deploy}>部署已发布版本</button><label>回滚到<select aria-label="回滚版本" value={rollbackVersion} onChange={(event) => setRollbackVersion(event.target.value)}>{flowVersions.map((version) => <option key={version.id} value={version.id}>V{version.version_number}</option>)}</select></label><button className="danger" type="button" disabled={!rollbackVersion || rollbackVersion === workflow.deployed_version_id || busy} onClick={rollback}>确认回滚</button></div></details>
      </div>
    </div>
    {error && <div className="flow-v2-error" role="alert">{error}</div>}{validation?.valid === false && <div className="flow-v2-error">{validation.errors?.[0]?.message}</div>}
    <div className="flow-v2-layout">
      <NodeLibrary search={search} items={visible} onSearch={setSearch} onAdd={addNode} onDragStart={(event, item) => event.dataTransfer.setData('component-version-id', item.id)} />
      <section ref={canvasRef} className={`v2-canvas ${pendingPort || reconnecting ? 'is-connecting' : ''} ${canvasPanning ? 'is-panning' : ''}`} onDragOver={(event) => event.preventDefault()} onDrop={drop} onPointerDown={(event) => { clearCanvasSelection(event); beginCanvasPan(event) }} onPointerMove={(event) => { if (!moveCanvasPan(event)) moveConnection(event) }} onPointerUp={(event) => { if (!endCanvasPan(event)) endConnection(event) }} onPointerCancel={(event) => endCanvasPan(event)} aria-label="DAG 画布">
        <div className="canvas-toolbar" aria-label="画布缩放"><button type="button" onClick={() => setZoom((value) => Math.max(.45, value - .1))} aria-label="缩小"><Icon name="zoomOut" /></button><span title="触控板或双指捏合可缩放">{Math.round(zoom * 100)}%</span><button type="button" onClick={() => setZoom((value) => Math.min(1.8, value + .1))} aria-label="放大"><Icon name="zoomIn" /></button><button type="button" onClick={() => setZoom(1)} aria-label="恢复实际大小"><Icon name="fit" /></button></div>
        <ExecutionMonitorDrawer open={monitorOpen} running={busy === 'preview'} stats={canvasStats} nodes={nodes} nodeHistory={nodeHistory} latestTrace={latestTrace} onToggle={() => setMonitorOpen((value) => !value)} />
        {(pendingPort || reconnecting) && <div className="connect-notice">{reconnecting ? `拖到新的${reconnecting.end === 'source' ? '输出' : '输入'}端口` : '选择目标节点的输入端口'} <button type="button" onClick={() => { setPendingPort(null); reconnectingRef.current = null; setReconnecting(null) }}>取消</button></div>}
        <div className="v2-stage"><div className="v2-stage-content" style={{ transform: `scale(${zoom})` }}>
        <EdgeLayer nodes={nodes} edges={edges} selectedEdgeId={selectedEdgeId} pendingPort={pendingPort} reconnecting={reconnecting} onSelect={selectEdge} onReconnectStart={beginEdgeReconnect} />
        {nodes.map((node) => { const trace = latestTrace[node.id]; const history = nodeHistory[node.id]; return <article key={node.id} className={`v2-node ${selectedId === node.id ? 'is-selected' : ''} ${trace ? `run-${trace.status}` : ''} ${busy === 'preview' ? 'run-pending' : ''}`} style={{ left: node.x, top: node.y }} onClick={() => { setSelectedId(node.id); setSelectedEdgeId(null) }} onPointerDown={(event) => beginNodeDrag(event, node)} onPointerMove={moveNode} onPointerUp={() => setDragging(null)} onPointerCancel={() => setDragging(null)}>
          <header><span className="v2-node-icon"><Icon name={node.component?.icon || 'tool'} size={17} weight="fill" /></span><span className="v2-node-kind"><small>{node.component?.component_key || '缺失组件'}</small><strong>{node.name}</strong></span><em>V{node.component?.version_number || '?'}</em></header>
          {(trace || busy === 'preview') && <div className="node-run-meta">{busy === 'preview' ? <span className="is-running"><i />等待执行状态</span> : <span className={`is-${trace.status}`}><i />{{ succeeded: '成功', failed: '失败', skipped: '跳过' }[trace.status] || trace.status} · {trace.duration_ms} ms</span>}</div>}
          <div className="node-ports inputs">{node.component?.input_ports.map((port) => <button type="button" key={port.key} data-port-direction="input" data-node-id={node.id} data-port-key={port.key} onClick={(event) => { event.stopPropagation(); connect(node, port, 'input') }}><i />{port.key}</button>)}</div>
          <div className="node-ports outputs">{node.component?.output_ports.map((port) => <button type="button" key={port.key} data-port-direction="output" data-node-id={node.id} data-port-key={port.key} onPointerDown={(event) => beginConnection(event, node, port)} onClick={(event) => event.stopPropagation()}>{port.key}<i /></button>)}</div>
          <div className="node-history-strip"><span><Icon name="history" size={11} />近 30 天</span><strong>{history?.count || 0} 次</strong><small>{history ? `均 ${formatNodeDuration(Math.round(history.duration / history.count))}` : '暂无执行'}</small></div>
        </article>})}</div></div>
      </section>
      <InspectorPanel node={selected} selectedEdge={selectedEdge} nodes={nodes} versions={library} edges={edges.filter((edge) => edge.source_node_id === selectedId || edge.target_node_id === selectedId)} onUpdate={(changes) => { setNodes((current) => current.map((node) => node.id === selectedId ? { ...node, ...changes } : node)); setDirty(true) }} onRemove={() => { setNodes((current) => current.filter((node) => node.id !== selectedId)); setEdges((current) => current.filter((edge) => edge.source_node_id !== selectedId && edge.target_node_id !== selectedId)); setSelectedId(null); setDirty(true) }} onSelectEdge={selectEdge} onUpdateEdge={(changes) => { setEdges((current) => current.map((edge) => edge.id === selectedEdgeId ? { ...edge, ...changes } : edge)); setDirty(true) }} onRemoveEdge={removeEdge} />
    </div><FlowRunDrawer run={run} onClose={() => setRun(null)} />
    <ExecutionRecordsDrawer open={recordsOpen} workflowName={workflow.name} runs={workflowRuns} loading={recordsLoading} aggregate={recordsAggregate} total={recordsTotal} page={recordsPage} pageSize={10} filter={recordsFilter} onFilterChange={(value) => { setRecordsFilter(value); setRecordsPage(1) }} onPageChange={setRecordsPage} onClose={() => setRecordsOpen(false)} onSelect={openTrace} />
    <ExecutionTraceDrawer run={traceRun} loading={traceLoading} onClose={() => setTraceRun(null)} />
  </main>
}

export default WorkflowPage
