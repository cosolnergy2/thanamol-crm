import { Elysia, t } from 'elysia'
import { randomUUID } from 'crypto'
import { join, extname } from 'path'
import { mkdir } from 'fs/promises'

const UPLOADS_DIR = join(import.meta.dir, '../../uploads')
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']

export const uploadsRoutes = new Elysia({ prefix: '/api/uploads' })
  .post(
    '/',
    async ({ body }) => {
      const { file } = body

      if (file.size > MAX_FILE_SIZE) {
        throw new Error('File size exceeds 10MB limit')
      }

      if (!ALLOWED_TYPES.includes(file.type)) {
        throw new Error(`File type "${file.type}" is not allowed. Accepted: images, PDF`)
      }

      await mkdir(UPLOADS_DIR, { recursive: true })

      const ext = extname(file.name) || ''
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const filename = `${randomUUID()}-${safeName}`
      const filepath = join(UPLOADS_DIR, filename)

      const buffer = await file.arrayBuffer()
      await Bun.write(filepath, buffer)

      return {
        url: `/uploads/${filename}`,
        originalName: file.name,
        size: file.size,
        mimeType: file.type,
      }
    },
    {
      body: t.Object({
        file: t.File(),
      }),
    },
  )
