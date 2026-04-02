import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

import { ensureLaunched } from '../session'

const textResult = (text: string): CallToolResult => ({
  content: [{ type: 'text', text }],
})

const errorResult = (error: { readonly message: string }): CallToolResult => ({
  content: [{ type: 'text', text: `Error: ${error.message}` }],
  isError: true,
})

export function registerScraperTools(server: McpServer) {
  server.registerTool(
    'scraper_get_page_content',
    {
      description: 'Extract text content from the current page or a specific selector',
      inputSchema: {
        selector: z.string().optional().describe('CSS selector (default: body)'),
      },
    },
    async ({ selector }) => {
      const target = selector ?? 'body'
      const sessionResult = await ensureLaunched()
      if (sessionResult.isErr()) return errorResult(sessionResult.error)

      const result = await sessionResult.value.evaluate(
        `document.querySelector(${JSON.stringify(target)})?.innerText ?? ''`,
      )
      return result.match((text) => textResult(String(text)), errorResult)
    },
  )

  server.registerTool(
    'scraper_get_links',
    {
      description: 'Extract all links from the page or within a selector',
      inputSchema: {
        selector: z.string().optional().describe('CSS selector to scope (default: body)'),
        includeText: z.boolean().optional().describe('Include link text (default: true)'),
      },
    },
    async ({ selector, includeText }) => {
      const scope = JSON.stringify(selector ?? 'body')
      const withText = includeText ?? true
      const script = withText
        ? `Array.from(document.querySelector(${scope})?.querySelectorAll('a[href]') ?? []).map(a => ({ href: a.href, text: a.innerText.trim() }))`
        : `Array.from(document.querySelector(${scope})?.querySelectorAll('a[href]') ?? []).map(a => a.href)`

      const sessionResult = await ensureLaunched()
      if (sessionResult.isErr()) return errorResult(sessionResult.error)

      const result = await sessionResult.value.evaluate(script)
      return result.match((data) => textResult(JSON.stringify(data, null, 2)), errorResult)
    },
  )

  server.registerTool(
    'scraper_get_images',
    {
      description: 'Extract all image URLs from the page or within a selector',
      inputSchema: {
        selector: z.string().optional().describe('CSS selector to scope (default: body)'),
        includeAlt: z.boolean().optional().describe('Include alt text (default: true)'),
      },
    },
    async ({ selector, includeAlt }) => {
      const scope = JSON.stringify(selector ?? 'body')
      const withAlt = includeAlt ?? true
      const script = withAlt
        ? `Array.from(document.querySelector(${scope})?.querySelectorAll('img[src]') ?? []).map(img => ({ src: img.src, alt: img.alt }))`
        : `Array.from(document.querySelector(${scope})?.querySelectorAll('img[src]') ?? []).map(img => img.src)`

      const sessionResult = await ensureLaunched()
      if (sessionResult.isErr()) return errorResult(sessionResult.error)

      const result = await sessionResult.value.evaluate(script)
      return result.match((data) => textResult(JSON.stringify(data, null, 2)), errorResult)
    },
  )

  server.registerTool(
    'scraper_scroll_page',
    {
      description: 'Scroll the page to load more content (useful for infinite scroll)',
      inputSchema: {
        direction: z.enum(['down', 'up']).default('down').describe('Scroll direction'),
        amount: z.number().optional().describe('Pixels to scroll (default: viewport height)'),
        waitMs: z.number().optional().describe('Wait after scroll in ms (default: 1000)'),
      },
    },
    async ({ direction, amount, waitMs }) => {
      const distance = amount
        ? `${direction === 'down' ? amount : -amount}`
        : `${direction === 'down' ? '' : '-'}window.innerHeight`
      const script = `window.scrollBy(0, ${distance}); JSON.stringify({ scrollY: window.scrollY, scrollHeight: document.documentElement.scrollHeight, viewportHeight: window.innerHeight })`

      const sessionResult = await ensureLaunched()
      if (sessionResult.isErr()) return errorResult(sessionResult.error)

      const session = sessionResult.value
      const scrollResult = await session.evaluate(script)
      if (scrollResult.isErr()) return errorResult(scrollResult.error)

      const waitResult = await session.waitForTimeout(waitMs ?? 1000)
      if (waitResult.isErr()) return errorResult(waitResult.error)

      return textResult(String(scrollResult.value))
    },
  )

  server.registerTool(
    'scraper_get_page_html',
    {
      description: 'Get innerHTML of a selector for structured parsing',
      inputSchema: {
        selector: z.string().describe('CSS selector to get HTML from'),
      },
    },
    async ({ selector }) => {
      const sessionResult = await ensureLaunched()
      if (sessionResult.isErr()) return errorResult(sessionResult.error)

      const result = await sessionResult.value.evaluate(
        `document.querySelector(${JSON.stringify(selector)})?.innerHTML ?? ''`,
      )
      return result.match((html) => textResult(String(html)), errorResult)
    },
  )

  server.registerTool(
    'scraper_wait_for_navigation',
    {
      description: 'Wait for page load state to complete',
      inputSchema: {
        state: z
          .enum(['load', 'domcontentloaded', 'networkidle'])
          .optional()
          .describe('Load state to wait for (default: load)'),
      },
    },
    async ({ state }) => {
      const sessionResult = await ensureLaunched()
      if (sessionResult.isErr()) return errorResult(sessionResult.error)

      const result = await sessionResult.value.waitForLoadState(state)
      return result.match(() => textResult(`Navigation complete: ${state ?? 'load'}`), errorResult)
    },
  )

  server.registerTool(
    'scraper_get_current_url',
    {
      description: 'Get the current page URL',
    },
    async () => {
      const sessionResult = await ensureLaunched()
      if (sessionResult.isErr()) return errorResult(sessionResult.error)

      const result = sessionResult.value.url()
      return result.match((url) => textResult(url), errorResult)
    },
  )
}
