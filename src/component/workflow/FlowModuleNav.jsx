import { NavLink } from 'react-router-dom'
import Icon from '../../shared/ui/Icon.jsx'

function FlowModuleNav() {
  return (
    <nav className="flow-module-nav" aria-label="流程编排子菜单">
      <NavLink to="/workflows" className={({ isActive }) => isActive ? 'is-active' : ''}><Icon name="flow" size={17} /><span><strong>流程编排</strong><small>设计与发布 DAG 流程</small></span></NavLink>
      <NavLink to="/components" className={({ isActive }) => isActive ? 'is-active' : ''}><Icon name="tool" size={17} /><span><strong>组件管理</strong><small>管理组件定义与版本</small></span></NavLink>
    </nav>
  )
}

export default FlowModuleNav
