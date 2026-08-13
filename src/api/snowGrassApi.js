const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '')

export class SnowGrassApiError extends Error {
  constructor(message, status = 0) {
    super(message)
    this.name = 'SnowGrassApiError'
    this.status = status
  }
}

async function readError(response) {
  try {
    const payload = await response.json()
    const detail = payload.detail || payload.message
    if (typeof detail === 'string') return detail
    if (detail?.message) return detail.message
    return `请求失败（${response.status}）`
  } catch {
    return `请求失败（${response.status}）`
  }
}

async function request(path, options = {}) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new SnowGrassApiError('无法连接 Snow Grass 后端')
  }

  if (!response.ok) throw new SnowGrassApiError(await readError(response), response.status)
  if (response.status === 204) return null
  return response.json()
}

function parseEventBlock(block) {
  let type = 'message'
  const dataLines = []

  for (const line of block.split(/\r?\n/)) {
    if (!line || line.startsWith(':')) continue
    const separator = line.indexOf(':')
    const field = separator === -1 ? line : line.slice(0, separator)
    const value = separator === -1 ? '' : line.slice(separator + 1).replace(/^ /, '')
    if (field === 'event') type = value
    if (field === 'data') dataLines.push(value)
  }

  const serialized = dataLines.join('\n')
  if (!serialized) return { type, data: {} }
  try {
    return { type, data: JSON.parse(serialized) }
  } catch {
    return { type, data: { raw: serialized } }
  }
}

function activityParams({ query = '', bundleId = '', start = '', end = '' } = {}) {
  const params = new URLSearchParams()
  if (query) params.set('query', query)
  if (bundleId) params.set('bundle_id', bundleId)
  if (start) params.set('start', start)
  if (end) params.set('end', end)
  return params
}

