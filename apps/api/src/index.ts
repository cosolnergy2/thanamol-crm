import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'

const API_PORT = Number(process.env.PORT ?? 3000)

const app = new Elysia()
  .use(cors())
  .get('/api/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }))
  .listen(API_PORT)

console.log(`API running at http://localhost:${API_PORT}`)
