import type { Verse, VolumeId } from './types'
import { VOLUME_ORDER } from './types'

export function pickNextVerse(
  verses: Verse[],
  markedIds: Set<string>,
  rotationIndex: number,
): { verse: Verse; nextRotationIndex: number } | null {
  if (!verses.length) return null

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
