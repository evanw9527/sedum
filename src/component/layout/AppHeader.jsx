import { NavLink, useLocation } from 'react-router-dom'
import Icon from '../../shared/ui/Icon.jsx'
import FlowModuleNav from '../workflow/FlowModuleNav.jsx'

const NAV_ITEMS = [
  { to: '/agent', label: 'Agent 对话', icon: 'chats' },
  { to: '/workflows', label: '流程编排', icon: 'flow', section: 'workflow' },
  { to: '/skills', label: '技能管理', icon: 'settings' },
  { to: '/activity', label: '活动记录', icon: 'activity' },
  { to: '/knowledge', label: '知识库', icon: 'knowledge' },
  { to: '/usage', label: 'Token 用量', icon: 'usage' },
]

function AppHeader({ theme, onThemeChange }) {
  const location = useLocation()
  return (
    <header className="app-header">
      <NavLink className="app-header-brand" to="/agent">
        <span><Icon name="flow" size={18} weight="bold" /></span><strong>SEDUM</strong>
      </NavLink>
      <nav className="app-primary-nav" aria-label="主菜单">
        {NAV_ITEMS.map((item) => (
          <div className={`app-primary-nav-item ${item.section ? `has-${item.section}-menu` : ''}`} key={item.to}>
            <NavLink className={({ isActive }) => isActive || (item.section === 'workflow' && ['/components', '/runs'].some((path) => location.pathname.startsWith(path))) ? 'is-active' : ''} key={item.to} to={item.to}>
              <Icon name={item.icon} size={17} /><span>{item.label}</span>
            </NavLink>
            {item.section === 'workflow' && <FlowModuleNav />}
          </div>
        ))}
      </nav>
      <div className="app-header-tools">
        <span className="app-environment"><i />本地</span>
        <button className="theme-toggle" type="button" role="switch" aria-checked={theme === 'dark'} aria-label={`切换到${theme === 'dark' ? '浅色' : '暗色'}主题`} onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}>
          <span className={theme === 'light' ? 'is-active' : ''}><Icon name="sun" size={15} /></span>
          <span className={theme === 'dark' ? 'is-active' : ''}><Icon name="moon" size={15} /></span>
        </button>
      </div>
    </header>
  )
}

export default AppHeader
