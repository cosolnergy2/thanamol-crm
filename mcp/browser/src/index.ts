import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { closeSession } from './session'
import { registerBrowserTools, registerScraperTools, registerReportTools } from './tools'

async function main() {
  const server = new McpServer({
    name: 'automated-test-mcp',
    version: '0.0.1',
  })

  registerBrowserTools(server)
  registerScraperTools(server)
  registerReportTools(server)

  const cleanup = async () => {
    await closeSession()
    await server.close()
    process.exit(0)
  }

  process.on('SIGINT', cleanup)
  process.on('SIGTERM', cleanup)

  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
