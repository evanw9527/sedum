function BusinessPackSwitcher({ packs, value, onChange, deployment, latestVersion }) {
  return (
    <div className="business-pack-switcher">
      <label htmlFor="business-pack">业务能力</label>
      <select id="business-pack" value={value} onChange={(event) => onChange(event.target.value)}>
        {packs.map((pack) => <option key={pack.business_type} value={pack.business_type}>{pack.title}</option>)}
      </select>
      <span className={deployment ? 'deployment-state is-live' : 'deployment-state'}>
        {deployment ? `已部署 · v${latestVersion || 1}` : '未部署'}
      </span>
    </div>
  )
}

export default BusinessPackSwitcher
