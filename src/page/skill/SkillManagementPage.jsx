import { useEffect, useMemo, useState } from 'react'
import { snowGrassApi } from '../../api/snowGrassApi.js'
import SkillCatalog from '../../component/skill/components/SkillCatalog.jsx'
import SkillEditor from '../../component/skill/components/SkillEditor.jsx'
import SkillReleasePanel from '../../component/skill/components/SkillReleasePanel.jsx'
import '../../styles/skill.css'

const copy = (value) => JSON.parse(JSON.stringify(value))

function SkillManagementPage() {
  const [items, setItems] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [detail, setDetail] = useState(null)
  const [content, setContent] = useState(null)
  const [savedContent, setSavedContent] = useState(null)
  const [filters, setFilters] = useState({ query: '', source: '', status: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const dirty = useMemo(() => JSON.stringify(content) !== JSON.stringify(savedContent), [content, savedContent])

  const loadCatalog = async (nextFilters = filters) => {
    const catalog = await snowGrassApi.listAdminSkills(nextFilters)
    setItems(catalog)
    if (!selectedId && catalog.length) setSelectedId(catalog[0].id)
  }

  const loadDetail = async (skillId) => {
    if (!skillId) return
    const next = await snowGrassApi.getAdminSkill(skillId)
    setDetail(next)
    setContent(copy(next.draft.content))
    setSavedContent(copy(next.draft.content))
  }

  const act = async (operation, message) => {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await operation()
      await loadCatalog()
      await loadDetail(selectedId)
      setNotice(message)
    } catch (caught) {
      setError(caught.message)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    snowGrassApi.listAdminSkills()
      .then((catalog) => {
        setItems(catalog)
        if (catalog.length) setSelectedId(catalog[0].id)
      })
      .catch((caught) => setError(caught.message))
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      snowGrassApi.listAdminSkills(filters)
        .then(setItems)
        .catch((caught) => setError(caught.message))
    }, 180)
    return () => window.clearTimeout(timer)
  }, [filters])

  useEffect(() => {
    loadDetail(selectedId).catch((caught) => setError(caught.message))
  }, [selectedId])

  const createSkill = async (form) => {
    setBusy(true)
    try {
      const created = await snowGrassApi.createAdminSkill(form)
      await loadCatalog()
      setSelectedId(created.id)
      setNotice('技能草稿已创建')
    } catch (caught) {
      setError(caught.message)
      throw caught
    } finally {
      setBusy(false)
    }
  }

  const cloneSkill = async () => {
    const newId = window.prompt('请输入新技能 ID（hyphen-case）', `${detail.id}-copy`)
    if (!newId) return
    const currentName = items.find((item) => item.id === detail.id)?.name || detail.id
    const newName = window.prompt('请输入新技能名称', `${currentName} 副本`)
    if (!newName) return
    setBusy(true)
    try {
      const cloned = await snowGrassApi.cloneSkill(detail.id, { newId, newName })
      await loadCatalog()
      setSelectedId(cloned.id)
      setNotice('已创建可编辑副本')
    } catch (caught) {
      setError(caught.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="skill-page">
      {(error || notice) && <div className={`skill-toast ${error ? 'error' : ''}`}><span>{error || notice}</span><button type="button" onClick={() => { setError(''); setNotice('') }}>关闭</button></div>}
      <SkillCatalog items={items} selectedId={selectedId} filters={filters} onFiltersChange={setFilters} onSelect={(id) => { if (!dirty || window.confirm('当前草稿尚未保存，确定切换吗？')) setSelectedId(id) }} onCreate={createSkill} />
      <SkillEditor detail={detail} content={content} dirty={dirty} saving={busy} onChange={setContent} onClone={cloneSkill} onSave={() => act(() => snowGrassApi.saveSkillDraft(detail.id, detail.draft.revision, content), '技能包已保存')} />
      <SkillReleasePanel detail={detail} busy={busy} onValidate={() => act(() => snowGrassApi.validateSkill(detail.id, detail.draft.revision), '校验已完成')} onPublish={({ version, releaseNotes }) => act(() => snowGrassApi.publishSkill(detail.id, { version, expectedRevision: detail.draft.revision, releaseNotes }), `版本 ${version} 已发布并激活`)} onActivate={(releaseId) => act(() => snowGrassApi.activateSkillRelease(detail.id, releaseId), '运行版本已切换')} onEnabled={(enabled) => act(() => snowGrassApi.setSkillEnabled(detail.id, enabled), enabled ? '技能已启用' : '技能已停用')} onArchive={() => { if (window.confirm('归档后技能将停止运行，确定继续吗？')) act(() => snowGrassApi.archiveSkill(detail.id, detail.draft.revision), '技能已归档') }} />
    </div>
  )
}

export default SkillManagementPage
