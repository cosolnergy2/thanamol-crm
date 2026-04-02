import { z } from 'zod'

const Env = z.object({
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  LOG_FORMAT: z.enum(['json', 'pretty']).default('pretty'),
  CHROME_DATA_DIR: z.string().default('./chrome-data'),
  HEADLESS: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),
  VIEWPORT_WIDTH: z.coerce.number().default(1920),
  VIEWPORT_HEIGHT: z.coerce.number().default(1080),
  REPORT_DIR: z.string().default('./reports'),
})

export const config = Env.parse(process.env)
