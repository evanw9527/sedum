import Icon from '../../../shared/ui/Icon.jsx'

function WorkflowActions({ saved, saving, running, publishing, validation, onSave, onValidate, onPreview, onPublish }) {
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
      <button className="button button-secondary" type="button" onClick={onValidate} disabled={saving || running}>
        校验{validation?.valid ? ' ✓' : ''}
      </button>
      <button className={`button button-primary ${running ? 'is-running' : ''}`} type="button" onClick={onPreview} disabled={running || saving}>
        <Icon name={running ? 'loading' : 'play'} size={15} />
        {running ? '运行中' : '运行预览'}
      </button>
      <button className="button button-publish" type="button" onClick={onPublish} disabled={publishing || !saved || validation?.valid === false}>
        {publishing ? '发布中' : '发布'}
      </button>
    </div>
  )
}

export default WorkflowActions
