import { useEffect, useMemo, useState } from 'react'
import Icon from '../../../shared/ui/Icon.jsx'

const REQUIRED_FILES = new Set(['manifest.yaml', 'SKILL.md'])
const EMPTY_FILES = {}

const fileKind = (path) => {
  if (!path) return '文件'
  if (path === 'SKILL.md') return '入口'
  if (path === 'manifest.yaml') return '清单'
  if (path.startsWith('scripts/')) return '脚本'
  if (path.startsWith('references/')) return '参考'
  if (path.startsWith('assets/')) return '资源'
  if (path.startsWith('agents/')) return '界面'
  if (path.startsWith('tests/')) return '测试'
  return '文件'
}

function SkillEditor({ detail, content, dirty, saving, onChange, onSave, onClone }) {
  const [selectedFile, setSelectedFile] = useState('SKILL.md')
  const files = content?.files || EMPTY_FILES
  const paths = useMemo(() => Object.keys(files).sort((a, b) => {
    const order = ['manifest.yaml', 'SKILL.md']
    const left = order.indexOf(a)
    const right = order.indexOf(b)
    if (left >= 0 || right >= 0) return (left < 0 ? 99 : left) - (right < 0 ? 99 : right)
    return a.localeCompare(b)
  }), [files])
  const activeFile = files[selectedFile] !== undefined
    ? selectedFile
    : (files['SKILL.md'] !== undefined ? 'SKILL.md' : paths[0] || '')

  useEffect(() => {
    if (paths.length && files[selectedFile] === undefined) {
      setSelectedFile(files['SKILL.md'] !== undefined ? 'SKILL.md' : paths[0])
    }
  }, [detail?.id, files, paths, selectedFile])

  if (!detail || !content) {
    return <main className="skill-editor skill-placeholder">从左侧选择一个技能</main>
  }

  const readonly = detail.readonly || detail.lifecycle_status === 'archived'
  const updateFile = (value) => {
    if (activeFile) onChange({ files: { ...files, [activeFile]: value } })
  }

  const addFile = () => {
    const path = window.prompt('输入技能包内的相对路径', 'references/guide.md')?.trim()
    if (!path) return
    if (path.startsWith('/') || path.includes('\\') || path.split('/').some((part) => !part || part === '.' || part === '..')) {
      window.alert('请输入安全的 POSIX 相对路径')
      return
    }
    if (files[path] !== undefined) {
      setSelectedFile(path)
      return
    }
    onChange({ files: { ...files, [path]: '' } })
    setSelectedFile(path)
  }

  const removeFile = () => {
    if (!activeFile || REQUIRED_FILES.has(activeFile)) return
    if (!window.confirm(`确定删除 ${activeFile} 吗？`)) return
    const next = { ...files }
    delete next[activeFile]
    onChange({ files: next })
    setSelectedFile('SKILL.md')
  }

  return (
    <main className="skill-editor package-editor">
      <div className="skill-pane-heading editor-heading">
        <div><span>02</span><strong>技能包编辑</strong></div>
        <div className="skill-editor-actions">
          {dirty && <span className="unsaved-mark">未保存</span>}
          {detail.readonly ? (
            <button className="skill-button" type="button" onClick={onClone}><Icon name="plus" size={14} />克隆后编辑</button>
          ) : (
            <button className="skill-button primary" type="button" disabled={!dirty || saving || readonly} onClick={onSave}>
              <Icon name={saving ? 'loading' : 'save'} size={14} />{saving ? '保存中' : '保存技能包'}
            </button>
          )}
        </div>
      </div>

      <div className="package-workspace">
        <aside className="package-file-tree">
          <header>
            <strong>文件</strong>
            {!readonly && <button type="button" title="添加文件" onClick={addFile}><Icon name="plus" size={13} weight="bold" /></button>}
          </header>
          <div className="package-standard-note">
            <b>标准技能包</b>
            <span>SKILL.md 必需，其余资源按需加载。</span>
          </div>
          <nav>
            {paths.map((path) => (
              <button className={activeFile === path ? 'is-active' : ''} key={path} type="button" onClick={() => setSelectedFile(path)}>
                <span>{path}</span><em>{fileKind(path)}</em>
              </button>
            ))}
          </nav>
        </aside>

        <section className="package-file-editor">
          <header>
            <div><strong>{activeFile || '未选择文件'}</strong><span>{fileKind(activeFile)} · UTF-8 文本</span></div>
            {!readonly && activeFile && !REQUIRED_FILES.has(activeFile) && <button type="button" onClick={removeFile}><Icon name="trash" size={13} />删除</button>}
          </header>
          <textarea disabled={readonly || !activeFile} spellCheck="false" value={files[activeFile] || ''} onChange={(event) => updateFile(event.target.value)} />
          <footer>
            <span>{(files[activeFile] || '').length.toLocaleString()} 字符</span>
            <span>{paths.length} 个文件</span>
          </footer>
        </section>
      </div>
    </main>
  )
}

export default SkillEditor
