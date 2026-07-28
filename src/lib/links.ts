import type { Verse } from './types'

export interface ReferenceLink {
  label: string
  href: string
  description: string
}

export function buildReferenceLinks(verse: Verse): ReferenceLink[] {
  const links: ReferenceLink[] = []

  if (verse.churchVolume && verse.churchBook) {
    links.push({
      label: 'Gospel Library',
      href: `https://www.churchofjesuschrist.org/study/scriptures/${verse.churchVolume}/${verse.churchBook}/${verse.chapter}?lang=eng&id=p${verse.verse}#p${verse.verse}`,
      description: 'Official Church scriptures on ChurchofJesusChrist.org',
    })
  }

  const citationQuery = encodeURIComponent(`"${verse.reference}"`)
  links.push({
    label: 'BYU Citation Index',
    href: `https://scriptures.byu.edu/`,
    description: `Open the Citation Index, then search for ${verse.reference}`,
  })

  links.push({
    label: 'Find citations (search)',
    href: `https://www.google.com/search?q=site%3Ascriptures.byu.edu+${citationQuery}`,
    description: 'Web search scoped to BYU Scripture Citation Index',
  })

  if (verse.volume === 'bible') {
    const passage = encodeURIComponent(verse.reference)
    links.push({
      label: 'Bible Gateway (KJV)',
      href: `https://www.biblegateway.com/passage/?search=${passage}&version=KJV`,
      description: 'King James Version on Bible Gateway',
    })
    links.push({
      label: 'Bible Gateway (WEB)',
      href: `https://www.biblegateway.com/passage/?search=${passage}&version=WEB`,
      description: 'World English Bible on Bible Gateway',
    })
    links.push({
      label: 'Blue Letter Bible',
      href: `https://www.blueletterbible.org/search/search.cfm?Criteria=${passage}&t=KJV`,
      description: 'Study tools and cross-references',
    })
  } else {
    links.push({
      label: 'Gospel Topics',
      href: 'https://www.churchofjesuschrist.org/study/manual/gospel-topics?lang=eng',
      description: 'Topical study helps from the Church',
    })
  }

  return links
}
