import type { Verse } from './types'

export interface ReferenceLink {
  label: string
  href: string
  description: string
}

/** Numeric book IDs used by scriptures.byu.edu hash / ajax URLs */
const BYU_BOOK_IDS: Record<string, number> = {
  genesis: 101,
  exodus: 102,
  leviticus: 103,
  numbers: 104,
  deuteronomy: 105,
  joshua: 106,
  judges: 107,
  ruth: 108,
  '1 samuel': 109,
  '2 samuel': 110,
  '1 kings': 111,
  '2 kings': 112,
  '1 chronicles': 113,
  '2 chronicles': 114,
  ezra: 115,
  nehemiah: 116,
  esther: 117,
  job: 118,
  psalms: 119,
  psalm: 119,
  proverbs: 120,
  ecclesiastes: 121,
  'song of solomon': 122,
  'song of songs': 122,
  isaiah: 123,
  jeremiah: 124,
  lamentations: 125,
  ezekiel: 126,
  daniel: 127,
  hosea: 128,
  joel: 129,
  amos: 130,
  obadiah: 131,
  jonah: 132,
  micah: 133,
  nahum: 134,
  habakkuk: 135,
  zephaniah: 136,
  haggai: 137,
  zechariah: 138,
  malachi: 139,
  matthew: 140,
  mark: 141,
  luke: 142,
  john: 143,
  acts: 144,
  romans: 145,
  '1 corinthians': 146,
  '2 corinthians': 147,
  galatians: 148,
  ephesians: 149,
  philippians: 150,
  colossians: 151,
  '1 thessalonians': 152,
  '2 thessalonians': 153,
  '1 timothy': 154,
  '2 timothy': 155,
  titus: 156,
  philemon: 157,
  hebrews: 158,
  james: 159,
  '1 peter': 160,
  '2 peter': 161,
  '1 john': 162,
  '2 john': 163,
  '3 john': 164,
  jude: 165,
  revelation: 166,
  '1 nephi': 205,
  '2 nephi': 206,
  jacob: 207,
  enos: 208,
  jarom: 209,
  omni: 210,
  'words of mormon': 211,
  mosiah: 212,
  alma: 213,
  helaman: 214,
  '3 nephi': 215,
  '4 nephi': 216,
  mormon: 217,
  ether: 218,
  moroni: 219,
  'doctrine and covenants': 302,
  'doctrine & covenants': 302,
  'd&c': 302,
  dc: 302,
  'official declaration': 303,
  'official declarations': 303,
  moses: 401,
  abraham: 402,
  'joseph smith-matthew': 404,
  'joseph smith—matthew': 404,
  'joseph smith-history': 405,
  'joseph smith—history': 405,
  'articles of faith': 406,
}

function normalizeBookKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[—–]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
}

function toHex(value: number, width: number): string {
  return value.toString(16).padStart(width, '0')
}

/**
 * Encode a verse the way scriptures.byu.edu does for location hashes.
 * Format: 3-digit hex book + 2-digit hex chapter + verse digits
 * Full hash: `{encoded}:{encoded}:c{encoded}` (scriptures : center : citation index)
 */
export function encodeByuScriptureHash(
  bookId: number,
  chapter: number,
  verse: number,
): string {
  return `${toHex(bookId, 3)}${toHex(chapter, 2)}${verse}`
}

export function buildByuCitationUrl(verse: Verse): string {
  const bookId = BYU_BOOK_IDS[normalizeBookKey(verse.book)]
  if (!bookId) {
    return 'https://scriptures.byu.edu/'
  }

  const encoded = encodeByuScriptureHash(bookId, verse.chapter, verse.verse)
  return `https://scriptures.byu.edu/#${encoded}:${encoded}:c${encoded}`
}

/** Manual homepage for the volume’s most recent Come, Follow Me year. */
const CFM_MANUAL_HOME: Partial<
  Record<Verse['volume'], { label: string; href: string }>
> = {
  bible: {
    label: 'Come, Follow Me (Old Testament 2026)',
    href: 'https://www.churchofjesuschrist.org/study/manual/come-follow-me-for-home-and-church-old-testament-2026?lang=eng',
  },
  pgp: {
    label: 'Come, Follow Me (Old Testament 2026)',
    href: 'https://www.churchofjesuschrist.org/study/manual/come-follow-me-for-home-and-church-old-testament-2026?lang=eng',
  },
  bom: {
    label: 'Come, Follow Me (Book of Mormon 2024)',
    href: 'https://www.churchofjesuschrist.org/study/manual/come-follow-me-for-home-and-church-book-of-mormon-2024?lang=eng',
  },
  dc: {
    label: 'Come, Follow Me (Doctrine and Covenants 2025)',
    href: 'https://www.churchofjesuschrist.org/study/manual/come-follow-me-for-home-and-church-doctrine-and-covenants-2025?lang=eng',
  },
}

export function buildChurchSearchUrl(
  query: string,
  facet?: 'manuals' | 'general-conference' | 'magazines',
): string {
  const params = new URLSearchParams({ lang: 'eng', query })
  if (facet) params.set('facet', facet)
  return `https://www.churchofjesuschrist.org/search?${params.toString()}`
}

export function buildFairSearchUrl(query: string): string {
  const params = new URLSearchParams({ s: query })
  return `https://www.fairlatterdaysaints.org/?${params.toString()}`
}

export function buildFairAnswersSearchUrl(query: string): string {
  const params = new URLSearchParams({ search: query })
  return `https://www.fairlatterdaysaints.org/answers/Special:Search?${params.toString()}`
}

