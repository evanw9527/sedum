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
  } catch {
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

export const snowGrassApi = {
  health: () => request('/health'),
  listModels: () => request('/models'),
  listSkills: () => request('/skills'),
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
  listMessages: (sessionId) => request(`/sessions/${sessionId}/messages`),
  getSessionMemory: (sessionId) => request(`/sessions/${sessionId}/memory`),
  createSession: ({ title, modelId, skillId }) => request('/sessions', {
    method: 'POST',
    body: JSON.stringify({ title, model_id: modelId, skill_id: skillId || null }),
  }),
  async streamMessage({ sessionId, content, modelId, skillId, signal, onEvent }) {
    let response
    try {
      response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/messages/stream`, {
        method: 'POST',
        headers: { Accept: 'text/event-stream', 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, model_id: modelId, skill_id: skillId || null }),
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
