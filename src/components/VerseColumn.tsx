import { buildByuCitationUrl } from '../lib/links'
import type { CfmLesson } from '../lib/cfm'
import type { Verse } from '../lib/types'
import { VOLUME_LABELS } from '../lib/types'

interface Props {
  verse: Verse
  cfmMode?: boolean
  cfmLesson?: CfmLesson | null
}

export function VerseColumn({ verse, cfmMode = false, cfmLesson = null }: Props) {
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
        {cfmMode && cfmLesson ? (
          <p className="cfm-lesson-banner">
            <span className="cfm-lesson-label">This week</span>
            <span className="cfm-lesson-title">{cfmLesson.title}</span>
            <span className="cfm-lesson-dates">{cfmLesson.dateDisplay}</span>
            {cfmLesson.href ? (
              <a
                className="cfm-lesson-link"
                href={cfmLesson.href}
                target="_blank"
                rel="noreferrer"
              >
                Open lesson
              </a>
            ) : null}
          </p>
        ) : (
          <p className="panel-sub">
            Citations via{' '}
            <a href={byuHref} target="_blank" rel="noreferrer">
              scriptures.byu.edu
            </a>
          </p>
        )}
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
