import { useEffect, useRef, useState } from 'react'
import Icon from '../../shared/ui/Icon.jsx'
import '../../styles/agent.css'
import { INITIAL_MESSAGES, STARTER_PROMPTS } from '../../component/agent/agent.data.js'
import ChatComposer from '../../component/agent/components/ChatComposer.jsx'
import ChatSidebar from '../../component/agent/components/ChatSidebar.jsx'
import MessageTimeline from '../../component/agent/components/MessageTimeline.jsx'
import { snowGrassApi } from '../../api/snowGrassApi.js'

const AUTO_SKILL_ID = 'auto'
const EMPTY_USAGE_SUMMARY = {
  period_days: 30,
  input_tokens: 0,
  output_tokens: 0,
  total_tokens: 0,
  requests: 0,
  sessions: 0,
  by_model: [],
}

function toUiMessages(messages) {
  return messages.map((message) => ({
    id: message.id,
    role: message.role,
    content: message.content,
    modelId: message.model_id,
    skillId: message.skill_id,
    steps: [],
    status: 'completed',
  }))
}

function replaceMessage(messages, messageId, updater) {
  return messages.map((message) => message.id === messageId ? updater(message) : message)
}

function eventTimestamp(data = {}) {
  const timestamp = Date.parse(data.created_at || '')
  return Number.isFinite(timestamp) ? timestamp : Date.now()
}

function completeRunningSteps(steps, completedAt, detail = '已完成') {
  return (steps || []).map((step) => step.status === 'running' ? {
    ...step,
    detail,
    status: 'completed',
    completedAt,
    durationMs: Math.max(0, completedAt - step.startedAt),
  } : step)
}

function traceStepId(data) {
  return `${data.step || 'step'}:${data.tool_call_id || 'default'}`
}

function traceStepType(step) {
  if (step === 'select_skill') return 'skill'
  if (step === 'execute_skill_script') return 'tool'
  return 'tool'
}

function cacheStatusInfo(status) {
  return {
    hit: { label: '复用缓存', detail: '命中有效缓存' },
    miss: { label: '实际执行', detail: '缓存未命中' },
    expired: { label: '实际执行', detail: '缓存已过期' },
    refresh: { label: '已刷新', detail: '按要求强制刷新' },
    disabled: { label: '实际执行', detail: '未启用缓存' },
  }[status] || null
}

function formatCacheAge(milliseconds) {
  const seconds = Math.max(0, Math.round((Number(milliseconds) || 0) / 1000))
  if (seconds < 60) return `${seconds} 秒前`
  if (seconds < 3600) return `${Math.floor(seconds / 60)} 分钟前`
  return `${Math.floor(seconds / 3600)} 小时前`
}

function formatCacheTime(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false })
}

function startedStep(data, startedAt, fallbackSkill = null) {
  const isScript = data.step === 'execute_skill_script'
  const skill = isScript ? {
    id: data.skill_id || fallbackSkill?.id,
    name: data.skill_name || fallbackSkill?.name,
    version: data.skill_version || fallbackSkill?.version,
  } : null
  const scriptName = data.script?.split('/').at(-1)
  return {
    id: traceStepId(data),
    type: traceStepType(data.step),
    label: data.label || data.step,
    detail: isScript
      ? [skill?.name, scriptName].filter(Boolean).join(' · ') || '正在运行已发布脚本'
      : '正在匹配可用 Skill',
    status: 'running',
    startedAt,
    meta: isScript ? {
      ...(skill?.name ? { Skill: skill.name } : {}),
      ...(skill?.id ? { 技能ID: skill.id } : {}),
      ...(skill?.version ? { 版本: skill.version } : {}),
      ...(data.script ? { 脚本: data.script } : {}),
    } : null,
  }
}

function thinkingStep(id, detail, startedAt) {
  return {
    id,
    type: 'thinking',
    label: '智能思考',
    detail,
    status: 'running',
    startedAt,
  }
}

