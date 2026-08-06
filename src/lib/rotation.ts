import type { Verse, VolumeId } from './types'
import { VOLUME_ORDER, normalizeEnabledVolumes } from './types'

export function pickNextVerse(
  verses: Verse[],
  /** Verse IDs to skip (marked and/or already noted). */
  skipIds: Set<string>,
  rotationIndex: number,
  options: { verseOrder?: boolean; volumes?: VolumeId[] } = {},
): { verse: Verse; nextRotationIndex: number } | null {
  if (!verses.length) return null

  if (options.verseOrder) {
    return pickNextVerseInOrder(verses, skipIds, rotationIndex)
  }

  const volumes = normalizeEnabledVolumes(options.volumes ?? VOLUME_ORDER)

  for (let offset = 0; offset < volumes.length; offset++) {
    const volume = volumes[(rotationIndex + offset) % volumes.length]
    const unread = verses.filter(
      (v) => v.volume === volume && !skipIds.has(v.id),
    )

    if (unread.length > 0) {
      const verse = unread[Math.floor(Math.random() * unread.length)]
      return {
        verse,
        nextRotationIndex: (rotationIndex + offset + 1) % volumes.length,
      }
    }
  }

  // All skipped — reset cycle with a random verse from the next volume slot
  const volume = volumes[rotationIndex % volumes.length]
  const pool = verses.filter((v) => v.volume === volume)
  const fallbackPool = pool.length ? pool : verses
  const verse = fallbackPool[Math.floor(Math.random() * fallbackPool.length)]
  return {
    verse,
    nextRotationIndex: (rotationIndex + 1) % volumes.length,
  }
}

/** Next unmarked / unnoted verse in array order (corpus / CFM pool order). */
export function pickNextVerseInOrder(
  verses: Verse[],
  skipIds: Set<string>,
  rotationIndex: number,
): { verse: Verse; nextRotationIndex: number } {
  const unread = verses.find((v) => !skipIds.has(v.id))
  if (unread) {
    return { verse: unread, nextRotationIndex: rotationIndex }
  }

  // All skipped — restart at the beginning of the pool
  return { verse: verses[0], nextRotationIndex: rotationIndex }
}

/** Adjacent verses in the same book (literary context). */
export function findVerseNeighbors(
  verses: Verse[],
  current: Verse,
): { prev: Verse | null; next: Verse | null } {
  const idx = verses.findIndex((v) => v.id === current.id)
  if (idx < 0) return { prev: null, next: null }

  const before = idx > 0 ? verses[idx - 1] : null
  const after = idx < verses.length - 1 ? verses[idx + 1] : null

  return {
    prev: before && before.book === current.book ? before : null,
    next: after && after.book === current.book ? after : null,
  }
}

export function volumeProgress(
  verses: Verse[],
  markedIds: Set<string>,
  volume: VolumeId,
): { marked: number; total: number } {
  const total = verses.filter((v) => v.volume === volume).length
  const marked = verses.filter(
    (v) => v.volume === volume && markedIds.has(v.id),
  ).length
  return { marked, total }
}