/** WordPress site search on followhim.co */
export function buildFollowHimSearchUrl(query: string): string {
  const params = new URLSearchParams({ s: query })
  return `https://followhim.co/?${params.toString()}`
}

/** Scripture Central library search (supports scripture references). */
export function buildScriptureCentralSearchUrl(query: string): string {
  const params = new URLSearchParams({ q: query })
  return `https://scripturecentral.org/search?${params.toString()}`
}

/**
 * Church History Matters (Scott Woodward & Casey Griffiths) lives on
 * Doctrine and Covenants Central; WordPress `?s=` searches podcast episodes
 * and related study pages.
 */
export function buildChurchHistoryMattersSearchUrl(query: string): string {
  const params = new URLSearchParams({ s: query })
  return `https://doctrineandcovenantscentral.org/?${params.toString()}`
}

/**
 * MormonR has Algolia autocomplete but no durable on-site search results URL.
 * Google site search is the shareable way to find Hard Questions / sources by reference.
 */
export function buildMormonrSearchUrl(query: string): string {
  const params = new URLSearchParams({
    q: `site:mormonr.org ${query}`,
  })
  return `https://www.google.com/search?${params.toString()}`
}

/** 1/2 Samuel, Kings, and Chronicles share one BibleProject guide each. */
const BIBLE_PROJECT_COMBINED: Record<string, string> = {
  '1 samuel': 'books-of-samuel',
  '2 samuel': 'books-of-samuel',
  '1 kings': 'books-of-kings',
  '2 kings': 'books-of-kings',
  '1 chronicles': 'books-of-chronicles',
  '2 chronicles': 'books-of-chronicles',
}

const BIBLE_PROJECT_SLUG_OVERRIDES: Record<string, string> = {
  'song of solomon': 'book-of-song-of-songs',
  'song of songs': 'book-of-song-of-songs',
  psalm: 'book-of-psalms',
  psalms: 'book-of-psalms',
}

/** Durable BibleProject book overview/guide page for a Bible book name. */
export function buildBibleProjectGuideUrl(book: string): string {
  const key = normalizeBookKey(book)
  const combined = BIBLE_PROJECT_COMBINED[key]
  if (combined) {
    return `https://bibleproject.com/guides/${combined}/`
  }
  const override = BIBLE_PROJECT_SLUG_OVERRIDES[key]
  if (override) {
    return `https://bibleproject.com/guides/${override}/`
  }
  const slug = key.replace(/\s+/g, '-')
  return `https://bibleproject.com/guides/book-of-${slug}/`
}

export function buildReferenceLinks(verse: Verse): ReferenceLink[] {
  const links: ReferenceLink[] = []
  const byuHref = buildByuCitationUrl(verse)
  const refQuery = verse.reference

  links.push({
    label: 'BYU Citation Index',
    href: byuHref,
    description: `General Conference and other citations of ${verse.reference}`,
  })

  if (verse.churchVolume && verse.churchBook) {
    links.push({
      label: 'Gospel Library',
      href: `https://www.churchofjesuschrist.org/study/scriptures/${verse.churchVolume}/${verse.churchBook}/${verse.chapter}?lang=eng&id=p${verse.verse}#p${verse.verse}`,
      description: 'Official Church scriptures on ChurchofJesusChrist.org',
    })
  }

  links.push({
    label: 'Church manuals mentioning this verse',
    href: buildChurchSearchUrl(refQuery, 'manuals'),
    description: 'Come, Follow Me and other manuals on ChurchofJesusChrist.org',
  })

  links.push({
    label: 'General Conference mentioning this verse',
    href: buildChurchSearchUrl(refQuery, 'general-conference'),
    description: 'Talks that cite this passage',
  })

  links.push({
    label: 'Magazines & Church content',
    href: buildChurchSearchUrl(refQuery),
    description: 'Broader Gospel Library search for this reference',
  })

  links.push({
    label: 'FAIR Latter-day Saints',
    href: buildFairSearchUrl(refQuery),
    description: `Articles and study resources mentioning ${verse.reference}`,
  })

  links.push({
    label: 'FAIR Answers wiki',
    href: buildFairAnswersSearchUrl(refQuery),
    description: 'Faithful Q&A and apologetic notes tied to this passage',
  })

  links.push({
    label: 'followHIM podcast',
    href: buildFollowHimSearchUrl(refQuery),
    description: `Hank Smith & John Bytheway episodes mentioning ${verse.reference}`,
  })

  links.push({
    label: 'Scripture Central',
    href: buildScriptureCentralSearchUrl(refQuery),
    description: `KnoWhys, evidences, and CFM study resources for ${verse.reference}`,
  })

  links.push({
    label: 'Church History Matters',
    href: buildChurchHistoryMattersSearchUrl(refQuery),
    description: `Scott Woodward & Casey Griffiths podcast and study pages mentioning ${verse.reference}`,
  })

  links.push({
    label: 'MormonR',
    href: buildMormonrSearchUrl(refQuery),
    description: `Hard Questions and primary sources mentioning ${verse.reference}`,
  })

  const cfmHome = CFM_MANUAL_HOME[verse.volume]
  if (cfmHome) {
    links.push({
      label: cfmHome.label,
      href: cfmHome.href,
      description: 'Home study curriculum for this volume’s recent CFM year',
    })
  }

  if (verse.volume === 'bible') {
    const passage = encodeURIComponent(verse.reference)
    links.push({
      label: 'Bible Project',
      href: buildBibleProjectGuideUrl(verse.book),
      description: `Overview video and study guide for ${verse.book}`,
    })
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
