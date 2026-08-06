export type VolumeId = 'bom' | 'bible' | 'pgp' | 'dc'

export const VOLUME_ORDER: VolumeId[] = ['bom', 'bible', 'pgp', 'dc']

export const VOLUME_LABELS: Record<VolumeId, string> = {
  bom: 'Book of Mormon',
  bible: 'Holy Bible',
  pgp: 'Pearl of Great Price',
  dc: 'Doctrine and Covenants',
}

/** Keep known volumes in canonical order; fall back to all if empty/invalid. */
export function normalizeEnabledVolumes(ids: unknown): VolumeId[] {
  const allowed = new Set<string>(VOLUME_ORDER)
  const incoming = Array.isArray(ids)
    ? ids.filter((id): id is VolumeId => typeof id === 'string' && allowed.has(id))
    : []
  const unique = new Set(incoming)
  const ordered = VOLUME_ORDER.filter((id) => unique.has(id))
  return ordered.length ? ordered : [...VOLUME_ORDER]
}

export interface Verse {
  id: string
  volume: VolumeId
  volumeLabel: string
  book: string
  chapter: number
  verse: number
  reference: string
  text: string
  textWeb?: string | null
  churchVolume: string | null
  churchBook: string | null
}

export interface VersesPayload {
  generatedAt: string
  sources: Record<string, string>
  counts: { total: number; byVolume: Record<string, number> }
  verses: Verse[]
}

export interface VerseNote {
  verseId: string
  reference: string
  volume: VolumeId
  text: string
  tags: string[]
  updatedAt: string
  createdAt: string
}

export interface AppStats {
  totalShown: number
  byVolume: Record<VolumeId, number>
  notesWritten: number
  uniqueTagged: number
  lastShownAt: string | null
}

export interface PersistedState {
  version: 1
  markedVerseIds: string[]
  notes: Record<string, VerseNote>
  rotationIndex: number
  /** When true, rotate only within this week's Come, Follow Me verse pool */
  cfmMode: boolean
  /** When true, advance through unmarked verses in corpus/scripture order */
  verseOrder: boolean
  /** When true, show the verse before and after the current verse */
  verseContext: boolean
  /** Volumes included in random / ordered rotation (at least one) */
  enabledVolumes: VolumeId[]
  stats: AppStats
}

export function emptyStats(): AppStats {
  return {
    totalShown: 0,
    byVolume: { bom: 0, bible: 0, pgp: 0, dc: 0 },
    notesWritten: 0,
    uniqueTagged: 0,
    lastShownAt: null,
  }
}

export function defaultPersistedState(): PersistedState {
  return {
    version: 1,
    markedVerseIds: [],
    notes: {},
    rotationIndex: 0,
    cfmMode: false,
    verseOrder: false,
    verseContext: false,
    enabledVolumes: [...VOLUME_ORDER],
    stats: emptyStats(),
  }
}
