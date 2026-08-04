import { useId, useState } from 'react'
import { GOSPEL_TAGS } from '../data/tags'
import { WRITING_PROMPTS } from '../data/prompts'

interface Props {
  reference: string
  noteDraft: string
  onNoteChange: (value: string) => void
  tagDraft: string[]
  onToggleTag: (tag: string) => void
  onSave: () => void
  saveFlash: boolean
}

function insertPrompt(existing: string, prompt: string): string {
  const trimmed = existing.trim()
  if (!trimmed) return `${prompt}\n\n`
  if (trimmed.includes(prompt)) return existing
  return `${existing.trimEnd()}\n\n${prompt}\n\n`
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
  const promptSelectId = useId()
  const [promptChoice, setPromptChoice] = useState('')

  return (
    <section className="panel notes-panel" aria-labelledby="notes-heading">
      <header className="panel-header">
        <p className="eyebrow">Personal study</p>
        <h2 id="notes-heading">Impressions</h2>
        <p className="panel-sub">Notes for {reference}</p>
      </header>

      <div className="prompt-block">
        <label className="tags-label" htmlFor={promptSelectId}>
          Writing prompt
        </label>
        <select
          id={promptSelectId}
          className="prompt-select"
          value={promptChoice}
          onChange={(e) => {
            const prompt = e.target.value
            setPromptChoice('')
            if (!prompt) return
            onNoteChange(insertPrompt(noteDraft, prompt))
          }}
        >
          <option value="">Choose a prompt…</option>
          {WRITING_PROMPTS.map((prompt) => (
            <option key={prompt} value={prompt}>
              {prompt}
            </option>
          ))}
        </select>
      </div>

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
