function PortSchemaEditor({ inputPorts, outputPorts, onChange, disabled = false }) {
  const update = (direction, rows) => onChange(direction === 'input'
    ? { inputPorts: rows, outputPorts } : { inputPorts, outputPorts: rows })
  return (
    <section className="schema-editor" aria-labelledby="port-heading">
      <div className="section-heading"><div><span>03</span><h2 id="port-heading">输入与输出端口</h2></div></div>
      {[["input", '输入端口', inputPorts], ["output", '输出端口', outputPorts]].map(([direction, title, rows]) => (
        <div className="port-editor" key={direction}>
          <div className="port-editor-heading"><h3>{title}</h3><button type="button" disabled={disabled} onClick={() => update(direction, [...rows, { key: `${direction}_${rows.length + 1}`, name: '新端口', schema: { type: 'object' }, required: true, multiple: false }])}>添加</button></div>
          {rows.map((port, index) => (
            <div className="schema-row port-row" key={`${port.key}-${index}`}>
              <input aria-label={`${title} key`} value={port.key} disabled={disabled} onChange={(event) => update(direction, rows.map((item, i) => i === index ? { ...item, key: event.target.value } : item))} />
              <input aria-label={`${title}名称`} value={port.name} disabled={disabled} onChange={(event) => update(direction, rows.map((item, i) => i === index ? { ...item, name: event.target.value } : item))} />
              <select aria-label={`${title}类型`} value={port.schema?.type || 'object'} disabled={disabled} onChange={(event) => update(direction, rows.map((item, i) => i === index ? { ...item, schema: { type: event.target.value } } : item))}>
                {['object', 'array', 'string', 'number', 'boolean'].map((type) => <option key={type}>{type}</option>)}
              </select>
              <label className="check-field"><input type="checkbox" checked={port.required} disabled={disabled} onChange={(event) => update(direction, rows.map((item, i) => i === index ? { ...item, required: event.target.checked } : item))} />必填</label>
              <button className="row-delete" type="button" disabled={disabled} onClick={() => update(direction, rows.filter((_, i) => i !== index))}>删除</button>
            </div>
          ))}
        </div>
      ))}
    </section>
  )
}

export default PortSchemaEditor
