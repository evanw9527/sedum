import { Fragment, useMemo, useState } from 'react'

function safeLink(href) {
  return /^(https?:|mailto:)/i.test(href) ? href : '#'
}

function InlineMarkdown({ children }) {
  const tokens = String(children).split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g)
  return tokens.map((token, index) => {
    if (token.startsWith('`') && token.endsWith('`')) {
      return <code key={index}>{token.slice(1, -1)}</code>
    }
    if (token.startsWith('**') && token.endsWith('**')) {
      return <strong key={index}>{token.slice(2, -2)}</strong>
    }
    const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (link) {
      const href = safeLink(link[2])
      return <a key={index} href={href} target={href === '#' ? undefined : '_blank'} rel="noreferrer">{link[1]}</a>
    }
    return <Fragment key={index}>{token}</Fragment>
  })
}

async function copyText(content) {
  if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(content)
}

function CodePanel({ code, language = 'text' }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await copyText(code)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
  }
  return (
    <section className="code-panel">
      <header><span>{language || 'text'}</span><button type="button" onClick={copy}>{copied ? '已复制' : '复制'}</button></header>
      <pre><code>{code}</code></pre>
    </section>
  )
}

function HtmlPanel({ html, initialView = 'preview' }) {
  const [view, setView] = useState(initialView)
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await copyText(html)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
  }
  return (
    <section className="html-panel">
      <header>
        <span>HTML</span>
        <nav aria-label="HTML 展示方式">
          <button className={view === 'preview' ? 'is-active' : ''} type="button" onClick={() => setView('preview')}>预览</button>
          <button className={view === 'source' ? 'is-active' : ''} type="button" onClick={() => setView('source')}>源码</button>
          <button type="button" onClick={copy}>{copied ? '已复制' : '复制'}</button>
        </nav>
      </header>
      {view === 'preview'
        ? <iframe title="HTML 结果预览" sandbox="" srcDoc={html} />
        : <pre><code>{html}</code></pre>}
    </section>
  )
}

