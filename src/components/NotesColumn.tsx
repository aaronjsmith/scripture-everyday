import { GOSPEL_TAGS } from '../data/tags'

interface Props {
  reference: string
  noteDraft: string
  onNoteChange: (value: string) => void
  tagDraft: string[]
  onToggleTag: (tag: string) => void
  onSave: () => void
  saveFlash: boolean
}

export function NotesColumn({
  reference,
  noteDraft,
  onNoteChange,
  tagDraft,
  onToggleTag,
  onSave,
  saveFlash,
}: Props) {
  return (
    <section className="panel notes-panel" aria-labelledby="notes-heading">
      <header className="panel-header">
        <p className="eyebrow">Personal study</p>
        <h2 id="notes-heading">Impressions</h2>
        <p className="panel-sub">Notes for {reference}</p>
      </header>

      <label className="sr-only" htmlFor="impression">
        Write your impressions
      </label>
      <textarea
        id="impression"
        className="impression"
        value={noteDraft}
        onChange={(e) => onNoteChange(e.target.value)}
        placeholder="What is the Spirit teaching you?"
        rows={10}
      />

      <div className="tags-block">
        <p className="tags-label">Gospel topics</p>
        <div className="tag-cloud" role="group" aria-label="Gospel topic tags">
          {GOSPEL_TAGS.map((tag) => {
            const active = tagDraft.includes(tag)
            return (
              <button
                key={tag}
                type="button"
                className={active ? 'tag active' : 'tag'}
                aria-pressed={active}
                onClick={() => onToggleTag(tag)}
              >
                {tag}
              </button>
            )
          })}
        </div>
      </div>

      <div className="notes-actions">
        <button type="button" className="btn primary" onClick={onSave}>
          Save note
        </button>
        {saveFlash ? <span className="save-flash">Saved locally</span> : null}
      </div>
    </section>
  )
}
