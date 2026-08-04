import type { OAuthStatePayload, SessionUser } from './types'

const SESSION_COOKIE = 'scriptday_session'
const OAUTH_COOKIE = 'scriptday_oauth'
const SESSION_TTL_SEC = 60 * 60 * 24 * 30
const OAUTH_TTL_SEC = 60 * 15

function bytesToBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let binary = ''
  for (const b of view) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4))
  const binary = atob(padded + pad)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
  return out
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

async function sign(secret: string, payload: string): Promise<string> {
  const key = await importHmacKey(secret)
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return bytesToBase64Url(sig)
}

async function seal(
  secret: string,
  data: Record<string, unknown>,
): Promise<string> {
  const payload = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(data)))
  const signature = await sign(secret, payload)
  return `${payload}.${signature}`
}

async function unseal<T>(secret: string, token: string): Promise<T | null> {
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return null
  const expected = await sign(secret, payload)
  if (expected !== signature) return null
  try {
    const json = new TextDecoder().decode(base64UrlToBytes(payload))
    return JSON.parse(json) as T
  } catch {
    return null
  }
}

function parseCookies(header: string | null): Record<string, string> {
  if (!header) return {}
  const out: Record<string, string> = {}
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    const key = part.slice(0, idx).trim()
    const value = part.slice(idx + 1).trim()
    out[key] = decodeURIComponent(value)
  }
  return out
}

function cookieOptions(maxAge: number, requestUrl: URL): string {
  const secure = requestUrl.protocol === 'https:' ? '; Secure' : ''
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`
}

export async function createSessionCookie(
  secret: string,
  user: Omit<SessionUser, 'exp'>,
  requestUrl: URL,
): Promise<string> {
  const token = await seal(secret, {
    ...user,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SEC,
  })
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; ${cookieOptions(SESSION_TTL_SEC, requestUrl)}`
}

export function clearSessionCookie(requestUrl: URL): string {
  return `${SESSION_COOKIE}=; ${cookieOptions(0, requestUrl)}`
}

export async function readSession(
  secret: string,
  request: Request,
): Promise<SessionUser | null> {
  const cookies = parseCookies(request.headers.get('Cookie'))
  const raw = cookies[SESSION_COOKIE]
  if (!raw) return null
  const session = await unseal<SessionUser>(secret, raw)
  if (!session?.sub || !session.provider || !session.exp) return null
  if (session.exp < Math.floor(Date.now() / 1000)) return null
  return session
}

export async function createOAuthCookie(
  secret: string,
  payload: Omit<OAuthStatePayload, 'exp'>,
  requestUrl: URL,
): Promise<string> {
  const token = await seal(secret, {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + OAUTH_TTL_SEC,
  })
  return `${OAUTH_COOKIE}=${encodeURIComponent(token)}; ${cookieOptions(OAUTH_TTL_SEC, requestUrl)}`
}

export function clearOAuthCookie(requestUrl: URL): string {
  return `${OAUTH_COOKIE}=; ${cookieOptions(0, requestUrl)}`
}

export async function readOAuthState(
  secret: string,
  request: Request,
): Promise<OAuthStatePayload | null> {
  const cookies = parseCookies(request.headers.get('Cookie'))
  const raw = cookies[OAUTH_COOKIE]
  if (!raw) return null
  const state = await unseal<OAuthStatePayload>(secret, raw)
  if (!state?.state || !state.codeVerifier || !state.provider || !state.exp) {
    return null
  }
  if (state.exp < Math.floor(Date.now() / 1000)) return null
  return state
}

export function randomUrlSafe(bytes = 32): string {
  const buf = new Uint8Array(bytes)
  crypto.getRandomValues(buf)
  return bytesToBase64Url(buf)
}

export async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(verifier),
  )
  return bytesToBase64Url(digest)
}

export { SESSION_COOKIE }
