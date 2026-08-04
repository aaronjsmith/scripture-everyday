import { buildByuCitationUrl } from '../lib/links'
import type { Verse } from '../lib/types'
import { VOLUME_LABELS } from '../lib/types'

interface Props {
  verse: Verse
}

export function VerseColumn({ verse }: Props) {
  const byuHref = buildByuCitationUrl(verse)

  return (
    <section className="panel verse-panel" aria-labelledby="verse-heading">
      <header className="panel-header">
        <p className="eyebrow">{VOLUME_LABELS[verse.volume]}</p>
        <h2 id="verse-heading">
          <a
            className="verse-reference-link"
            href={byuHref}
            target="_blank"
            rel="noreferrer"
            title={`Open ${verse.reference} in the BYU Scripture Citation Index`}
          >
            {verse.reference}
          </a>
        </h2>
        <p className="panel-sub">
          Citations via{' '}
          <a href={byuHref} target="_blank" rel="noreferrer">
            scriptures.byu.edu
          </a>
        </p>
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
