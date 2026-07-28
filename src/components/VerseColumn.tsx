import type { Verse } from '../lib/types'
import { VOLUME_LABELS } from '../lib/types'

interface Props {
  verse: Verse
}

export function VerseColumn({ verse }: Props) {
  return (
    <section className="panel verse-panel" aria-labelledby="verse-heading">
      <header className="panel-header">
        <p className="eyebrow">{VOLUME_LABELS[verse.volume]}</p>
        <h2 id="verse-heading">{verse.reference}</h2>
      </header>

      <div className="verse-body">
        {verse.volume === 'bible' ? (
          <>
            <article className="translation">
              <h3>King James Version</h3>
              <p className="verse-text">{verse.text}</p>
            </article>
            {verse.textWeb ? (
              <article className="translation">
                <h3>World English Bible</h3>
                <p className="verse-text">{verse.textWeb}</p>
              </article>
            ) : null}
          </>
        ) : (
          <p className="verse-text">{verse.text}</p>
        )}
      </div>
    </section>
  )
}