function AgentPage() {
  const [models, setModels] = useState([])
  const [skills, setSkills] = useState([])
  const [sessions, setSessions] = useState([])
  const [usageSummary, setUsageSummary] = useState(EMPTY_USAGE_SUMMARY)
  const [contextStats, setContextStats] = useState(null)
  const [messages, setMessages] = useState(INITIAL_MESSAGES)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [loadingSession, setLoadingSession] = useState(false)
  const [activeSessionId, setActiveSessionId] = useState(null)
  const [selectedModelId, setSelectedModelId] = useState('')
  const [selectedSkillId, setSelectedSkillId] = useState(AUTO_SKILL_ID)
  const [knowledgeEnabled, setKnowledgeEnabled] = useState(false)
  const [error, setError] = useState('')
  const [connection, setConnection] = useState({ status: 'loading', message: '正在连接 Snow Grass' })
  const [reloadToken, setReloadToken] = useState(0)
  const abortRef = useRef(null)
  const sessionRequestRef = useRef(0)
  const conversationRef = useRef(null)
  const activeSessionIdRef = useRef(null)
  const followOutputRef = useRef(true)

  const activeSession = sessions.find((session) => session.id === activeSessionId)
  const selectedModel = models.find((model) => model.id === selectedModelId)
  const compatibleSkills = skills.filter((skill) => (
    skill.enabled && (!skill.allowed_models.length || skill.allowed_models.includes(selectedModelId))
  ))

  useEffect(() => {
    let cancelled = false
    const loadInitialData = async () => {
      setConnection({ status: 'loading', message: '正在连接 Snow Grass' })
      setError('')
      try {
        const [, modelCatalog, skillCatalog, sessionList, usage] = await Promise.all([
          snowGrassApi.health(),
          snowGrassApi.listModels(),
          snowGrassApi.listSkills(),
          snowGrassApi.listSessions(),
          snowGrassApi.usageSummary(),
        ])
        if (cancelled) return

        setModels(modelCatalog)
        setSkills(skillCatalog)
        setSessions(sessionList)
        setUsageSummary(usage)
        setSelectedModelId((current) => (
          modelCatalog.some((model) => model.id === current)
            ? current
            : (modelCatalog.find((model) => model.available) || modelCatalog[0])?.id || ''
        ))
        setConnection({ status: 'connected', message: '已连接 Snow Grass' })

        const targetSession = sessionList.find((session) => session.id === activeSessionIdRef.current) || sessionList[0]
        if (!targetSession) {
          setActiveSessionId(null)
          setContextStats(null)
          setMessages(INITIAL_MESSAGES)
          return
        }

        setActiveSessionId(targetSession.id)
        setSelectedModelId(targetSession.model_id)
        setSelectedSkillId(targetSession.skill_id || AUTO_SKILL_ID)
        setKnowledgeEnabled(Boolean(targetSession.knowledge_enabled))
        const [history, memory] = await Promise.all([
          snowGrassApi.listMessages(targetSession.id),
          snowGrassApi.getSessionMemory(targetSession.id).catch(() => null),
        ])
        if (!cancelled) {
          setMessages(history.length ? toUiMessages(history) : INITIAL_MESSAGES)
          setContextStats(memory?.last_context_stats || null)
        }
      } catch (requestError) {
        if (cancelled) return
        setConnection({ status: 'error', message: '未连接 Snow Grass' })
        setError(`${requestError.message}，请确认 Python 服务已启动。`)
      }
    }

    loadInitialData()
    return () => {
      cancelled = true
    }
  }, [reloadToken])

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId
  }, [activeSessionId])

  useEffect(() => {
    const conversation = conversationRef.current
    if (conversation && followOutputRef.current) {
      conversation.scrollTo({ top: conversation.scrollHeight, behavior: 'smooth' })
    }
  }, [messages, busy])

  useEffect(() => () => abortRef.current?.abort(), [])

  const newChat = () => {
    if (busy) return
    sessionRequestRef.current += 1
    setMessages(INITIAL_MESSAGES)
    setInput('')
    setError('')
    setActiveSessionId(null)
    setContextStats(null)
    setSelectedSkillId(AUTO_SKILL_ID)
    setKnowledgeEnabled(false)
    followOutputRef.current = true
  }

  const selectSession = async (sessionId) => {
    if (busy || sessionId === activeSessionId) return
    const session = sessions.find((item) => item.id === sessionId)
    if (!session) return

    const requestId = sessionRequestRef.current + 1
    sessionRequestRef.current = requestId
    setActiveSessionId(sessionId)
    setSelectedModelId(session.model_id)
    setSelectedSkillId(session.skill_id || AUTO_SKILL_ID)
    setKnowledgeEnabled(Boolean(session.knowledge_enabled))
    setLoadingSession(true)
    setError('')
    setContextStats(null)
    followOutputRef.current = true
    try {
      const [history, memory] = await Promise.all([
        snowGrassApi.listMessages(sessionId),
        snowGrassApi.getSessionMemory(sessionId).catch(() => null),
      ])
      if (sessionRequestRef.current === requestId) {
        setMessages(history.length ? toUiMessages(history) : INITIAL_MESSAGES)
        setContextStats(memory?.last_context_stats || null)
      }
    } catch (requestError) {
      if (sessionRequestRef.current === requestId) setError(requestError.message)
    } finally {
      if (sessionRequestRef.current === requestId) setLoadingSession(false)
    }
  }

  const changeModel = (modelId) => {
    setSelectedModelId(modelId)
    const nextSkill = skills.find((skill) => skill.id === selectedSkillId)
    if (nextSkill?.allowed_models.length && !nextSkill.allowed_models.includes(modelId)) {
      setSelectedSkillId(AUTO_SKILL_ID)
    }
  }

  const stopGeneration = () => {
    abortRef.current?.abort()
  }

  const changeKnowledge = async (enabled) => {
    const previous = knowledgeEnabled
    setKnowledgeEnabled(enabled)
    if (!activeSessionId) return
    try {
      const updated = await snowGrassApi.updateSessionKnowledge(activeSessionId, enabled)
      setSessions((current) => current.map((session) => (
        session.id === updated.id ? updated : session
      )))
    } catch (requestError) {
      setKnowledgeEnabled(previous)
      setError(requestError.message)
    }
  }

  const sendMessage = async () => {
    const prompt = input.trim()
    if (!prompt || busy || !selectedModel) return

    setBusy(true)
    setError('')
    setInput('')
    followOutputRef.current = true
    const controller = new AbortController()
    abortRef.current = controller
    let sessionId = activeSessionId
    let assistantId = null
    let streamFailure = ''

    try {
      if (!sessionId) {
        const title = prompt.length > 24 ? `${prompt.slice(0, 24)}…` : prompt
        const created = await snowGrassApi.createSession({
          title,
          modelId: selectedModelId,
          skillId: selectedSkillId === AUTO_SKILL_ID ? null : selectedSkillId,
          knowledgeEnabled,
        })
        sessionId = created.id
        setActiveSessionId(created.id)
        setSessions((current) => [created, ...current])
      }

      const userMessage = { id: `user-${Date.now()}`, role: 'user', content: prompt, status: 'completed' }
      setMessages((current) => (
        current.length === 1 && current[0].id === 'welcome' ? [userMessage] : [...current, userMessage]
      ))

      await snowGrassApi.streamMessage({
        sessionId,
        content: prompt,
        modelId: selectedModelId,
        skillId: selectedSkillId === AUTO_SKILL_ID ? null : selectedSkillId,
        knowledgeEnabled,
        signal: controller.signal,
        onEvent: ({ type, data }) => {
          if (type === 'run.started') {
            assistantId = data.run_id
            const startedAt = eventTimestamp(data)
            setContextStats(data.context_stats || null)
            setMessages((current) => [...current, {
              id: assistantId,
              role: 'assistant',
              content: '',
              steps: [thinkingStep(`thinking:start:${assistantId}`, '正在理解问题', startedAt)],
              startedAt,
              pending: true,
              status: 'running',
            }])
          }

          if (type === 'step.started' && assistantId) {
            const startedAt = eventTimestamp(data)
            setMessages((current) => replaceMessage(current, assistantId, (message) => ({
              ...message,
              steps: [
                ...completeRunningSteps(message.steps, startedAt, '已确定下一步'),
                startedStep(data, startedAt, message.activeSkill),
              ],
            })))
          }

          if (type === 'step.completed' && assistantId) {
            const selectedSkill = skills.find((skill) => skill.id === data.skill_id)
            const completedAt = eventTimestamp(data)
            const completedId = traceStepId(data)
            const isScript = data.step === 'execute_skill_script'
            setMessages((current) => replaceMessage(current, assistantId, (message) => {
              const scriptSkillName = data.skill_name || message.activeSkill?.name
              const scriptName = data.script?.split('/').at(-1)
              const cacheInfo = cacheStatusInfo(data.cache_status)
              const completedSteps = (message.steps || []).map((step) => step.id === completedId ? {
                ...step,
                detail: isScript
                  ? [scriptSkillName, scriptName].filter(Boolean).join(' · ')
                  : (selectedSkill ? `已选择 ${selectedSkill.name}` : '未匹配到专用 Skill'),
                cacheStatus: isScript ? data.cache_status : null,
                cacheLabel: isScript ? cacheInfo?.label : null,
                status: data.ok === false ? 'error' : 'completed',
                completedAt,
                durationMs: Number.isFinite(data.duration_ms)
                  ? data.duration_ms
                  : Math.max(0, completedAt - step.startedAt),
                meta: isScript ? {
                  ...(data.skill_name || message.activeSkill?.name ? { Skill: data.skill_name || message.activeSkill.name } : {}),
                  ...(data.skill_id || message.activeSkill?.id ? { 技能ID: data.skill_id || message.activeSkill.id } : {}),
                  ...(data.skill_version || message.activeSkill?.version ? { 版本: data.skill_version || message.activeSkill.version } : {}),
                  ...(data.script ? { 脚本: data.script } : {}),
                  ...(Number.isFinite(data.exit_code) ? { 退出码: data.exit_code } : {}),
                  ...(cacheInfo ? { 缓存状态: cacheInfo.detail } : {}),
                  ...(data.cached_at ? { 缓存时间: formatCacheTime(data.cached_at) } : {}),
                  ...(data.expires_at ? { 有效期至: formatCacheTime(data.expires_at) } : {}),
                  ...(Number.isFinite(data.age_ms) ? { 数据年龄: formatCacheAge(data.age_ms) } : {}),
                  ...(Number.isFinite(data.hit_count) ? { 命中次数: data.hit_count } : {}),
                  ...(Number.isFinite(data.original_duration_ms) ? { 原执行耗时: `${data.original_duration_ms} ms` } : {}),
                } : (selectedSkill ? { Skill: selectedSkill.name } : null),
              } : step)
              return {
                ...message,
                activeSkill: !isScript && selectedSkill ? {
                  id: selectedSkill.id,
                  name: selectedSkill.name,
                  version: selectedSkill.version,
                } : message.activeSkill,
                steps: [
                  ...completedSteps,
                  thinkingStep(
                    `thinking:${data.step}:${data.tool_call_id || completedAt}`,
                    isScript ? '正在整理工具结果' : '正在规划执行方式',
                    completedAt,
                  ),
                ],
              }
            }))
          }

          if (type === 'message.delta' && assistantId) {
            const completedAt = eventTimestamp(data)
            setMessages((current) => replaceMessage(current, assistantId, (message) => ({
              ...message,
              content: `${message.content}${data.delta || ''}`,
              steps: completeRunningSteps(message.steps, completedAt, '已开始生成回答'),
            })))
          }

          if (type === 'message.completed' && assistantId) {
            const completedAt = eventTimestamp(data)
            setMessages((current) => replaceMessage(current, assistantId, (message) => ({
              ...message,
              content: data.content ?? message.content,
              steps: completeRunningSteps(message.steps, completedAt),
              completedAt,
              pending: false,
              status: 'completed',
            })))
          }

          if (type === 'run.failed') {
            streamFailure = data.message || 'Agent 执行失败'
            if (assistantId) {
              const completedAt = eventTimestamp(data)
              setMessages((current) => replaceMessage(current, assistantId, (message) => ({
                ...message,
                content: message.content || `执行失败：${streamFailure}`,
                steps: (message.steps || []).map((step) => step.status === 'running' ? {
                  ...step,
                  detail: streamFailure,
                  status: 'error',
                  completedAt,
                  durationMs: Math.max(0, completedAt - step.startedAt),
                } : step),
                completedAt,
                pending: false,
                status: 'error',
              })))
            }
          }

          if (type === 'run.completed' && assistantId) {
            const completedAt = eventTimestamp(data)
            setMessages((current) => replaceMessage(current, assistantId, (message) => ({
              ...message,
              steps: completeRunningSteps(message.steps, completedAt),
              completedAt: message.completedAt || completedAt,
              pending: false,
              status: 'completed',
            })))
          }
        },
      })

      if (streamFailure) setError(streamFailure)
    } catch (requestError) {
      if (requestError.name === 'AbortError') {
        if (assistantId) {
          const completedAt = Date.now()
          setMessages((current) => replaceMessage(current, assistantId, (message) => ({
            ...message,
            content: message.content || '已停止生成。',
            steps: (message.steps || []).map((step) => step.status === 'running' ? {
              ...step,
              detail: '已停止',
              status: 'stopped',
              completedAt,
              durationMs: Math.max(0, completedAt - step.startedAt),
            } : step),
            completedAt,
            pending: false,
            status: 'stopped',
          })))
        }
      } else {
        setError(requestError.message)
        if (assistantId) {
          const completedAt = Date.now()
          setMessages((current) => replaceMessage(current, assistantId, (message) => ({
            ...message,
            content: message.content || `请求失败：${requestError.message}`,
            steps: (message.steps || []).map((step) => step.status === 'running' ? {
              ...step,
              detail: requestError.message,
              status: 'error',
              completedAt,
              durationMs: Math.max(0, completedAt - step.startedAt),
            } : step),
            completedAt,
            pending: false,
            status: 'error',
          })))
        }
      }
    } finally {
      abortRef.current = null
      setBusy(false)
      const [sessionResult, usageResult] = await Promise.allSettled([
        snowGrassApi.listSessions(),
        snowGrassApi.usageSummary(),
      ])
      if (sessionResult.status === 'fulfilled') setSessions(sessionResult.value)
      if (usageResult.status === 'fulfilled') setUsageSummary(usageResult.value)
    }
  }

  const statusText = connection.status === 'connected'
    ? (selectedModel?.available ? 'Agent 已就绪' : '已连接 · 等待模型 Key')
    : connection.message

  return (
    <div className="agent-app">
      <ChatSidebar
        sessions={sessions}
        usage={usageSummary}
        activeSessionId={activeSessionId}
        connection={connection}
        loading={loadingSession}
        disabled={busy}
        onNewChat={newChat}
        onSelectSession={selectSession}
      />
      <main className="chat-main">
        <header className="chat-topbar">
          <div>
            <h1>{activeSession?.title || '新对话'}</h1>
            <span className={`connection-label is-${connection.status}`}><i />{statusText}</span>
          </div>
          <div className="chat-topbar-actions">
            <button className="chat-icon-button" type="button" aria-label="重新连接后端" disabled={busy} onClick={() => setReloadToken((value) => value + 1)}><Icon name="settings" size={18} /></button>
          </div>
        </header>
        <section
          ref={conversationRef}
          className="conversation"
          aria-label="Agent 对话"
          onScroll={(event) => {
            const element = event.currentTarget
            followOutputRef.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80
          }}
        >
          <div className="conversation-inner">
            {error && <div className="agent-error" role="alert"><span>{error}</span><button type="button" onClick={() => setReloadToken((value) => value + 1)}>重试连接</button></div>}
            <MessageTimeline messages={messages} busy={busy || loadingSession} />
            {messages.length === 1 && messages[0].id === 'welcome' && (
              <div className="starter-prompts">
                {STARTER_PROMPTS.map((prompt) => <button type="button" key={prompt} onClick={() => setInput(prompt)}>{prompt}<Icon name="chevron" size={15} /></button>)}
              </div>
            )}
          </div>
        </section>
        <footer className="composer-area">
          <ChatComposer
            value={input}
            busy={busy}
            models={models}
            skills={compatibleSkills}
            selectedModelId={selectedModelId}
            selectedSkillId={selectedSkillId}
            contextStats={contextStats}
            knowledgeEnabled={knowledgeEnabled}
            canSend={connection.status === 'connected' && Boolean(selectedModel)}
            onChange={setInput}
            onModelChange={changeModel}
            onSkillChange={setSelectedSkillId}
            onKnowledgeChange={changeKnowledge}
            onSend={sendMessage}
            onStop={stopGeneration}
          />
          <p>{selectedModel?.available ? 'Agent 的输出可能存在错误，请核对重要信息。' : '当前模型尚未配置 Key，可发送消息检查联调错误。'}</p>
        </footer>
      </main>
    </div>
  )
}

export default AgentPage
