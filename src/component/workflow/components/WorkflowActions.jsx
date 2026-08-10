import Icon from '../../../shared/ui/Icon.jsx'

function WorkflowActions({ saved, saving, running, onSave, onToggleRun }) {
  const status = saving
    ? { icon: 'loading', label: '保存中', className: 'is-saving' }
    : saved
      ? { icon: 'success', label: '已保存', className: 'is-saved' }
      : { icon: 'history', label: '未保存', className: 'is-dirty' }

  return (
    <div className="workflow-actions">
      <span className={`save-state ${status.className}`}>
        <Icon name={status.icon} size={14} weight={saved && !saving ? 'fill' : 'regular'} />
        {status.label}
      </span>
      <button className="button button-secondary" type="button" onClick={onSave} disabled={saved || saving}>
        <Icon name="save" size={15} />保存
      </button>
      <button className={`button button-primary ${running ? 'is-running' : ''}`} type="button" onClick={onToggleRun}>
        {running ? <Icon name="close" size={15} /> : <Icon name="play" size={15} />}
        {running ? '停止预览' : '运行预览'}
      </button>
    </div>
  )
}

export default WorkflowActions
