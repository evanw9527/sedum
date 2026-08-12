import { afterEach, describe, expect, it, vi } from 'vitest'
import { snowGrassApi, SnowGrassApiError } from './snowGrassApi.js'

describe('snowGrassApi workflow errors', () => {
  afterEach(() => vi.unstubAllGlobals())

  it.each([409, 422])('preserves HTTP %s and backend detail', async (status) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status,
      json: async () => ({ detail: status === 409 ? 'revision conflict' : 'invalid port' }),
    }))
    const promise = snowGrassApi.saveWorkflowDraft('flow-id', 2, { nodes: [], edges: [] })
    await expect(promise).rejects.toEqual(expect.objectContaining({
      name: SnowGrassApiError.name,
      status,
      message: status === 409 ? 'revision conflict' : 'invalid port',
    }))
  })
})
