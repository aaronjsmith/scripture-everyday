import { useEffect, useState } from 'react'
import { findCfmLessonsForVerse, type CfmLesson } from '../lib/cfm'
import { buildReferenceLinks } from '../lib/links'
import type { Verse } from '../lib/types'

interface Props {
  verse: Verse
}

export function ReferencesColumn({ verse }: Props) {
  const links = buildReferenceLinks(verse)
  const [cfmLessons, setCfmLessons] = useState<CfmLesson[]>([])
  const [cfmStatus, setCfmStatus] = useState<'loading' | 'ready'>('loading')

  useEffect(() => {
    let cancelled = false
    setCfmStatus('loading')
    setCfmLessons([])

    void findCfmLessonsForVerse(verse).then((lessons) => {
      if (cancelled) return
      setCfmLessons(lessons)
      setCfmStatus('ready')
    })

    return () => {
      cancelled = true
    }
  }, [verse])

  return (
    <section className="panel refs-panel" aria-labelledby="refs-heading">
      <header className="panel-header">
        <p className="eyebrow">Study links</p>
        <h2 id="refs-heading">References</h2>
      </header>

      {cfmStatus === 'loading' ? (
        <p className="refs-status">Looking up Come, Follow Me…</p>
      ) : null}

      {cfmLessons.length > 0 ? (
        <div className="cfm-block">
          <h3 className="refs-section-title">
            Come, Follow Me, FAIR &amp; followHIM
          </h3>
          <ul className="ref-list">
            {cfmLessons.map((lesson) => (
              <li key={lesson.id}>
                <a href={lesson.href} target="_blank" rel="noreferrer">
                  {lesson.title}
                </a>
                <p>
                  {lesson.dateDisplay}
                  {lesson.dateDisplay ? ' · ' : ''}
                  {lesson.scriptureReferences.join('; ')}
                </p>
                {lesson.fairHref ? (
                  <p className="ref-extra">
                    <a href={lesson.fairHref} target="_blank" rel="noreferrer">
                      FAIR study resources
                    </a>
                  </p>
                ) : null}
                {lesson.followHimHref ? (
                  <p className="ref-extra">
                    <a
                      href={lesson.followHimHref}
                      target="_blank"
                      rel="noreferrer"
                    >
                      followHIM episode
                    </a>
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : cfmStatus === 'ready' ? (
        <p className="refs-status">
          No indexed Come, Follow Me lesson covers this verse yet. Use the
          Church, FAIR, and followHIM search links below.
        </p>
      ) : null}

      <h3 className="refs-section-title">More study links</h3>
      <ul className="ref-list">
        {links.map((link) => (
          <li key={link.href + link.label}>
            <a href={link.href} target="_blank" rel="noreferrer">
              {link.label}
            </a>
            <p>{link.description}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
