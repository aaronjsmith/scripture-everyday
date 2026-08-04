import { useMemo, useState } from 'react'
import type { Verse, VerseNote, VolumeId } from '../lib/types'
import { VOLUME_LABELS, VOLUME_ORDER } from '../lib/types'

interface Props {
  open: boolean
  onClose: () => void
  markedVerseIds: string[]
  verses: Verse[]
  notes: Record<string, VerseNote>
  onOpenVerse: (verseId: string) => void
}

export function MarkedHistory({
  open,
  onClose,
  markedVerseIds,
  verses,
  notes,
  onOpenVerse,
}: Props) {
  const [volumeFilter, setVolumeFilter] = useState<VolumeId | 'all'>('all')
  const [query, setQuery] = useState('')

  const byId = useMemo(() => {
    const map = new Map<string, Verse>()
    for (const v of verses) map.set(v.id, v)
    return map
  }, [verses])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list: { verse: Verse; note: VerseNote | null }[] = []
    for (const id of markedVerseIds) {
      const verse = byId.get(id)
      if (!verse) continue
      if (volumeFilter !== 'all' && verse.volume !== volumeFilter) continue
      if (q && !verse.reference.toLowerCase().includes(q)) continue
      list.push({ verse, note: notes[id] ?? null })
    }
    return list.sort((a, b) => a.verse.reference.localeCompare(b.verse.reference))
  }, [markedVerseIds, byId, notes, volumeFilter, query])

  if (!open) return null

  return (
    <div className="history-backdrop" role="presentation" onClick={onClose}>
      <div
        className="history-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="history-header">
          <div>
            <p className="eyebrow">Progress</p>
            <h2 id="history-title">Marked verses</h2>
            <p className="panel-sub">
              {markedVerseIds.length.toLocaleString()} marked · {rows.length.toLocaleString()}{' '}
              shown
            </p>
          </div>
          <button type="button" className="btn ghost compact" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="history-filters">
          <label className="history-field">
            <span>Volume</span>
            <select
              value={volumeFilter}
              onChange={(e) =>
                setVolumeFilter(e.target.value as VolumeId | 'all')
              }
            >
              <option value="all">All volumes</option>
              {VOLUME_ORDER.map((volume) => (
                <option key={volume} value={volume}>
                  {VOLUME_LABELS[volume]}
                </option>
              ))}
            </select>
          </label>
          <label className="history-field grow">
            <span>Search</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Reference…"
            />
          </label>
        </div>

        <ul className="history-list">
          {rows.length === 0 ? (
            <li className="history-empty">No marked verses match this filter.</li>
          ) : (
            rows.map(({ verse, note }) => (
              <li key={verse.id}>
                <button
                  type="button"
                  className="history-row"
                  onClick={() => {
                    onOpenVerse(verse.id)
                    onClose()
                  }}
                >
                  <div className="history-row-top">
                    <strong>{verse.reference}</strong>
                    <span>{VOLUME_LABELS[verse.volume]}</span>
                  </div>
                  {note?.tags?.length ? (
                    <p className="history-tags">{note.tags.join(' · ')}</p>
                  ) : null}
                  {note?.text?.trim() ? (
                    <p className="history-note">{truncate(note.text.trim(), 140)}</p>
                  ) : (
                    <p className="history-note muted">No note yet</p>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  )
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, max - 1)}…`
}
