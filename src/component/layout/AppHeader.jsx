import Icon from '../../shared/ui/Icon.jsx'

const NAV_ITEMS = [
  { id: 'agent', label: 'Agent 对话', icon: 'chats' },
  { id: 'workflow', label: '流程编排', icon: 'flow' },
  { id: 'skills', label: '技能管理', icon: 'tool' },
  { id: 'usage', label: 'Token 用量', icon: 'usage' },
]

function AppHeader({ activeView, onNavigate }) {
  return (
    <header className="app-header">
      <div className="app-header-brand">
        <span><Icon name="flow" size={18} weight="bold" /></span>
        <strong>SEDUM</strong>
      </div>
      <nav className="app-primary-nav" aria-label="主菜单">
        {NAV_ITEMS.map((item) => (
          <button className={activeView === item.id ? 'is-active' : ''} key={item.id} type="button" onClick={() => onNavigate(item.id)}>
            <Icon name={item.icon} size={17} weight={activeView === item.id ? 'bold' : 'regular'} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="app-environment"><i />本地预览</div>
    </header>
  )
}

export default AppHeader
