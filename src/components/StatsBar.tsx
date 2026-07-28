import type { AppStats, VolumeId } from '../lib/types'
import { VOLUME_LABELS, VOLUME_ORDER } from '../lib/types'

interface Props {
  stats: AppStats
  progress: Record<VolumeId, { marked: number; total: number }>
  notesCount: number
  nextVolumeLabel: string
  onNext: () => void
  onExportJson: () => void
  onExportMarkdown: () => void
  onReset: () => void
}

export function StatsBar({
  stats,
  progress,
  notesCount,
  nextVolumeLabel,
  onNext,
  onExportJson,
  onExportMarkdown,
  onReset,
}: Props) {
  return (
    <aside className="stats-bar" aria-label="Progress and actions">
      <div className="stats-grid">
        <div>
          <span className="stat-value">{stats.totalShown}</span>
          <span className="stat-label">Verses marked</span>
        </div>
        <div>
          <span className="stat-value">{notesCount}</span>
          <span className="stat-label">Notes saved</span>
        </div>
        <div>
          <span className="stat-value">{stats.uniqueTagged}</span>
          <span className="stat-label">Tagged verses</span>
        </div>
        <div>
          <span className="stat-value muted">{nextVolumeLabel}</span>
          <span className="stat-label">Next volume</span>
        </div>
      </div>

      <div className="progress-list">
        {VOLUME_ORDER.map((volume) => {
          const { marked, total } = progress[volume]
          const pct = total ? Math.round((marked / total) * 100) : 0
          return (
            <div key={volume} className="progress-row">
              <div className="progress-meta">
                <span>{VOLUME_LABELS[volume]}</span>
                <span>
                  {marked}/{total} ({pct}%)
                </span>
              </div>
              <div className="progress-track" aria-hidden>
                <div className="progress-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      <div className="toolbar">
        <button type="button" className="btn primary" onClick={onNext}>
          Next verse
        </button>
        <button type="button" className="btn" onClick={onExportMarkdown}>
          Download Markdown
        </button>
        <button type="button" className="btn" onClick={onExportJson}>
          Download JSON
        </button>
        <button type="button" className="btn ghost" onClick={onReset}>
          Reset progress
        </button>
      </div>
    </aside>
  )
}
