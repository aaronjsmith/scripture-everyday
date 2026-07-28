import { buildReferenceLinks } from '../lib/links'
import type { Verse } from '../lib/types'

interface Props {
  verse: Verse
}

export function ReferencesColumn({ verse }: Props) {
  const links = buildReferenceLinks(verse)

  return (
    <section className="panel refs-panel" aria-labelledby="refs-heading">
      <header className="panel-header">
        <p className="eyebrow">Study links</p>
        <h2 id="refs-heading">References</h2>
      </header>

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
