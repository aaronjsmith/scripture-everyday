export type VolumeId = 'bom' | 'bible' | 'pgp' | 'dc'

export const VOLUME_ORDER: VolumeId[] = ['bom', 'bible', 'pgp', 'dc']

export const VOLUME_LABELS: Record<VolumeId, string> = {
  bom: 'Book of Mormon',
  bible: 'Holy Bible',
  pgp: 'Pearl of Great Price',
  dc: 'Doctrine and Covenants',
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
    stats: emptyStats(),
  }
}
