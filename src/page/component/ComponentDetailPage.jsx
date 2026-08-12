import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { snowGrassApi } from '../../api/snowGrassApi.js'
import ParameterSchemaEditor from '../../component/component/ParameterSchemaEditor.jsx'
import PortSchemaEditor from '../../component/component/PortSchemaEditor.jsx'
import ComponentVersionPanel from '../../component/component/ComponentVersionPanel.jsx'
import ComponentIconPicker from '../../component/component/ComponentIconPicker.jsx'
import '../../styles/component.css'

function ComponentDetailPage() {
  const { componentId } = useParams()
  const [component, setComponent] = useState(null)
  const [draft, setDraft] = useState(null)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [testConfig, setTestConfig] = useState('{}')
  const [testInputs, setTestInputs] = useState('{}')

  const load = useCallback(async () => { const data = await snowGrassApi.getComponent(componentId); setComponent(data); setDraft(data.draft) }, [componentId])
  useEffect(() => { load().catch((reason) => setError(reason.message)) }, [load])
  if (!component || !draft) return <main className="management-page"><p>{error || '加载中…'}</p></main>

  const save = async () => {
    setSaving(true); setError(''); setMessage('')
    try { const data = await snowGrassApi.saveComponentDraft(componentId, component.draft_revision, draft); setComponent(data); setDraft(data.draft); setMessage('草稿已保存') }
    catch (reason) { setError(reason.status === 409 ? '草稿已被更新，请刷新后对比。' : reason.message) }
    finally { setSaving(false) }
  }
  const publish = async () => {
    setPublishing(true); setError('')
    try { await snowGrassApi.publishComponent(componentId, component.draft_revision); await load(); setMessage('新版本已发布，现有 Flow 未自动升级。') }
    catch (reason) { setError(reason.message) } finally { setPublishing(false) }
  }
  const test = async () => {
    setError('')
    try { const result = await snowGrassApi.testComponent(componentId, { expected_revision: component.draft_revision, config: JSON.parse(testConfig), inputs: JSON.parse(testInputs) }); setMessage(`测试通过，耗时 ${result.duration_ms} ms · 输出 ${JSON.stringify(result.output)}`) }
    catch (reason) { setError(reason.message) }
  }

  return (
    <main className="management-page component-detail">
      <header className="detail-header"><div><span className="editor-context">组件定义 · {component.category}</span><h1>{component.name}</h1><code>{component.key}</code></div><div className="detail-actions"><button type="button" onClick={test}>测试草稿</button><button type="button" onClick={() => snowGrassApi.setComponentStatus(componentId, component.status === 'active' ? 'disabled' : 'active').then(load)}>{component.status === 'active' ? '停用' : '启用'}</button><button className="primary" type="button" onClick={save} disabled={saving}>{saving ? '保存中' : '保存草稿'}</button></div></header>
      {error && <p className="management-error" role="alert">{error}</p>}{message && <p className="management-message" role="status">{message}</p>}
      <div className="detail-layout"><div>
        <section className="manifest-overview"><span>01</span><div><h2>实现绑定</h2><strong>{draft.implementation_key}</strong><p>草稿 revision {component.draft_revision} · 状态 {component.status}</p></div></section>
        <section className="component-icon-definition"><header><div><h2>组件图标</h2><p>图标随组件版本发布，用于组件库、画布节点和属性面板。</p></div></header><ComponentIconPicker value={draft.icon} onChange={(icon) => setDraft({ ...draft, icon })} /></section>
        <section className="component-test-panel"><h2>草稿测试</h2><label>Config JSON<textarea value={testConfig} onChange={(event) => setTestConfig(event.target.value)} /></label><label>Inputs by port JSON<textarea value={testInputs} onChange={(event) => setTestInputs(event.target.value)} /></label></section>
        <ParameterSchemaEditor schema={draft.config_schema} onChange={(configSchema) => setDraft({ ...draft, config_schema: configSchema })} />
        <PortSchemaEditor inputPorts={draft.input_ports} outputPorts={draft.output_ports} onChange={({ inputPorts, outputPorts }) => setDraft({ ...draft, input_ports: inputPorts, output_ports: outputPorts })} />
      </div><ComponentVersionPanel versions={component.versions} publishing={publishing} onPublish={publish} /></div>
    </main>
  )
}

export default ComponentDetailPage
