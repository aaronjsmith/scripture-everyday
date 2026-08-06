import type { AppStats, VolumeId } from '../lib/types'
import { VOLUME_LABELS, VOLUME_ORDER } from '../lib/types'
import { formatCfmWeekLabel, type CfmLesson } from '../lib/cfm'

interface Props {
  stats: AppStats
  progress: Record<VolumeId, { marked: number; total: number }>
  notesCount: number
  nextVolumeLabel: string
  cfmMode: boolean
  verseOrder: boolean
  verseContext: boolean
  enabledVolumes: VolumeId[]
  cfmLesson: CfmLesson | null
  cfmStatus: 'idle' | 'loading' | 'ready' | 'empty' | 'unavailable'
  cfmPoolStats: { total: number; marked: number }
  onToggleCfmMode: (enabled: boolean) => void
  onToggleVerseOrder: (enabled: boolean) => void
  onToggleVerseContext: (enabled: boolean) => void
  onToggleVolume: (volume: VolumeId, enabled: boolean) => void
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
  verseOrder,
  verseContext,
  enabledVolumes,
  cfmLesson,
  cfmStatus,
  cfmPoolStats,
  onToggleCfmMode,
  onToggleVerseOrder,
  onToggleVerseContext,
  onToggleVolume,
  onNext,
  onExportJson,
  onExportMarkdown,
  onExportRtf,
  onReset,
  onViewMarked,
}: Props) {
  const enabledSet = new Set(enabledVolumes)
  const onlyOneEnabled = enabledVolumes.length <= 1

  const cfmHint =
    cfmStatus === 'loading'
      ? 'Loading this week’s lesson…'
      : cfmStatus === 'unavailable'
        ? 'No lesson found for today'
        : cfmStatus === 'empty'
          ? 'This week has no matching verses'
          : cfmLesson
            ? `${formatCfmWeekLabel(cfmLesson)} · ${cfmPoolStats.marked}/${cfmPoolStats.total} in pool`
            : null

  const modeLabel = cfmMode
    ? 'Come, Follow Me'
    : verseOrder
      ? 'Verse order'
      : nextVolumeLabel
  const modeHint = cfmMode
    ? 'Study mode'
    : verseOrder
      ? 'Sequential'
      : 'Next volume'

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
          <span className="stat-value muted">{modeLabel}</span>
          <span className="stat-label">{modeHint}</span>
        </div>
      </div>

      <div className="progress-list">
        <p className="progress-list-label">In rotation</p>
        {VOLUME_ORDER.map((volume) => {
          const { marked, total } = progress[volume]
          const pct = total ? Math.round((marked / total) * 100) : 0
          const inRotation = enabledSet.has(volume)
          return (
            <label
              key={volume}
              className={`progress-row${inRotation ? ' is-on' : ' is-off'}`}
            >
              <input
                type="checkbox"
                checked={inRotation}
                disabled={inRotation && onlyOneEnabled}
                onChange={(e) => onToggleVolume(volume, e.target.checked)}
                aria-label={`Include ${VOLUME_LABELS[volume]} in rotation`}
              />
              <span className="progress-toggle" aria-hidden />
              <div className="progress-body">
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
            </label>
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

        <label className={`cfm-toggle${verseOrder ? ' is-on' : ''}`}>
          <input
            type="checkbox"
            checked={verseOrder}
            onChange={(e) => onToggleVerseOrder(e.target.checked)}
          />
          <span className="cfm-toggle-ui" aria-hidden />
          <span className="cfm-toggle-copy">
            <span className="cfm-toggle-title">Verse order</span>
            <span className="cfm-toggle-hint">
              {verseOrder
                ? 'Advance through unmarked verses in scripture order'
                : 'Currently picking randomly by volume rotation'}
            </span>
          </span>
        </label>

        <label className={`cfm-toggle${verseContext ? ' is-on' : ''}`}>
          <input
            type="checkbox"
            checked={verseContext}
            onChange={(e) => onToggleVerseContext(e.target.checked)}
          />
          <span className="cfm-toggle-ui" aria-hidden />
          <span className="cfm-toggle-copy">
            <span className="cfm-toggle-title">Verse in context</span>
            <span className="cfm-toggle-hint">
              {verseContext
                ? 'Showing the verse before and after'
                : 'Show surrounding verses from the same book'}
            </span>
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