function isBlockStart(lines, index) {
  const line = lines[index] || ''
  const next = lines[index + 1] || ''
  return /^```/.test(line)
    || /^(#{1,4})\s+/.test(line)
    || /^>\s?/.test(line)
    || /^[-*+]\s+/.test(line)
    || /^\d+\.\s+/.test(line)
    || (line.includes('|') && /^\s*\|?\s*:?-{3,}/.test(next))
}

function markdownBlocks(content) {
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const blocks = []
  let index = 0
  while (index < lines.length) {
    const line = lines[index]
    if (!line.trim()) { index += 1; continue }

    const fence = line.match(/^```([\w+-]*)\s*$/)
    if (fence) {
      const code = []
      index += 1
      while (index < lines.length && !/^```\s*$/.test(lines[index])) code.push(lines[index++])
      if (index < lines.length) index += 1
      blocks.push({ type: fence[1].toLowerCase() === 'html' ? 'html' : 'code', language: fence[1] || 'text', content: code.join('\n') })
      continue
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/)
    if (heading) {
      blocks.push({ type: 'heading', level: heading[1].length, content: heading[2] })
      index += 1
      continue
    }

    if (/^>\s?/.test(line)) {
      const quote = []
      while (index < lines.length && /^>\s?/.test(lines[index])) quote.push(lines[index++].replace(/^>\s?/, ''))
      blocks.push({ type: 'quote', content: quote.join('\n') })
      continue
    }

    const unordered = /^[-*+]\s+/.test(line)
    const ordered = /^\d+\.\s+/.test(line)
    if (unordered || ordered) {
      const matcher = unordered ? /^[-*+]\s+/ : /^\d+\.\s+/
      const items = []
      while (index < lines.length && matcher.test(lines[index])) items.push(lines[index++].replace(matcher, ''))
      blocks.push({ type: ordered ? 'ordered-list' : 'list', items })
      continue
    }

    if (line.includes('|') && /^\s*\|?\s*:?-{3,}/.test(lines[index + 1] || '')) {
      const rows = [line]
      index += 2
      while (index < lines.length && lines[index].includes('|') && lines[index].trim()) rows.push(lines[index++])
      blocks.push({
        type: 'table',
        rows: rows.map((row) => row.replace(/^\s*\||\|\s*$/g, '').split('|').map((cell) => cell.trim())),
      })
      continue
    }

    const paragraph = [line]
    index += 1
    while (index < lines.length && lines[index].trim() && !isBlockStart(lines, index)) paragraph.push(lines[index++])
    blocks.push({ type: 'paragraph', content: paragraph.join('\n') })
  }
  return blocks
}

function MarkdownDocument({ content }) {
  const blocks = useMemo(() => markdownBlocks(content), [content])
  return (
    <div className="markdown-document">
      {blocks.map((block, index) => {
        if (block.type === 'code') return <CodePanel key={index} code={block.content} language={block.language} />
        if (block.type === 'html') return <HtmlPanel key={index} html={block.content} initialView="source" />
        if (block.type === 'heading') {
          const Heading = `h${block.level}`
          return <Heading key={index}><InlineMarkdown>{block.content}</InlineMarkdown></Heading>
        }
        if (block.type === 'quote') return <blockquote key={index}><InlineMarkdown>{block.content}</InlineMarkdown></blockquote>
        if (block.type === 'list' || block.type === 'ordered-list') {
          const List = block.type === 'list' ? 'ul' : 'ol'
          return <List key={index}>{block.items.map((item, itemIndex) => <li key={itemIndex}><InlineMarkdown>{item}</InlineMarkdown></li>)}</List>
        }
        if (block.type === 'table') {
          const [head, ...body] = block.rows
          return <div className="markdown-table-wrap" key={index}><table><thead><tr>{head.map((cell, cellIndex) => <th key={cellIndex}><InlineMarkdown>{cell}</InlineMarkdown></th>)}</tr></thead><tbody>{body.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}><InlineMarkdown>{cell}</InlineMarkdown></td>)}</tr>)}</tbody></table></div>
        }
        return <p key={index}><InlineMarkdown>{block.content}</InlineMarkdown></p>
      })}
    </div>
  )
}

function contentFormat(content) {
  const trimmed = content.trim()
  const singleFence = trimmed.match(/^```([\w+-]*)\s*\n([\s\S]*?)\n```$/)
  if (singleFence) return { type: singleFence[1].toLowerCase() === 'html' ? 'html' : 'code', language: singleFence[1] || 'text', body: singleFence[2] }
  if (/^(<!doctype\s+html|<html\b|<body\b|<(main|section|article|div|table|svg)\b)/i.test(trimmed)) return { type: 'html', body: trimmed }
  if (/^#{1,4}\s|```|\*\*[^*]+\*\*|^[-*+]\s|^\d+\.\s|\[[^\]]+\]\([^)]+\)|\|.+\|/m.test(trimmed)) return { type: 'markdown', body: content }
  return { type: 'text', body: content }
}

function MessageContent({ content, role }) {
  if (role === 'user') return <div className="message-bubble">{content}</div>
  const format = contentFormat(content)
  const label = format.type === 'html' ? 'HTML' : format.type === 'code' ? (format.language || 'Code') : format.type === 'markdown' ? 'Markdown' : '文本'
  return (
    <section className={`assistant-result is-${format.type}`}>
      <header><span>回答</span><em>{label}</em></header>
      {format.type === 'html' && <HtmlPanel html={format.body} />}
      {format.type === 'code' && <CodePanel code={format.body} language={format.language} />}
      {format.type === 'markdown' && <MarkdownDocument content={format.body} />}
      {format.type === 'text' && <div className="plain-document">{format.body}</div>}
    </section>
  )
}

export default MessageContent
