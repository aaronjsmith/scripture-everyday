import type { PersistedState, VerseNote, VolumeId } from './types'
import {
  defaultPersistedState,
  emptyStats,
  normalizeEnabledVolumes,
} from './types'

const STORAGE_KEY = 'scriptday:v1'
const LEGACY_STORAGE_KEY = 'scripture-everyday:v1'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function sanitizeState(raw: unknown): PersistedState {
  const base = defaultPersistedState()
  if (!isRecord(raw) || raw.version !== 1) return base

  const marked = Array.isArray(raw.markedVerseIds)
    ? raw.markedVerseIds.filter((id): id is string => typeof id === 'string')
    : []

  const notes: Record<string, VerseNote> = {}
  if (isRecord(raw.notes)) {
    for (const [key, value] of Object.entries(raw.notes)) {
      if (!isRecord(value)) continue
      if (typeof value.verseId !== 'string') continue
      notes[key] = {
        verseId: value.verseId,
        reference: typeof value.reference === 'string' ? value.reference : '',
        volume: (value.volume as VolumeId) ?? 'bom',
        text: typeof value.text === 'string' ? value.text : '',
        tags: Array.isArray(value.tags)
          ? value.tags.filter((t): t is string => typeof t === 'string')
          : [],
        updatedAt:
          typeof value.updatedAt === 'string'
            ? value.updatedAt
            : new Date().toISOString(),
        createdAt:
          typeof value.createdAt === 'string'
            ? value.createdAt
            : new Date().toISOString(),
      }
    }
  }

  const stats = isRecord(raw.stats)
    ? {
        ...emptyStats(),
        totalShown:
          typeof raw.stats.totalShown === 'number' ? raw.stats.totalShown : 0,
        byVolume: {
          bom:
            isRecord(raw.stats.byVolume) &&
            typeof raw.stats.byVolume.bom === 'number'
              ? raw.stats.byVolume.bom
              : 0,
          bible:
            isRecord(raw.stats.byVolume) &&
            typeof raw.stats.byVolume.bible === 'number'
              ? raw.stats.byVolume.bible
              : 0,
          pgp:
            isRecord(raw.stats.byVolume) &&
            typeof raw.stats.byVolume.pgp === 'number'
              ? raw.stats.byVolume.pgp
              : 0,
          dc:
            isRecord(raw.stats.byVolume) &&
            typeof raw.stats.byVolume.dc === 'number'
              ? raw.stats.byVolume.dc
              : 0,
        },
        notesWritten:
          typeof raw.stats.notesWritten === 'number'
            ? raw.stats.notesWritten
            : Object.keys(notes).filter((id) => notes[id].text.trim()).length,
        uniqueTagged:
          typeof raw.stats.uniqueTagged === 'number'
            ? raw.stats.uniqueTagged
            : Object.values(notes).filter((n) => n.tags.length > 0).length,
        lastShownAt:
          typeof raw.stats.lastShownAt === 'string' ||
          raw.stats.lastShownAt === null
            ? (raw.stats.lastShownAt as string | null)
            : null,
      }
    : emptyStats()

  return {
    version: 1,
    markedVerseIds: marked,
    notes,
    rotationIndex:
      typeof raw.rotationIndex === 'number' && raw.rotationIndex >= 0
        ? raw.rotationIndex
        : 0,
    cfmMode: raw.cfmMode === true,
    verseOrder: raw.verseOrder === true,
    verseContext: raw.verseContext === true,
    enabledVolumes: normalizeEnabledVolumes(raw.enabledVolumes),
    stats,
  }
}

export function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return sanitizeState(JSON.parse(raw) as unknown)

    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!legacy) return defaultPersistedState()

    const state = sanitizeState(JSON.parse(legacy) as unknown)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    return state
  } catch {
    return defaultPersistedState()
  }
}

export function saveState(state: PersistedState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function downloadBlob(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function exportNotesJson(notes: Record<string, VerseNote>): void {
  const list = Object.values(notes).sort((a, b) =>
    a.reference.localeCompare(b.reference),
  )
  const stamp = new Date().toISOString().slice(0, 10)
  downloadBlob(
    `scriptday-notes-${stamp}.json`,
    JSON.stringify({ exportedAt: new Date().toISOString(), notes: list }, null, 2),
    'application/json',
  )
}

export function exportNotesMarkdown(notes: Record<string, VerseNote>): void {
  const list = Object.values(notes)
    .filter((n) => n.text.trim() || n.tags.length)
    .sort((a, b) => a.reference.localeCompare(b.reference))

  const lines = [
    '# Scriptday Notes',
    '',
    `Exported ${new Date().toLocaleString()}`,
    '',
  ]

  for (const note of list) {
    lines.push(`## ${note.reference}`)
    if (note.tags.length) {
      lines.push(`Tags: ${note.tags.join(', ')}`)
      lines.push('')
    }
    lines.push(note.text.trim() || '_No impression written_')
    lines.push('')
  }

  const stamp = new Date().toISOString().slice(0, 10)
  downloadBlob(
    `scriptday-notes-${stamp}.md`,
    lines.join('\n'),
    'text/markdown',
  )
}

/** Escape plain text for RTF (opens cleanly in Microsoft Word). */
function escapeRtf(text: string): string {
  let out = ''
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!
    if (ch === '\\') out += '\\\\'
    else if (ch === '{') out += '\\{'
    else if (ch === '}') out += '\\}'
    else if (ch === '\n') out += '\\par\n'
    else if (ch === '\r') continue
    else if (ch === '\t') out += '\\tab '
    else {
      const code = text.charCodeAt(i)
      if (code < 0x20) continue
      if (code < 0x80) out += ch
      else {
        // RTF \u uses signed 16-bit UTF-16 code units
        const signed = code > 0x7fff ? code - 0x10000 : code
        out += `\\u${signed}?`
      }
    }
  }
  return out
}

export function exportNotesRtf(notes: Record<string, VerseNote>): void {
  const list = Object.values(notes)
    .filter((n) => n.text.trim() || n.tags.length)
    .sort((a, b) => a.reference.localeCompare(b.reference))

  const parts: string[] = [
    '{\\rtf1\\ansi\\deff0',
    '{\\fonttbl{\\f0 Times New Roman;}}',
    '\\f0\\fs24',
    `{\\b ${escapeRtf('Scriptday Notes')}}\\par`,
    '\\par',
    `${escapeRtf(`Exported ${new Date().toLocaleString()}`)}\\par`,
    '\\par',
  ]

  for (const note of list) {
    parts.push(`{\\b\\fs28 ${escapeRtf(note.reference)}}\\par`)
    if (note.tags.length) {
      parts.push(`${escapeRtf(`Tags: ${note.tags.join(', ')}`)}\\par`)
      parts.push('\\par')
    }
    const body = note.text.trim() || 'No impression written'
    parts.push(`${escapeRtf(body)}\\par`)
    parts.push('\\par')
  }

  parts.push('}')

  const stamp = new Date().toISOString().slice(0, 10)
  downloadBlob(
    `scriptday-notes-${stamp}.rtf`,
    parts.join('\n'),
    'application/rtf',
  )
}
