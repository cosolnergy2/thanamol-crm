import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'

import { closeSession } from './session'
import { registerBrowserTools, registerScraperTools, registerReportTools } from './tools'
import { register, httpRequestsTotal, httpRequestDuration, httpRequestsInProgress } from './metrics'

const PORT = parseInt(process.env.MCP_PORT ?? '3002', 10)

function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'automated-test-mcp',
    version: '0.0.1',
  })

  registerBrowserTools(server)
  registerScraperTools(server)
  registerReportTools(server)

  return server
}

const transport = new WebStandardStreamableHTTPServerTransport({
  sessionIdGenerator: () => crypto.randomUUID(),
})

const server = createMcpServer()
await server.connect(transport)

Bun.serve({
  port: PORT,
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url)
    const route = url.pathname
    const method = req.method
    httpRequestsInProgress.inc()
    const timer = httpRequestDuration.startTimer({ method, route })

    let response: Response

    if (method === 'GET' && route === '/health') {
      response = Response.json({ status: 'ok' })
    } else if (method === 'GET' && route === '/metrics') {
      const metrics = await register.metrics()
      response = new Response(metrics, { headers: { 'Content-Type': register.contentType } })
    } else if (route === '/mcp') {
      response = await transport.handleRequest(req)
    } else {
      response = new Response('Not found', { status: 404 })
    }

    timer()
    httpRequestsInProgress.dec()
    httpRequestsTotal.inc({ method, route, status_code: String(response.status) })

    return response
  },
})

console.error(`MCP HTTP server (automated-test-mcp) listening on port ${PORT}`)

const cleanup = async () => {
  await closeSession()
  await server.close()
  process.exit(0)
}

process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)
