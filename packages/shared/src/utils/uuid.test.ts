import { describe, it, expect, vi, afterEach } from 'vitest'
import { generateUUID } from './uuid'

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

describe('generateUUID', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns a string matching UUID v4 format', () => {
    const id = generateUUID()
    expect(id).toMatch(UUID_V4_REGEX)
  })

  it('returns unique values on successive calls', () => {
    const ids = new Set(Array.from({ length: 10 }, () => generateUUID()))
    expect(ids.size).toBe(10)
  })

  it('uses crypto.randomUUID when available', () => {
    const mockUUID = '11111111-1111-4111-8111-111111111111'
    const randomUUIDSpy = vi.spyOn(crypto, 'randomUUID').mockReturnValue(mockUUID)
    const result = generateUUID()
    expect(result).toBe(mockUUID)
    expect(randomUUIDSpy).toHaveBeenCalledOnce()
  })

  it('falls back to getRandomValues when randomUUID is unavailable', () => {
    const originalRandomUUID = crypto.randomUUID
    // @ts-expect-error — simulating HTTP context where randomUUID is absent
    delete crypto.randomUUID

    const result = generateUUID()
    expect(result).toMatch(UUID_V4_REGEX)

    crypto.randomUUID = originalRandomUUID
  })
})
