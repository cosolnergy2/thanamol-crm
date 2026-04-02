import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { join, resolve } from 'path'
import { mkdir, writeFile } from 'fs/promises'

import { ensureLaunched } from '../session'
import { config } from '../config'

const textResult = (text: string): CallToolResult => ({
  content: [{ type: 'text', text }],
})

const errorResult = (error: { readonly message: string }): CallToolResult => ({
  content: [{ type: 'text', text: `Error: ${error.message}` }],
  isError: true,
})

export function registerReportTools(server: McpServer) {
  server.registerTool(
    'test_report',
    {
      description: 'Generate a QA test summary report with screenshot. Saves markdown report and screenshot to reports directory.',
      inputSchema: {
        title: z.string().describe('Test report title'),
        summary: z.string().describe('Brief summary of the test'),
        steps: z
          .array(
            z.object({
              step: z.string().describe('Step description'),
              result: z.string().describe('Step result or observation'),
              status: z.enum(['pass', 'fail', 'skip']).describe('Step status'),
            }),
          )
          .describe('Array of test steps with results'),
        overallStatus: z.enum(['pass', 'fail']).describe('Overall test result'),
        includeScreenshot: z
          .boolean()
          .optional()
          .describe('Attach screenshot of current page state (default: true)'),
      },
    },
    async ({ title, summary, steps, overallStatus, includeScreenshot }): Promise<CallToolResult> => {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      const baseName = `${timestamp}_${slug}`

      await mkdir(config.REPORT_DIR, { recursive: true })

      const passCount = steps.filter((s) => s.status === 'pass').length
      const failCount = steps.filter((s) => s.status === 'fail').length
      const skipCount = steps.filter((s) => s.status === 'skip').length

      const statusIcon = overallStatus === 'pass' ? 'PASS' : 'FAIL'
      const stepsTable = steps
        .map((s) => {
          const icon = s.status === 'pass' ? '✅' : s.status === 'fail' ? '❌' : '⏭️'
          return `| ${icon} ${s.status.toUpperCase()} | ${s.step} | ${s.result} |`
        })
        .join('\n')

      let screenshotRef = ''
      let screenshotContent: CallToolResult['content'] = []

      if (includeScreenshot !== false) {
        const sessionResult = await ensureLaunched()
        if (sessionResult.isOk()) {
          const ssResult = await sessionResult.value.screenshot({ fullPage: false })
          if (ssResult.isOk()) {
            const screenshotPath = join(config.REPORT_DIR, `${baseName}.png`)
            await writeFile(screenshotPath, ssResult.value)
            screenshotRef = `\n## Screenshot\n\n![Screenshot](${baseName}.png)\n`
            screenshotContent = [
              {
                type: 'image',
                data: Buffer.from(ssResult.value).toString('base64'),
                mimeType: 'image/png',
              },
            ]
          }
        }
      }

      const markdown = `# Test Report: ${title}

**Status:** ${statusIcon}
**Date:** ${new Date().toISOString()}

## Summary

${summary}

## Results

| Status | Step | Result |
|--------|------|--------|
${stepsTable}

**Pass:** ${passCount} | **Fail:** ${failCount} | **Skip:** ${skipCount}
${screenshotRef}`

      const reportPath = join(config.REPORT_DIR, `${baseName}.md`)
      await writeFile(reportPath, markdown, 'utf-8')

      // Open the report in the browser for visual review
      const absoluteReportPath = resolve(reportPath)
      const sessionResult = await ensureLaunched()
      let openedInBrowser = false
      if (sessionResult.isOk()) {
        const gotoResult = await sessionResult.value.goto(`file://${absoluteReportPath}`)
        openedInBrowser = gotoResult.isOk()
      }

      return {
        content: [
          {
            type: 'text',
            text: `Report saved: ${reportPath}${openedInBrowser ? '\nReport opened in browser for review.' : ''}\n\n${markdown}`,
          },
          ...screenshotContent,
        ],
      }
    },
  )
}
