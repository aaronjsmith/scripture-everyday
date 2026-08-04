export type AuthProvider = 'google' | 'microsoft'

export interface Env {
  PROGRESS: KVNamespace
  ASSETS: Fetcher
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  MICROSOFT_CLIENT_ID?: string
  MICROSOFT_CLIENT_SECRET?: string
  SESSION_SECRET?: string
}

export interface SessionUser {
  provider: AuthProvider
  sub: string
  email: string
  name: string
  exp: number
}

export interface OAuthStatePayload {
  provider: AuthProvider
  state: string
  codeVerifier: string
  exp: number
}
