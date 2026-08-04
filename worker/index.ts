import { handleApi } from './api'
import type { Env } from './types'

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api/')) {
      return handleApi(request, env)
    }

    // Static assets (SPA fallback configured in wrangler assets)
    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>
