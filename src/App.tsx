import { AccountBar } from './components/AccountBar'
import { VerseColumn } from './components/VerseColumn'
import { ReferencesColumn } from './components/ReferencesColumn'
import { NotesColumn } from './components/NotesColumn'
import { StatsBar } from './components/StatsBar'
import { MarkedHistory } from './components/MarkedHistory'
import { useScriptureApp } from './hooks/useScriptureApp'
import { VOLUME_LABELS, VOLUME_ORDER } from './lib/types'
import './App.css'

function App() {
  const app = useScriptureApp()
  const nextVolume =
    VOLUME_LABELS[VOLUME_ORDER[app.state.rotationIndex % VOLUME_ORDER.length]]

  if (app.loading) {
    return (
      <div className="shell loading-shell">
        <p>Loading scriptures…</p>
      </div>
    )
  }

  if (app.error) {
    return (
      <div className="shell loading-shell">
        <p role="alert">{app.error}</p>
        <p className="hint">
          Run <code>npm run build:scriptures</code> if verse data is missing.
        </p>
      </div>
    )
  }

  if (!app.current) {
    return (
      <div className="shell loading-shell">
        <p>Preparing your next verse…</p>
      </div>
    )
  }

  const notesCount = Object.values(app.state.notes).filter((n) =>
    n.text.trim(),
  ).length

  return (
    <div className="shell">
      <div className="atmosphere" aria-hidden />

      <header className="topbar">
        <div className="brand-block">
          <p className="brand">Scriptday</p>
          <p className="tagline">
            A quiet rotation through the standard works — with room for
            impressions.
          </p>
        </div>
        <div className="topbar-aside">
          {app.counts ? (
            <p className="corpus-meta">
              {app.counts.total.toLocaleString()} verses · KJV + WEB · BoM · PoGP
              · D&amp;C
            </p>
          ) : null}
          <AccountBar
            user={app.cloudUser}
            configured={app.cloudConfigured}
            syncStatus={app.syncStatus}
            syncError={app.syncError}
            onLogout={() => {
              void app.disconnectCloud()
            }}
          />
        </div>
      </header>

      <main className="columns">
        <VerseColumn verse={app.current} />
        <ReferencesColumn verse={app.current} />
        <NotesColumn
          reference={app.current.reference}
          noteDraft={app.noteDraft}
          onNoteChange={app.setNoteDraft}
          tagDraft={app.tagDraft}
          onToggleTag={app.toggleTag}
          onSave={app.saveNote}
          saveFlash={app.saveFlash}
        />
      </main>

      <StatsBar
        stats={app.state.stats}
        progress={app.progress}
        notesCount={notesCount}
        nextVolumeLabel={nextVolume}
        onNext={app.advance}
        onExportJson={app.exportJson}
        onExportMarkdown={app.exportMarkdown}
        onReset={app.resetProgress}
        onViewMarked={() => app.setHistoryOpen(true)}
      />

      <MarkedHistory
        open={app.historyOpen}
        onClose={() => app.setHistoryOpen(false)}
        markedVerseIds={app.state.markedVerseIds}
        verses={app.verses}
        notes={app.state.notes}
        onOpenVerse={app.openVerse}
      />
    </div>
  )
}

export default App
