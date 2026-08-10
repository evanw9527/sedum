import { useState } from 'react'
import AppHeader from '../component/layout/AppHeader.jsx'
import AgentPage from '../page/agent/AgentPage.jsx'
import WorkflowPage from '../page/workflow/WorkflowPage.jsx'
import TokenUsagePage from '../page/usage/TokenUsagePage.jsx'
import SkillManagementPage from '../page/skill/SkillManagementPage.jsx'
import '../styles/app.css'

function App() {
  const [view, setView] = useState('agent')

  return (
    <div className="app-frame">
      <AppHeader activeView={view} onNavigate={setView} />
      <div className="app-page">
        {view === 'workflow' && <WorkflowPage />}
        {view === 'agent' && <AgentPage />}
        {view === 'usage' && <TokenUsagePage />}
        {view === 'skills' && <SkillManagementPage />}
      </div>
    </div>
  )
}

export default App
