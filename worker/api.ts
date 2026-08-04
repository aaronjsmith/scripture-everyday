import type { Env } from './types'
import { handleOAuthCallback, startOAuth } from './oauth'
import { clearSessionCookie, readSession } from './session'

interface PersistedState {
  version: 1
  markedVerseIds: string[]
  notes: Record<string, unknown>
  rotationIndex: number
  stats: Record<string, unknown>
}

function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json')
  return new Response(JSON.stringify(data), { ...init, headers })
}

function progressKey(provider: string, sub: string): string {
  return `progress:${provider}:${sub}`
}

function isPersistedState(value: unknown): value is PersistedState {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    v.version === 1 &&
    Array.isArray(v.markedVerseIds) &&
    typeof v.notes === 'object' &&
    v.notes !== null &&
    typeof v.rotationIndex === 'number' &&
    typeof v.stats === 'object' &&
    v.stats !== null
  )
}

export async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const path = url.pathname

  if (path === '/api/auth/google/start' && request.method === 'GET') {
    return startOAuth(request, env, 'google')
  }
  if (path === '/api/auth/google/callback' && request.method === 'GET') {
    return handleOAuthCallback(request, env, 'google')
  }
  if (path === '/api/auth/microsoft/start' && request.method === 'GET') {
    return startOAuth(request, env, 'microsoft')
  }
  if (path === '/api/auth/microsoft/callback' && request.method === 'GET') {
    return handleOAuthCallback(request, env, 'microsoft')
  }

  if (path === '/api/auth/logout' && request.method === 'POST') {
    const headers = new Headers({ 'Content-Type': 'application/json' })
    headers.append('Set-Cookie', clearSessionCookie(url))
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers })
  }

  if (path === '/api/me' && request.method === 'GET') {
    if (!env.SESSION_SECRET) {
      return json({ user: null, configured: false })
    }
    const session = await readSession(env.SESSION_SECRET, request)
    if (!session) return json({ user: null, configured: true })
    return json({
      configured: true,
      user: {
        provider: session.provider,
        email: session.email,
        name: session.name,
      },
    })
  }

  if (path === '/api/progress') {
    if (!env.SESSION_SECRET) {
      return json({ error: 'Auth not configured' }, { status: 503 })
    }
    const session = await readSession(env.SESSION_SECRET, request)
    if (!session) return json({ error: 'Unauthorized' }, { status: 401 })

    const key = progressKey(session.provider, session.sub)

    if (request.method === 'GET') {
      const raw = await env.PROGRESS.get(key)
      if (!raw) return json({ state: null })
      try {
        const parsed = JSON.parse(raw) as unknown
        if (!isPersistedState(parsed)) return json({ state: null })
        return json({ state: parsed })
      } catch {
        return json({ state: null })
      }
    }

    if (request.method === 'PUT') {
      let body: unknown
      try {
        body = await request.json()
      } catch {
        return json({ error: 'Invalid JSON' }, { status: 400 })
      }
      const state = (body as { state?: unknown })?.state
      if (!isPersistedState(state)) {
        return json({ error: 'Invalid progress payload' }, { status: 400 })
      }
      if (
        !state.markedVerseIds.every((id) => typeof id === 'string') ||
        state.rotationIndex < 0
      ) {
        return json({ error: 'Invalid progress fields' }, { status: 400 })
      }

      await env.PROGRESS.put(key, JSON.stringify(state))
      return json({ ok: true })
    }

    return json({ error: 'Method not allowed' }, { status: 405 })
  }

  return json({ error: 'Not found' }, { status: 404 })
}
