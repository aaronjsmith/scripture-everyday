import type { AuthProvider, Env } from './types'
import {
  clearOAuthCookie,
  createOAuthCookie,
  createSessionCookie,
  pkceChallenge,
  randomUrlSafe,
  readOAuthState,
} from './session'

interface ProviderConfig {
  authorizeUrl: string
  tokenUrl: string
  userInfoUrl: string
  scopes: string
  clientId: string
  clientSecret: string
}

function providerConfig(env: Env, provider: AuthProvider): ProviderConfig | null {
  if (provider === 'google') {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return null
    return {
      authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      userInfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
      scopes: 'openid email profile',
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    }
  }

  if (!env.MICROSOFT_CLIENT_ID || !env.MICROSOFT_CLIENT_SECRET) return null
  return {
    authorizeUrl:
      'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    userInfoUrl: 'https://graph.microsoft.com/oidc/userinfo',
    scopes: 'openid email profile',
    clientId: env.MICROSOFT_CLIENT_ID,
    clientSecret: env.MICROSOFT_CLIENT_SECRET,
  }
}

function redirectUri(requestUrl: URL, provider: AuthProvider): string {
  return `${requestUrl.origin}/api/auth/${provider}/callback`
}

export async function startOAuth(
  request: Request,
  env: Env,
  provider: AuthProvider,
): Promise<Response> {
  const cfg = providerConfig(env, provider)
  if (!cfg) {
    return new Response(`${provider} OAuth is not configured`, { status: 503 })
  }
  if (!env.SESSION_SECRET) {
    return new Response('SESSION_SECRET is not configured', { status: 503 })
  }

  const requestUrl = new URL(request.url)
  const state = randomUrlSafe(24)
  const codeVerifier = randomUrlSafe(48)
  const challenge = await pkceChallenge(codeVerifier)

  const authUrl = new URL(cfg.authorizeUrl)
  authUrl.searchParams.set('client_id', cfg.clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri(requestUrl, provider))
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', cfg.scopes)
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('code_challenge', challenge)
  authUrl.searchParams.set('code_challenge_method', 'S256')
  if (provider === 'google') {
    authUrl.searchParams.set('access_type', 'online')
    authUrl.searchParams.set('prompt', 'select_account')
  }

  const headers = new Headers({ Location: authUrl.toString() })
  headers.append(
    'Set-Cookie',
    await createOAuthCookie(
      env.SESSION_SECRET,
      { provider, state, codeVerifier },
      requestUrl,
    ),
  )
  return new Response(null, { status: 302, headers })
}

export async function handleOAuthCallback(
  request: Request,
  env: Env,
  provider: AuthProvider,
): Promise<Response> {
  const requestUrl = new URL(request.url)
  const cfg = providerConfig(env, provider)
  if (!cfg || !env.SESSION_SECRET) {
    return new Response('OAuth is not configured', { status: 503 })
  }

  const error = requestUrl.searchParams.get('error')
  if (error) {
    return Response.redirect(
      `${requestUrl.origin}/?auth_error=${encodeURIComponent(error)}`,
      302,
    )
  }

  const code = requestUrl.searchParams.get('code')
  const state = requestUrl.searchParams.get('state')
  const oauthState = await readOAuthState(env.SESSION_SECRET, request)

  if (
    !code ||
    !state ||
    !oauthState ||
    oauthState.provider !== provider ||
    oauthState.state !== state
  ) {
    return Response.redirect(`${requestUrl.origin}/?auth_error=invalid_state`, 302)
  }

  const body = new URLSearchParams({
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri(requestUrl, provider),
    code_verifier: oauthState.codeVerifier,
  })

  const tokenRes = await fetch(cfg.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!tokenRes.ok) {
    return Response.redirect(`${requestUrl.origin}/?auth_error=token_exchange`, 302)
  }

  const tokenJson = (await tokenRes.json()) as {
    access_token?: string
    id_token?: string
  }
  if (!tokenJson.access_token) {
    return Response.redirect(`${requestUrl.origin}/?auth_error=no_access_token`, 302)
  }

  const userRes = await fetch(cfg.userInfoUrl, {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  })
  if (!userRes.ok) {
    return Response.redirect(`${requestUrl.origin}/?auth_error=userinfo`, 302)
  }

  const profile = (await userRes.json()) as {
    sub?: string
    id?: string
    email?: string
    name?: string
    preferred_username?: string
  }

  const sub = profile.sub ?? profile.id
  if (!sub) {
    return Response.redirect(`${requestUrl.origin}/?auth_error=no_subject`, 302)
  }

  const email = profile.email ?? profile.preferred_username ?? ''
  const name = profile.name ?? (email || 'Reader')

  const headers = new Headers({ Location: `${requestUrl.origin}/?auth=connected` })
  headers.append(
    'Set-Cookie',
    await createSessionCookie(
      env.SESSION_SECRET,
      { provider, sub, email, name },
      requestUrl,
    ),
  )
  headers.append('Set-Cookie', clearOAuthCookie(requestUrl))
  return new Response(null, { status: 302, headers })
}
