import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../../shared/ui/Icon.jsx'

function DefinitionEditDrawer({ type, title, background, children }) {
  const navigate = useNavigate()
  const close = () => navigate(type === 'workflow' ? '/workflows' : '/components')

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') navigate(type === 'workflow' ? '/workflows' : '/components')
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [navigate, type])

  return (
    <div className="definition-drawer-host">
      <div className="definition-drawer-background" aria-hidden="true">{background}</div>
      <div className="definition-drawer-backdrop" onMouseDown={close}>
        <section className={`definition-edit-drawer is-${type}`} role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
          <header className="definition-drawer-toolbar"><div><Icon name={type === 'workflow' ? 'flow' : 'tool'} size={15} /><strong>{title}</strong></div><button type="button" onClick={close} aria-label="关闭编辑抽屉"><Icon name="close" size={16} /></button></header>
          <div className="definition-drawer-content">{children}</div>
        </section>
      </div>
    </div>
  )
}

export default DefinitionEditDrawer
