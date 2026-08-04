import type { Verse, VolumeId } from './types'
import { VOLUME_ORDER } from './types'

export function pickNextVerse(
  verses: Verse[],
  markedIds: Set<string>,
  rotationIndex: number,
  options: { verseOrder?: boolean } = {},
): { verse: Verse; nextRotationIndex: number } | null {
  if (!verses.length) return null

  if (options.verseOrder) {
    return pickNextVerseInOrder(verses, markedIds, rotationIndex)
  }

  for (let offset = 0; offset < VOLUME_ORDER.length; offset++) {
    const volume = VOLUME_ORDER[(rotationIndex + offset) % VOLUME_ORDER.length]
    const unread = verses.filter(
      (v) => v.volume === volume && !markedIds.has(v.id),
    )

    if (unread.length > 0) {
      const verse = unread[Math.floor(Math.random() * unread.length)]
      return {
        verse,
        nextRotationIndex: (rotationIndex + offset + 1) % VOLUME_ORDER.length,
      }
    }
  }

  // All marked — reset cycle with a random verse from the next volume slot
  const volume = VOLUME_ORDER[rotationIndex % VOLUME_ORDER.length]
  const pool = verses.filter((v) => v.volume === volume)
  const fallbackPool = pool.length ? pool : verses
  const verse = fallbackPool[Math.floor(Math.random() * fallbackPool.length)]
  return {
    verse,
    nextRotationIndex: (rotationIndex + 1) % VOLUME_ORDER.length,
  }
}

/** Next unmarked verse in array order (corpus / CFM pool order). */
export function pickNextVerseInOrder(
  verses: Verse[],
  markedIds: Set<string>,
  rotationIndex: number,
): { verse: Verse; nextRotationIndex: number } {
  const unread = verses.find((v) => !markedIds.has(v.id))
  if (unread) {
    return { verse: unread, nextRotationIndex: rotationIndex }
  }

  // All marked — restart at the beginning of the pool
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
