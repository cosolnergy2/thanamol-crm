import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

import { closeSession, ensureLaunched, getSessionState } from '../session'

const textResult = (text: string): CallToolResult => ({
  content: [{ type: 'text', text }],
})

const errorResult = (error: { readonly message: string }): CallToolResult => ({
  content: [{ type: 'text', text: `Error: ${error.message}` }],
  isError: true,
})

export function registerBrowserTools(server: McpServer) {
  server.registerTool(
    'browser_launch',
    {
      description: 'Launch browser (or confirm already launched)',
      inputSchema: {
        headless: z
          .boolean()
          .optional()
          .describe('Run in headless mode (default: from HEADLESS env)'),
        viewportWidth: z.number().optional().describe('Viewport width in pixels (default: 1920)'),
        viewportHeight: z.number().optional().describe('Viewport height in pixels (default: 1080)'),
      },
    },
    async ({ headless, viewportWidth, viewportHeight }) => {
      const viewport =
        viewportWidth && viewportHeight ? { width: viewportWidth, height: viewportHeight } : undefined
      const result = await ensureLaunched({ headless, viewport })
      return result.match(
        () => textResult(`Browser launched. State: ${getSessionState()}`),
        errorResult,
      )
    },
  )

  server.registerTool(
    'browser_goto',
    {
      description: 'Navigate to URL',
      inputSchema: {
        url: z.string().describe('URL to navigate to'),
      },
    },
    async ({ url }) => {
      const sessionResult = await ensureLaunched()
      if (sessionResult.isErr()) return errorResult(sessionResult.error)

      const result = await sessionResult.value.goto(url)
      return result.match(() => textResult(`Navigated to ${url}`), errorResult)
    },
  )

  server.registerTool(
    'browser_click',
    {
      description: 'Click element by selector',
      inputSchema: {
        selector: z.string().describe('CSS selector of element to click'),
      },
    },
    async ({ selector }) => {
      const sessionResult = await ensureLaunched()
      if (sessionResult.isErr()) return errorResult(sessionResult.error)

      const result = await sessionResult.value.click(selector)
      return result.match(() => textResult(`Clicked: ${selector}`), errorResult)
    },
  )

  server.registerTool(
    'browser_fill',
    {
      description: 'Fill input field with value',
      inputSchema: {
        selector: z.string().describe('CSS selector of input'),
        value: z.string().describe('Value to fill'),
      },
    },
    async ({ selector, value }) => {
      const sessionResult = await ensureLaunched()
      if (sessionResult.isErr()) return errorResult(sessionResult.error)

      const result = await sessionResult.value.fill(selector, value)
      return result.match(() => textResult(`Filled: ${selector}`), errorResult)
    },
  )

  server.registerTool(
    'browser_type_text',
    {
      description: 'Insert text via keyboard (no selector needed)',
      inputSchema: {
        text: z.string().describe('Text to type'),
      },
    },
    async ({ text }) => {
      const sessionResult = await ensureLaunched()
      if (sessionResult.isErr()) return errorResult(sessionResult.error)

      const result = await sessionResult.value.insertText(text)
      return result.match(() => textResult('Text typed'), errorResult)
    },
  )

  server.registerTool(
    'browser_press_key',
    {
      description: 'Press a keyboard key (e.g. Enter, Escape, Tab)',
      inputSchema: {
        key: z.string().describe('Key to press (e.g. "Enter", "Escape", "Meta+v")'),
      },
    },
    async ({ key }) => {
      const sessionResult = await ensureLaunched()
      if (sessionResult.isErr()) return errorResult(sessionResult.error)

      const result = await sessionResult.value.pressKey(key)
      return result.match(() => textResult(`Pressed: ${key}`), errorResult)
    },
  )

  server.registerTool(
    'browser_screenshot',
    {
      description: 'Take a screenshot of the current page, returns image',
      inputSchema: {
        fullPage: z.boolean().optional().describe('Capture full page (default false)'),
      },
    },
    async ({ fullPage }): Promise<CallToolResult> => {
      const sessionResult = await ensureLaunched()
      if (sessionResult.isErr()) return errorResult(sessionResult.error)

      const result = await sessionResult.value.screenshot({ fullPage })
      return result.match(
        (data) => ({
          content: [
            {
              type: 'image',
              data: Buffer.from(data).toString('base64'),
              mimeType: 'image/png',
            },
          ],
        }),
        errorResult,
      )
    },
  )

  server.registerTool(
    'browser_evaluate',
    {
      description: 'Run JavaScript in the browser page',
      inputSchema: {
        script: z.string().describe('JavaScript code to evaluate'),
      },
    },
    async ({ script }) => {
      const sessionResult = await ensureLaunched()
      if (sessionResult.isErr()) return errorResult(sessionResult.error)

      const result = await sessionResult.value.evaluate(script)
      return result.match((data) => textResult(JSON.stringify(data, null, 2)), errorResult)
    },
  )

  server.registerTool(
    'browser_wait_for_selector',
    {
      description: 'Wait for an element to appear on the page',
      inputSchema: {
        selector: z.string().describe('CSS selector to wait for'),
        state: z
          .enum(['attached', 'detached', 'visible', 'hidden'])
          .optional()
          .describe('State to wait for'),
        timeout: z.number().optional().describe('Timeout in ms'),
      },
    },
    async ({ selector, state, timeout }) => {
      const sessionResult = await ensureLaunched()
      if (sessionResult.isErr()) return errorResult(sessionResult.error)

      const result = await sessionResult.value.waitForSelector(selector, { state, timeout })
      return result.match(() => textResult(`Found: ${selector}`), errorResult)
    },
  )

  server.registerTool(
    'browser_get_text',
    {
      description: 'Get innerText of an element',
      inputSchema: {
        selector: z.string().describe('CSS selector of element'),
      },
    },
    async ({ selector }) => {
      const sessionResult = await ensureLaunched()
      if (sessionResult.isErr()) return errorResult(sessionResult.error)

      const result = await sessionResult.value.innerText(selector)
      return result.match((text) => textResult(text), errorResult)
    },
  )

  server.registerTool(
    'browser_close',
    {
      description: 'Close the browser and save cookies',
    },
    async () => {
      await closeSession()
      return textResult('Browser closed')
    },
  )
}
