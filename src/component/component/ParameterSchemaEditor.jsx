const TYPES = ['string', 'multiline', 'number', 'integer', 'boolean', 'enum', 'string-array', 'secret-reference']

function ParameterSchemaEditor({ schema, onChange, disabled = false }) {
  const properties = schema?.properties || {}
  const required = new Set(schema?.required || [])
  const rows = Object.entries(properties)

  const commit = (nextRows) => {
    const nextProperties = Object.fromEntries(nextRows.map(([key, value]) => [key, value]))
    onChange({ ...schema, type: 'object', additionalProperties: false, properties: nextProperties,
      required: [...required].filter((key) => key in nextProperties) })
  }
  const update = (index, key, value) => commit(rows.map((row, rowIndex) => rowIndex === index
    ? [key ?? row[0], value ?? row[1]] : row))

  return (
    <section className="schema-editor" aria-labelledby="parameter-heading">
      <div className="section-heading"><div><span>02</span><h2 id="parameter-heading">组件参数</h2></div>
        <button type="button" disabled={disabled} onClick={() => commit([...rows, [`parameter_${rows.length + 1}`, { type: 'string', title: '新参数' }]])}>添加参数</button></div>
      {rows.length === 0 && <p className="empty-state">此组件没有可配置参数。</p>}
      {rows.map(([key, definition], index) => (
        <div className="schema-row" key={`${key}-${index}`}>
          <input aria-label="参数 key" value={key} disabled={disabled} onChange={(event) => update(index, event.target.value, definition)} />
          <input aria-label="参数名称" value={definition.title || ''} disabled={disabled} onChange={(event) => update(index, key, { ...definition, title: event.target.value })} />
          <select aria-label="参数类型" value={definition['x-ui-type'] || definition.type || 'string'} disabled={disabled} onChange={(event) => {
            const uiType = event.target.value
            const jsonType = uiType === 'integer' ? 'integer' : uiType === 'number' ? 'number' : uiType === 'boolean' ? 'boolean' : uiType === 'string-array' ? 'array' : 'string'
            update(index, key, { ...definition, type: jsonType, 'x-ui-type': uiType })
          }}>{TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select>
          <label className="check-field"><input type="checkbox" checked={required.has(key)} disabled={disabled} onChange={(event) => {
            if (event.target.checked) required.add(key)
            else required.delete(key)
            onChange({ ...schema, required: [...required] })
          }} />必填</label>
          <button className="row-delete" type="button" disabled={disabled} onClick={() => commit(rows.filter((_, rowIndex) => rowIndex !== index))}>删除</button>
        </div>
      ))}
    </section>
  )
}

export default ParameterSchemaEditor
