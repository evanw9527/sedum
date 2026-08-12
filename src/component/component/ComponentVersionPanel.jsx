function ComponentVersionPanel({ versions, onPublish, publishing }) {
  return (
    <section className="version-panel" aria-labelledby="version-heading">
      <div className="section-heading"><div><span>04</span><h2 id="version-heading">版本台账</h2></div>
        <button type="button" disabled={publishing} onClick={onPublish}>{publishing ? '发布中' : '发布新版本'}</button></div>
      <ol className="version-rail">
        {versions.map((version) => (
          <li key={version.id}>
            <span className="version-number">V{String(version.version_number).padStart(2, '0')}</span>
            <div><strong>{version.implementation_key}</strong><code>{version.implementation_digest}</code><small>{new Date(version.published_at).toLocaleString()}</small></div>
          </li>
        ))}
        {versions.length === 0 && <li className="empty-state">尚未发布版本。</li>}
      </ol>
      <p className="version-note">发布会创建不可变版本，不会自动升级任何 Flow。</p>
    </section>
  )
}

export default ComponentVersionPanel
