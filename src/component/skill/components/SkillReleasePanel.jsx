import { useEffect, useState } from 'react'
import Icon from '../../../shared/ui/Icon.jsx'

const actionLabels = {
  create: '创建技能',
  clone: '克隆技能',
  save: '保存草稿',
  validate: '执行校验',
  publish: '发布版本',
  activate: '激活版本',
  rollback: '回滚版本',
  enable: '启用技能',
  disable: '停用技能',
  archive: '归档技能',
}

function SkillReleasePanel({ detail, busy, onValidate, onPublish, onActivate, onEnabled, onArchive }) {
  const [version, setVersion] = useState('1.0.0')
  const [notes, setNotes] = useState('')
  const manifestText = detail?.draft?.content?.files?.['manifest.yaml'] || ''

  useEffect(() => {
    const match = manifestText.match(/^version:\s*["']?([^\s"']+)/m)
    if (match) setVersion(match[1])
  }, [detail?.id, detail?.draft?.revision, manifestText])

  if (!detail) return <aside className="skill-release-panel" />

  const report = detail.draft?.validation_report
  const draftValidated = detail.draft && detail.draft.validated_hash === detail.draft.content_hash && report?.valid
  const managed = detail.source === 'managed'
  const archived = detail.lifecycle_status === 'archived'

  return (
    <aside className="skill-release-panel">
      <div className="skill-pane-heading"><div><span>03</span><strong>校验与发布</strong></div></div>
      <div className="skill-release-scroll">
        <section className="release-status-card">
          <div className="release-track">
            <span className={detail.draft ? 'done' : ''}>草稿</span><i />
            <span className={draftValidated ? 'done' : ''}>已校验</span><i />
            <span className={detail.active_release ? 'done' : ''}>运行中</span>
          </div>
          <dl>
            <div><dt>当前版本</dt><dd>{detail.active_release ? `v${detail.active_release.version}` : '未发布'}</dd></div>
            <div><dt>运行状态</dt><dd className={detail.enabled ? 'is-enabled' : ''}>{detail.enabled ? '已启用' : '已停用'}</dd></div>
          </dl>
          {detail.active_release && (
            <button className={`skill-switch ${detail.enabled ? 'is-on' : ''}`} type="button" disabled={busy || archived} onClick={() => onEnabled(!detail.enabled)}>
              <span />{detail.enabled ? '停用技能' : '启用技能'}
            </button>
          )}
        </section>

        {managed && !archived && (
          <section className="release-section">
            <header><b>草稿校验</b><span>修复错误后才能发布</span></header>
            <button className="skill-button full" type="button" disabled={busy} onClick={onValidate}>
              <Icon name="success" size={15} />校验当前草稿
            </button>
            {report && (
              <div className={`validation-report ${report.valid ? 'is-valid' : 'has-errors'}`}>
                <strong>{report.valid ? '校验通过' : `发现 ${report.issues.length} 个问题`}</strong>
                {report.issues.map((issue) => <p key={`${issue.code}-${issue.field}`}><span>{issue.severity === 'error' ? '错误' : '提醒'}</span>{issue.message}</p>)}
              </div>
            )}
          </section>
        )}

        {managed && !archived && (
          <section className="release-section">
            <header><b>发布新版本</b><span>必须与 manifest.yaml 一致</span></header>
            <label>版本号<input value={version} onChange={(event) => setVersion(event.target.value)} placeholder="1.0.0" /></label>
            <label>发布说明<textarea rows="2" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="可选：说明本次变化" /></label>
            <button className="skill-button primary full" type="button" disabled={busy || !draftValidated} onClick={() => onPublish({ version, releaseNotes: notes })}>发布并激活</button>
            {!draftValidated && <small className="release-hint">请先保存并校验当前草稿</small>}
          </section>
        )}

        {!!detail.releases.length && (
          <section className="release-section">
            <header><b>版本历史</b><span>{detail.releases.length} 个版本</span></header>
            <div className="release-list">
              {detail.releases.map((release) => (
                <article key={release.id}>
                  <div><strong>v{release.version}</strong>{release.active && <span>运行中</span>}</div>
                  <time>{release.published_at ? new Date(release.published_at).toLocaleString('zh-CN') : ''}</time>
                  {!release.active && <button type="button" disabled={busy} onClick={() => onActivate(release.id)}>激活此版本</button>}
                </article>
              ))}
            </div>
          </section>
        )}

        {!!detail.audits.length && (
          <section className="release-section audit-section">
            <header><b>操作记录</b><span>最近 {detail.audits.length} 条</span></header>
            {detail.audits.slice(0, 8).map((audit) => (
              <div className="audit-item" key={audit.id}><span>{actionLabels[audit.action] || audit.action}</span><time>{new Date(audit.created_at).toLocaleString('zh-CN')}</time></div>
            ))}
          </section>
        )}

        {managed && !archived && (
          <button className="archive-button" type="button" disabled={busy} onClick={onArchive}><Icon name="trash" size={14} />归档技能</button>
        )}
      </div>
    </aside>
  )
}

export default SkillReleasePanel
