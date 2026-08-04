import type { AppStats, VolumeId } from '../lib/types'
import { VOLUME_LABELS, VOLUME_ORDER } from '../lib/types'
import type { CfmLesson } from '../lib/cfm'

interface Props {
  stats: AppStats
  progress: Record<VolumeId, { marked: number; total: number }>
  notesCount: number
  nextVolumeLabel: string
  cfmMode: boolean
  cfmLesson: CfmLesson | null
  cfmStatus: 'idle' | 'loading' | 'ready' | 'empty' | 'unavailable'
  cfmPoolStats: { total: number; marked: number }
  onToggleCfmMode: (enabled: boolean) => void
  onNext: () => void
  onExportJson: () => void
  onExportMarkdown: () => void
  onExportRtf: () => void
  onReset: () => void
  onViewMarked: () => void
}

export function StatsBar({
  stats,
  progress,
  notesCount,
  nextVolumeLabel,
  cfmMode,
  cfmLesson,
  cfmStatus,
  cfmPoolStats,
  onToggleCfmMode,
  onNext,
  onExportJson,
  onExportMarkdown,
  onExportRtf,
  onReset,
  onViewMarked,
}: Props) {
  const cfmHint =
    cfmStatus === 'loading'
      ? 'Loading this week’s lesson…'
      : cfmStatus === 'unavailable'
        ? 'No lesson found for today'
        : cfmStatus === 'empty'
          ? 'This week has no matching verses'
          : cfmLesson
            ? `${cfmLesson.dateDisplay} · ${cfmPoolStats.marked}/${cfmPoolStats.total} in pool`
            : null

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
          <span className="stat-value muted">
            {cfmMode ? 'Come, Follow Me' : nextVolumeLabel}
          </span>
          <span className="stat-label">
            {cfmMode ? 'Study mode' : 'Next volume'}
          </span>
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
        <label className={`cfm-toggle${cfmMode ? ' is-on' : ''}`}>
          <input
            type="checkbox"
            checked={cfmMode}
            onChange={(e) => onToggleCfmMode(e.target.checked)}
          />
          <span className="cfm-toggle-ui" aria-hidden />
          <span className="cfm-toggle-copy">
            <span className="cfm-toggle-title">Come Follow Me mode</span>
            {cfmHint ? (
              <span className="cfm-toggle-hint">{cfmHint}</span>
            ) : null}
          </span>
        </label>

        <button type="button" className="btn primary" onClick={onNext}>
          Next verse
        </button>
        <button type="button" className="btn" onClick={onViewMarked}>
          View marked
        </button>
        <button type="button" className="btn" onClick={onExportMarkdown}>
          Download Markdown
        </button>
        <button type="button" className="btn" onClick={onExportRtf}>
          Download Word (RTF)
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
