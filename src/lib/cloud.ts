import type { PersistedState, VerseNote, VolumeId } from './types'

export type AuthProvider = 'google' | 'microsoft'

export type SyncStatus = 'local-only' | 'syncing' | 'synced' | 'error'

export interface CloudUser {
  provider: AuthProvider
  email: string
  name: string
}

export interface MeResponse {
  configured: boolean
  user: CloudUser | null
}

function isVerseNote(value: unknown): value is VerseNote {
  if (!value || typeof value !== 'object') return false
  const n = value as Record<string, unknown>
  return (
    typeof n.verseId === 'string' &&
    typeof n.reference === 'string' &&
    typeof n.text === 'string' &&
    Array.isArray(n.tags) &&
    typeof n.updatedAt === 'string'
  )
}

function mergeNotes(
  a: Record<string, VerseNote>,
  b: Record<string, VerseNote>,
): Record<string, VerseNote> {
  const out: Record<string, VerseNote> = { ...a }
  for (const [id, note] of Object.entries(b)) {
    const existing = out[id]
    if (!existing) {
      out[id] = note
      continue
    }
    out[id] =
      new Date(note.updatedAt).getTime() >= new Date(existing.updatedAt).getTime()
        ? note
        : existing
  }
  return out
}

function mergeByVolume(
  a: Record<VolumeId, number>,
  b: Record<VolumeId, number>,
): Record<VolumeId, number> {
  return {
    bom: Math.max(a.bom ?? 0, b.bom ?? 0),
    bible: Math.max(a.bible ?? 0, b.bible ?? 0),
    pgp: Math.max(a.pgp ?? 0, b.pgp ?? 0),
    dc: Math.max(a.dc ?? 0, b.dc ?? 0),
  }
}

function recomputeStats(
  markedVerseIds: string[],
  notes: Record<string, VerseNote>,
  byVolumeHint: Record<VolumeId, number>,
  lastShownAt: string | null,
): PersistedState['stats'] {
  const noteValues = Object.values(notes)
  return {
    totalShown: markedVerseIds.length,
    byVolume: byVolumeHint,
    notesWritten: noteValues.filter((n) => n.text.trim()).length,
    uniqueTagged: noteValues.filter((n) => n.tags.length > 0).length,
    lastShownAt,
  }
}

/** Merge local and remote progress: union marked ids, newer notes win. */
export function mergeProgress(
  local: PersistedState,
  remote: PersistedState | null,
): PersistedState {
  if (!remote) return local

  const markedSet = new Set([...local.markedVerseIds, ...remote.markedVerseIds])
  const markedVerseIds = [...markedSet]

  const remoteNotes: Record<string, VerseNote> = {}
  for (const [id, note] of Object.entries(remote.notes)) {
    if (isVerseNote(note)) remoteNotes[id] = note
  }
  const notes = mergeNotes(local.notes, remoteNotes)

  const byVolume = mergeByVolume(local.stats.byVolume, remote.stats.byVolume)
  const lastShownAt =
    [local.stats.lastShownAt, remote.stats.lastShownAt]
      .filter((v): v is string => typeof v === 'string')
      .sort()
      .at(-1) ?? null

  return {
    version: 1,
    markedVerseIds,
    notes,
    rotationIndex: Math.max(local.rotationIndex, remote.rotationIndex),
    cfmMode: local.cfmMode || remote.cfmMode === true,
    stats: recomputeStats(markedVerseIds, notes, byVolume, lastShownAt),
  }
}

export async function fetchMe(): Promise<MeResponse> {
  const res = await fetch('/api/me', { credentials: 'include' })
  if (!res.ok) return { configured: false, user: null }
  return (await res.json()) as MeResponse
}

export async function fetchRemoteProgress(): Promise<PersistedState | null> {
  const res = await fetch('/api/progress', { credentials: 'include' })
  if (res.status === 401) return null
  if (!res.ok) throw new Error(`Could not load cloud progress (${res.status})`)
  const data = (await res.json()) as { state: PersistedState | null }
  return data.state
}

export async function pushProgress(state: PersistedState): Promise<void> {
  const res = await fetch('/api/progress', {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state }),
  })
  if (!res.ok) throw new Error(`Could not save cloud progress (${res.status})`)
}

export async function logoutCloud(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
}

export function authStartUrl(provider: AuthProvider): string {
  return `/api/auth/${provider}/start`
}
