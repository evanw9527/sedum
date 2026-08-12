import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import AppHeader from '../component/layout/AppHeader.jsx'
import DefinitionEditDrawer from '../component/layout/DefinitionEditDrawer.jsx'
import AgentPage from '../page/agent/AgentPage.jsx'
import ComponentDetailPage from '../page/component/ComponentDetailPage.jsx'
import ComponentListPage from '../page/component/ComponentListPage.jsx'
import WorkflowListPage from '../page/workflow/WorkflowListPage.jsx'
import WorkflowPage from '../page/workflow/WorkflowPage.jsx'
import WorkflowRunDetailPage from '../page/run/WorkflowRunDetailPage.jsx'
import WorkflowRunListPage from '../page/run/WorkflowRunListPage.jsx'
import TokenUsagePage from '../page/usage/TokenUsagePage.jsx'
import SkillManagementPage from '../page/skill/SkillManagementPage.jsx'
import ActivityEventsPage from '../page/activity/ActivityEventsPage.jsx'
import KnowledgeManagementPage from '../page/knowledge/KnowledgeManagementPage.jsx'
import '../styles/app.css'
import '../styles/theme.css'

function initialTheme() {
  const saved = window.localStorage.getItem('sedum-theme')
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function AppContent() {
  const location = useLocation()
  const [theme, setTheme] = useState(initialTheme)
  const inWorkflowModule = ['/workflows', '/components', '/runs'].some((path) => location.pathname.startsWith(path))
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    window.localStorage.setItem('sedum-theme', theme)
  }, [theme])
  return (
    <div className="app-frame">
      <AppHeader theme={theme} onThemeChange={setTheme} />
      <div className="app-page" data-workflow-module={inWorkflowModule || undefined}>
        <div className="app-route-page">
          <Routes>
            <Route path="/agent" element={<AgentPage />} />
            <Route path="/components" element={<ComponentListPage />} />
            <Route path="/components/:componentId" element={<DefinitionEditDrawer type="component" title="编辑组件" background={<ComponentListPage />}><ComponentDetailPage /></DefinitionEditDrawer>} />
            <Route path="/workflows" element={<WorkflowListPage />} />
            <Route path="/workflows/:workflowId" element={<DefinitionEditDrawer type="workflow" title="编辑流程" background={<WorkflowListPage />}><WorkflowPage /></DefinitionEditDrawer>} />
            <Route path="/runs" element={<WorkflowRunListPage />} />
            <Route path="/runs/:runId" element={<WorkflowRunDetailPage />} />
            <Route path="/skills" element={<SkillManagementPage />} />
            <Route path="/activity" element={<ActivityEventsPage />} />
            <Route path="/knowledge" element={<KnowledgeManagementPage />} />
            <Route path="/usage" element={<TokenUsagePage />} />
            <Route path="*" element={<Navigate to="/agent" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}

function App() {
  return <BrowserRouter><AppContent /></BrowserRouter>
}

export default App
