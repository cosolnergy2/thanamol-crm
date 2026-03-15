import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'

vi.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    notification: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    notificationPreference: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}))

import { prisma } from '../lib/prisma'
import { notificationsRoutes, notificationPreferencesRoutes } from './notifications'

const DEFAULT_JWT_SECRET = 'thanamol-jwt-secret-dev-only'

const jwtSigner = new Elysia()
  .use(jwt({ name: 'jwtAccess', secret: DEFAULT_JWT_SECRET, exp: '15m' }))
  .get('/sign', ({ jwtAccess }) => jwtAccess.sign({ sub: 'user-1' }))

const notifApp = new Elysia().use(notificationsRoutes)
const prefApp = new Elysia().use(notificationPreferencesRoutes)

async function signToken(): Promise<string> {
  const res = await jwtSigner.handle(new Request('http://localhost/sign'))
  return res.text()
}

async function requestNotif(
  method: string,
  path: string,
  body?: unknown,
  token?: string
): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return notifApp.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  )
}

async function requestPref(
  method: string,
  path: string,
  body?: unknown,
  token?: string
): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return prefApp.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  )
}

const mockAuthUser = {
  id: 'user-1',
  email: 'admin@example.com',
  first_name: 'Admin',
  last_name: 'User',
  avatar_url: null,
  is_active: true,
  roles: [],
}

const mockNotification = {
  id: 'notif-1',
  user_id: 'user-1',
  title: 'Test Notification',
  message: 'You have a new message',
  type: 'INFO',
  entity_type: null,
  entity_id: null,
  is_read: false,
  created_at: new Date(),
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.user.findUnique).mockResolvedValue(mockAuthUser as never)
})

describe('GET /api/notifications', () => {
  it('returns 401 without token', async () => {
    const res = await requestNotif('GET', '/api/notifications')
    expect(res.status).toBe(401)
  })

  it('returns paginated notifications for authenticated user', async () => {
    const token = await signToken()
    vi.mocked(prisma.notification.count).mockResolvedValue(1)
    vi.mocked(prisma.notification.findMany).mockResolvedValue([mockNotification] as never)

    const res = await requestNotif('GET', '/api/notifications', undefined, token)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.data).toHaveLength(1)
    expect(data.pagination.total).toBe(1)
  })

  it('filters by isRead=false', async () => {
    const token = await signToken()
    vi.mocked(prisma.notification.count).mockResolvedValue(1)
    vi.mocked(prisma.notification.findMany).mockResolvedValue([mockNotification] as never)

    const res = await requestNotif('GET', '/api/notifications?isRead=false', undefined, token)
    expect(res.status).toBe(200)
    expect(vi.mocked(prisma.notification.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ is_read: false }),
      })
    )
  })
})

describe('PUT /api/notifications/read-all', () => {
  it('returns 401 without token', async () => {
    const res = await requestNotif('PUT', '/api/notifications/read-all')
    expect(res.status).toBe(401)
  })

  it('marks all notifications as read', async () => {
    const token = await signToken()
    vi.mocked(prisma.notification.updateMany).mockResolvedValue({ count: 3 })

    const res = await requestNotif('PUT', '/api/notifications/read-all', undefined, token)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
  })
})

describe('PUT /api/notifications/:id/read', () => {
  it('returns 404 when notification not found', async () => {
    const token = await signToken()
    vi.mocked(prisma.notification.findUnique).mockResolvedValue(null)

    const res = await requestNotif('PUT', '/api/notifications/notif-999/read', undefined, token)
    expect(res.status).toBe(404)
  })

  it('returns 403 when notification belongs to another user', async () => {
    const token = await signToken()
    vi.mocked(prisma.notification.findUnique).mockResolvedValue({
      ...mockNotification,
      user_id: 'other-user',
    } as never)

    const res = await requestNotif('PUT', '/api/notifications/notif-1/read', undefined, token)
    expect(res.status).toBe(403)
  })

  it('marks notification as read', async () => {
    const token = await signToken()
    vi.mocked(prisma.notification.findUnique).mockResolvedValue(mockNotification as never)
    vi.mocked(prisma.notification.update).mockResolvedValue({
      ...mockNotification,
      is_read: true,
    } as never)

    const res = await requestNotif('PUT', '/api/notifications/notif-1/read', undefined, token)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.notification.is_read).toBe(true)
  })
})

describe('GET /api/notification-preferences', () => {
  it('returns 401 without token', async () => {
    const res = await requestPref('GET', '/api/notification-preferences')
    expect(res.status).toBe(401)
  })

  it('returns preferences for authenticated user', async () => {
    const token = await signToken()
    const mockPrefs = [
      {
        id: 'pref-1',
        user_id: 'user-1',
        notification_type: 'TASK_ASSIGNED',
        email_enabled: true,
        in_app_enabled: true,
        created_at: new Date(),
      },
    ]
    vi.mocked(prisma.notificationPreference.findMany).mockResolvedValue(mockPrefs as never)

    const res = await requestPref('GET', '/api/notification-preferences', undefined, token)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.data).toHaveLength(1)
  })
})

describe('PUT /api/notification-preferences', () => {
  it('upserts a notification preference', async () => {
    const token = await signToken()
    const mockPref = {
      id: 'pref-1',
      user_id: 'user-1',
      notification_type: 'TASK_ASSIGNED',
      email_enabled: false,
      in_app_enabled: true,
      created_at: new Date(),
    }
    vi.mocked(prisma.notificationPreference.upsert).mockResolvedValue(mockPref as never)

    const res = await requestPref(
      'PUT',
      '/api/notification-preferences',
      { notificationType: 'TASK_ASSIGNED', emailEnabled: false, inAppEnabled: true },
      token
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.preference.email_enabled).toBe(false)
  })

  it('returns 422 when notificationType is missing', async () => {
    const token = await signToken()
    const res = await requestPref(
      'PUT',
      '/api/notification-preferences',
      { emailEnabled: true },
      token
    )
    expect(res.status).toBe(422)
  })
})