export const snowGrassApi = {
  health: () => request('/health'),
  listComponents: ({ query = '', category = '', status = '' } = {}) => {
    const params = new URLSearchParams()
    if (query) params.set('query', query)
    if (category) params.set('category', category)
    if (status) params.set('status', status)
    return request(`/components${params.size ? `?${params}` : ''}`)
  },
  createComponent: (payload) => request('/components', { method: 'POST', body: JSON.stringify(payload) }),
  getComponent: (componentId) => request(`/components/${componentId}`),
  saveComponentDraft: (componentId, expectedRevision, manifest) => request(`/components/${componentId}/draft`, {
    method: 'PUT', body: JSON.stringify({ expected_revision: expectedRevision, ...manifest }),
  }),
  testComponent: (componentId, payload) => request(`/components/${componentId}/test`, {
    method: 'POST', body: JSON.stringify(payload),
  }),
  publishComponent: (componentId, expectedRevision, releaseNote = '') => request(`/components/${componentId}/publish`, {
    method: 'POST', body: JSON.stringify({ expected_revision: expectedRevision, release_note: releaseNote || null }),
  }),
  setComponentStatus: (componentId, status) => request(`/components/${componentId}/status`, {
    method: 'PUT', body: JSON.stringify({ status }),
  }),
  getComponentLibrary: () => request('/component-library'),
  listBusinessPacks: () => request('/business-packs'),
  listWorkflows: (businessType = '') => request(`/workflows${businessType ? `?business_type=${encodeURIComponent(businessType)}` : ''}`),
  createWorkflow: (payload) => request('/workflows', { method: 'POST', body: JSON.stringify(payload) }),
  getWorkflow: (workflowId) => request(`/workflows/${workflowId}`),
  listWorkflowVersions: (workflowId) => request(`/workflows/${workflowId}/versions`),
  copyWorkflow: (workflowId, name) => request(`/workflows/${workflowId}/copy`, { method: 'POST', body: JSON.stringify({ name }) }),
  setWorkflowStatus: (workflowId, status) => request(`/workflows/${workflowId}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  saveWorkflowDraft: (workflowId, expectedRevision, graph) => request(`/workflows/${workflowId}/draft`, {
    method: 'PUT',
    body: JSON.stringify({ expected_revision: expectedRevision, graph }),
  }),
  validateWorkflow: (workflowId) => request(`/workflows/${workflowId}/validate`, { method: 'POST' }),
  previewWorkflow: (workflowId, draftRevision, input = {}) => request(`/workflows/${workflowId}/preview`, {
    method: 'POST',
    body: JSON.stringify({ draft_revision: draftRevision, input }),
  }),
  publishWorkflow: (workflowId, expectedRevision, { versionNote = '', activate = true } = {}) => request(`/workflows/${workflowId}/publish`, {
    method: 'POST',
    body: JSON.stringify({ expected_revision: expectedRevision, version_note: versionNote || null, activate }),
  }),
  deployWorkflow: (workflowId, versionId, expectedCurrentVersionId, reason = '') => request(`/workflows/${workflowId}/deployments`, {
    method: 'POST', body: JSON.stringify({ version_id: versionId, expected_current_version_id: expectedCurrentVersionId, reason: reason || null }),
  }),
  rollbackWorkflow: (workflowId, targetVersionId, expectedCurrentVersionId, reason = '') => request(`/workflows/${workflowId}/rollback`, {
    method: 'POST', body: JSON.stringify({ target_version_id: targetVersionId, expected_current_version_id: expectedCurrentVersionId, reason: reason || null }),
  }),
  listWorkflowRuns: ({ workflowId = '', status = '', versionId = '', preview = '', startedAfter = '', limit = 20, offset = 0 } = {}) => {
    const params = new URLSearchParams()
    if (workflowId) params.set('workflow_id', workflowId)
    if (status) params.set('status', status)
    if (versionId) params.set('version_id', versionId)
    if (preview !== '') params.set('preview', String(preview))
    if (startedAfter) params.set('started_after', startedAfter)
    params.set('limit', String(limit))
    params.set('offset', String(offset))
    return request(`/workflow-runs${params.size ? `?${params}` : ''}`)
  },
  getWorkflowRun: (runId) => request(`/workflow-runs/${runId}`),
  listModels: () => request('/models'),
  listSkills: () => request('/skills'),
  listAgentRuntimes: () => request('/agent-runtimes'),
  listAdminSkills: ({ query = '', source = '', status = '' } = {}) => {
    const params = new URLSearchParams()
    if (query) params.set('query', query)
    if (source) params.set('source', source)
    if (status) params.set('status', status)
    const suffix = params.size ? `?${params}` : ''
    return request(`/admin/skills${suffix}`)
  },
  getAdminSkill: (skillId) => request(`/admin/skills/${skillId}`),
  createAdminSkill: ({ id, name, description }) => request('/admin/skills', {
    method: 'POST',
    body: JSON.stringify({ id, name, description }),
  }),
  saveSkillDraft: (skillId, expectedRevision, content) => request(`/admin/skills/${skillId}/draft`, {
    method: 'PUT',
    body: JSON.stringify({ expected_revision: expectedRevision, content }),
  }),
  validateSkill: (skillId, expectedRevision) => request(`/admin/skills/${skillId}/validate`, {
    method: 'POST',
    body: JSON.stringify({ expected_revision: expectedRevision }),
  }),
  publishSkill: (skillId, { version, expectedRevision, activate = true, releaseNotes = null }) => request(`/admin/skills/${skillId}/publish`, {
    method: 'POST',
    body: JSON.stringify({
      version,
      expected_revision: expectedRevision,
      activate,
      release_notes: releaseNotes,
    }),
  }),
  activateSkillRelease: (skillId, releaseId) => request(`/admin/skills/${skillId}/releases/${releaseId}/activate`, {
    method: 'POST',
  }),
  setSkillEnabled: (skillId, enabled) => request(`/admin/skills/${skillId}/enabled`, {
    method: 'PUT',
    body: JSON.stringify({ enabled }),
  }),
  cloneSkill: (skillId, { newId, newName, releaseId = null }) => request(`/admin/skills/${skillId}/clone`, {
    method: 'POST',
    body: JSON.stringify({ new_id: newId, new_name: newName, release_id: releaseId }),
  }),
  archiveSkill: (skillId, expectedRevision) => request(`/admin/skills/${skillId}/archive`, {
    method: 'POST',
    body: JSON.stringify({ expected_revision: expectedRevision }),
  }),
  listSessions: () => request('/sessions'),
  usageSummary: (days = 30) => request(`/usage/summary?days=${days}`),
  localUsage: (days = 30) => request(`/usage/local?days=${days}`),
  listActivityEvents: ({ page = 1, pageSize = 50, deduplicate = true, dedupeWindowSeconds = 5, query = '', bundleId = '', start = '', end = '', signal } = {}) => {
    const params = activityParams({ query, bundleId, start, end })
    params.set('page', String(page))
    params.set('page_size', String(pageSize))
    params.set('deduplicate', String(deduplicate))
    params.set('dedupe_window_seconds', String(dedupeWindowSeconds))
    return request(`/activity-events/page?${params}`, { signal })
  },
  activitySummary: ({ dedupeWindowSeconds = 5, timezoneOffsetMinutes = -new Date().getTimezoneOffset(), query = '', bundleId = '', start = '', end = '', signal } = {}) => {
    const params = activityParams({ query, bundleId, start, end })
    params.set('dedupe_window_seconds', String(dedupeWindowSeconds))
    params.set('timezone_offset_minutes', String(timezoneOffsetMinutes))
    return request(`/activity-events/summary?${params}`, { signal })
  },
  activityAnalysisStats: ({ query = '', bundleId = '', start = '', end = '', signal } = {}) => {
    const params = activityParams({ query, bundleId, start, end })
    const suffix = params.size ? `?${params}` : ''
    return request(`/activity-events/analysis-stats${suffix}`, { signal })
  },
  listHourlyActivitySummaries: ({ limit = 24, start = '', end = '', status = '', signal } = {}) => {
    const params = new URLSearchParams({ limit: String(limit) })
    if (start) params.set('start', start)
    if (end) params.set('end', end)
    if (status) params.set('status', status)
    return request(`/activity-events/hourly-summaries?${params}`, { signal })
  },
  deleteActivityEvent: (eventId) => request(`/activity-events/${encodeURIComponent(eventId)}`, {
    method: 'DELETE',
  }),
  deleteActivityRange: ({ start, end }) => {
    const params = new URLSearchParams({ start, end })
    return request(`/activity-events/range?${params}`, { method: 'DELETE' })
  },
  listMessages: (sessionId) => request(`/sessions/${sessionId}/messages`),
  getSessionMemory: (sessionId) => request(`/sessions/${sessionId}/memory`),
  createSession: ({ title, modelId, skillId, knowledgeEnabled = false, runtimeId = 'native' }) => request('/sessions', {
    method: 'POST',
    body: JSON.stringify({
      title,
      model_id: modelId,
      skill_id: skillId || null,
      knowledge_enabled: knowledgeEnabled,
      runtime_id: runtimeId,
    }),
  }),
  updateSessionKnowledge: (sessionId, enabled) => request(`/sessions/${sessionId}/knowledge`, {
    method: 'PATCH',
    body: JSON.stringify({ enabled }),
  }),
  knowledgeStats: () => request('/knowledge/stats'),
  listKnowledgeBases: () => request('/knowledge/bases'),
  updateKnowledgeBase: (sourceType, enabled) => request(`/knowledge/bases/${sourceType}`, {
    method: 'PATCH',
    body: JSON.stringify({ enabled }),
  }),
  listKnowledgeDocuments: ({ page = 1, pageSize = 50, query = '', sourceType = '', status = '', start = '', end = '', signal } = {}) => {
    const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
    if (query) params.set('query', query)
    if (sourceType) params.set('source_type', sourceType)
    if (status) params.set('status', status)
    if (start) params.set('start', start)
    if (end) params.set('end', end)
    return request(`/knowledge/documents?${params}`, { signal })
  },
  searchKnowledge: ({ query, limit = 8, sourceTypes = null, start = null, end = null }) => request('/knowledge/search', {
    method: 'POST',
    body: JSON.stringify({ query, limit, source_types: sourceTypes, start, end }),
  }),
  updateKnowledgeStatus: (documentId, status) => request(`/knowledge/documents/${documentId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }),
  batchKnowledge: (documentIds, action) => request('/knowledge/documents/batch', {
    method: 'POST',
    body: JSON.stringify({ document_ids: documentIds, action }),
  }),
  deleteKnowledgeDocument: (documentId) => request(`/knowledge/documents/${documentId}`, { method: 'DELETE' }),
  reindexKnowledge: ({ sourceTypes = null, start = null, restoreDeleted = false } = {}) => request('/knowledge/reindex', {
    method: 'POST',
    body: JSON.stringify({ source_types: sourceTypes, start, restore_deleted: restoreDeleted }),
  }),
  async streamMessage({ sessionId, content, modelId, skillId, knowledgeEnabled, signal, onEvent }) {
    let response
    try {
      response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/messages/stream`, {
        method: 'POST',
        headers: { Accept: 'text/event-stream', 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, model_id: modelId, skill_id: skillId || null, knowledge_enabled: knowledgeEnabled }),
        signal,
      })
    } catch (error) {
      if (error.name === 'AbortError') throw error
      throw new SnowGrassApiError('无法连接 Snow Grass 后端')
    }

    if (!response.ok) throw new SnowGrassApiError(await readError(response), response.status)
    if (!response.body) throw new SnowGrassApiError('当前浏览器不支持流式响应')

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    const flush = async (final = false) => {
      let boundary = buffer.match(/\r?\n\r?\n/)
      while (boundary) {
        const block = buffer.slice(0, boundary.index)
        buffer = buffer.slice(boundary.index + boundary[0].length)
        if (block.trim()) await onEvent(parseEventBlock(block))
        boundary = buffer.match(/\r?\n\r?\n/)
      }
      if (final && buffer.trim()) {
        await onEvent(parseEventBlock(buffer))
        buffer = ''
      }
    }

    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        await flush()
      }
      buffer += decoder.decode()
      await flush(true)
    } finally {
      reader.releaseLock()
    }
  },
}
