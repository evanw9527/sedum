import Icon from '../../../shared/ui/Icon.jsx'

function InspectorPanel({ open, selectedNode, selectedEdge, nodeMap, kindLabels, onClose, onRemove, onUpdateNode, onUpdateEdge }) {
  return (
    <aside className={`inspector-panel ${open ? 'is-open' : ''}`}>
      <div className="panel-heading">
        <div><span className="folio">03</span><h2>{selectedEdge ? '决策属性' : '节点属性'}</h2></div>
        <div className="panel-heading-actions">
          <button className="icon-button danger" type="button" aria-label="删除所选项" onClick={onRemove} disabled={Boolean(selectedNode?.kind === 'trigger')}><Icon name="trash" /></button>
          <button className="icon-button mobile-close" type="button" aria-label="关闭属性面板" onClick={onClose}><Icon name="close" /></button>
        </div>
      </div>
      {selectedNode ? (
        <div className="inspector-content">
          <div className="selection-summary">
            <span className={`library-icon is-${selectedNode.kind}`}><Icon name={selectedNode.kind} /></span>
            <div><small>{kindLabels[selectedNode.kind]}</small><strong>{selectedNode.title}</strong></div>
          </div>
          <label className="field-label" htmlFor="node-name">节点名称</label>
          <input id="node-name" className="text-input" value={selectedNode.title} onChange={(event) => onUpdateNode(selectedNode.id, { title: event.target.value })} />
          <label className="field-label" htmlFor="node-note">说明</label>
          <textarea id="node-note" className="text-input textarea" value={selectedNode.description} onChange={(event) => onUpdateNode(selectedNode.id, { description: event.target.value })} />
          {selectedNode.kind === 'condition' && (
            <div className="condition-card">
              <div className="condition-head"><strong>分支规则</strong><button type="button">编辑</button></div>
              <div className="condition-row"><span>满足条件</span><span className="branch-line is-yes" /></div>
              <div className="condition-row"><span>其他情况</span><span className="branch-line" /></div>
            </div>
          )}
          <div className="node-id"><span>节点 ID</span><code>{selectedNode.id}</code></div>
        </div>
      ) : selectedEdge ? (
        <div className="inspector-content">
          <div className="selection-summary edge-summary">
            <span className="library-icon is-action"><Icon name="edge" /></span>
            <div><small>决策边</small><strong>{nodeMap[selectedEdge.from]?.title} → {nodeMap[selectedEdge.to]?.title}</strong></div>
          </div>
          <label className="field-label" htmlFor="edge-label">边名称</label>
          <input id="edge-label" className="text-input" value={selectedEdge.label} onChange={(event) => onUpdateEdge(selectedEdge.id, { label: event.target.value })} />
          <label className="field-label" htmlFor="rule-type">规则类型</label>
          <select id="rule-type" className="text-input" value={selectedEdge.ruleType} onChange={(event) => onUpdateEdge(selectedEdge.id, { ruleType: event.target.value })}>
            <option value="condition">条件判断</option>
            <option value="fallback">默认分支</option>
            <option value="always">始终通过</option>
          </select>
          {selectedEdge.ruleType === 'condition' && (
            <div className="factor-editor">
              <div className="factor-heading"><span className="factor-index">01</span><strong>决策因子</strong></div>
              <label className="field-label" htmlFor="factor-field">字段路径</label>
              <input id="factor-field" className="text-input" value={selectedEdge.field} placeholder="例如 input.status" onChange={(event) => onUpdateEdge(selectedEdge.id, { field: event.target.value })} />
              <label className="field-label" htmlFor="factor-operator">运算符</label>
              <select id="factor-operator" className="text-input" value={selectedEdge.operator} onChange={(event) => onUpdateEdge(selectedEdge.id, { operator: event.target.value })}>
                <option value="equals">等于</option>
                <option value="notEquals">不等于</option>
                <option value="contains">包含</option>
                <option value="greaterThan">大于</option>
                <option value="lessThan">小于</option>
              </select>
              <label className="field-label" htmlFor="factor-value">比较值</label>
              <input id="factor-value" className="text-input" value={selectedEdge.value} placeholder="输入比较值" onChange={(event) => onUpdateEdge(selectedEdge.id, { value: event.target.value })} />
            </div>
          )}
          {selectedEdge.ruleType !== 'condition' && <p className="rule-note">{selectedEdge.ruleType === 'fallback' ? '前序条件均不满足时进入此分支。' : '流程运行到此处时直接进入下一节点。'}</p>}
          <div className="node-id"><span>边 ID</span><code>{selectedEdge.id}</code></div>
        </div>
      ) : <p className="empty-selection">选择画布中的节点或连线以编辑属性。</p>}
    </aside>
  )
}

export default InspectorPanel
