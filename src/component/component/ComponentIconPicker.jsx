import Icon from '../../shared/ui/Icon.jsx'

const COMPONENT_ICON_OPTIONS = [
  { value: 'tool', label: '工具' },
  { value: 'trigger', label: '触发' },
  { value: 'action', label: '处理' },
  { value: 'condition', label: '条件' },
  { value: 'llm', label: '模型' },
  { value: 'knowledge', label: '知识' },
  { value: 'classifier', label: '分类' },
  { value: 'chats', label: '对话' },
  { value: 'output', label: '输出' },
  { value: 'success', label: '校验' },
  { value: 'flow', label: '流程' },
  { value: 'delay', label: '等待' },
]

function ComponentIconPicker({ value = 'tool', onChange, compact = false }) {
  return (
    <div className={`component-icon-picker ${compact ? 'is-compact' : ''}`} role="radiogroup" aria-label="组件图标">
      {COMPONENT_ICON_OPTIONS.map((item) => <button className={value === item.value ? 'is-selected' : ''} type="button" role="radio" aria-checked={value === item.value} aria-label={item.label} title={item.label} key={item.value} onClick={() => onChange(item.value)}><Icon name={item.value} size={compact ? 16 : 19} weight={value === item.value ? 'fill' : 'regular'} /><span>{item.label}</span></button>)}
    </div>
  )
}

export default ComponentIconPicker
