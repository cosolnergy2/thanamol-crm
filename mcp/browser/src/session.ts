import { BrowserSession } from '@7tapat/box-service'
import { ResultAsync, errAsync, okAsync } from 'neverthrow'
import { join } from 'path'

import { config } from './config'

type SessionState = 'idle' | 'launching' | 'ready'

let session: BrowserSession | null = null
let state: SessionState = 'idle'

export function getSessionState(): SessionState {
  return state
}

interface LaunchOptions {
  headless?: boolean
  viewport?: { width: number; height: number }
}

export function ensureLaunched(options?: LaunchOptions): ResultAsync<BrowserSession, Error> {
  if (session && state !== 'idle') return okAsync(session)

  state = 'launching'
  session = new BrowserSession()

  const cookiesPath = join(config.CHROME_DATA_DIR, 'cookies.json')
  const currentSession = session

  return ResultAsync.fromPromise(
    currentSession.launch({
      stealth: true,
      headless: options?.headless ?? config.HEADLESS,
      cookiesPath,
      locale: 'th-TH',
      timezone: 'Asia/Bangkok',
      viewport: options?.viewport ?? {
        width: config.VIEWPORT_WIDTH,
        height: config.VIEWPORT_HEIGHT,
      },
    }),
    (e) => new Error(`Failed to launch browser: ${String(e)}`),
  ).andThen((result) => {
    if (result.isErr()) {
      session = null
      state = 'idle'
      return errAsync(new Error(`Failed to launch browser: ${result.error.message}`))
    }

    state = 'ready'
    return okAsync(currentSession)
  })
}

export async function closeSession(): Promise<void> {
  if (!session) return
  await session.saveCookies()
  await session.close()
  session = null
  state = 'idle'
}
