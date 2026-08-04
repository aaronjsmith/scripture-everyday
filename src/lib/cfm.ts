import type { Verse } from './types'

export interface CfmLesson {
  id: string
  year: number
  manualId: string
  lessonNumber: number
  title: string
  dateDisplay: string
  dateStart?: string
  dateEnd?: string
  scriptureReferences: string[]
  href: string
  /** FAIR Latter-day Saints weekly study page, when available */
  fairHref?: string | null
  /** followHIM podcast episode (Part 1 show notes), when available */
  followHimHref?: string | null
}

export interface CfmVerseRef {
  book: string
  chapter: number
  startVerse: number | null
  endVerse: number | null
}

export interface CfmCurrentPayload {
  id: string
  title: string
  dateDisplay: string
  dateStart: string
  dateEnd: string
  scriptureReferences: string[]
  contentText: string
  href?: string
}

interface CfmIndexPayload {
  lessons: CfmLesson[]
}

const BOOK_ALIASES: Record<string, string> = {
  psalm: 'psalms',
  'song of songs': 'song of solomon',
  'doctrine & covenants': 'doctrine and covenants',
  'd&c': 'doctrine and covenants',
  dc: 'doctrine and covenants',
  'joseph smith-matthew': 'joseph smith—matthew',
  'joseph smith-history': 'joseph smith—history',
}

/** Multi-word / numbered books matched longest-first when scanning lesson text. */
const CITATION_BOOKS = [
  'Doctrine and Covenants',
  'Joseph Smith—Matthew',
  'Joseph Smith-Matthew',
  'Joseph Smith—History',
  'Joseph Smith-History',
  'Song of Solomon',
  'Words of Mormon',
  '1 Nephi',
  '2 Nephi',
  '3 Nephi',
  '4 Nephi',
  '1 Samuel',
  '2 Samuel',
  '1 Kings',
  '2 Kings',
  '1 Chronicles',
  '2 Chronicles',
  '1 Corinthians',
  '2 Corinthians',
  '1 Thessalonians',
  '2 Thessalonians',
  '1 Timothy',
  '2 Timothy',
  '1 Peter',
  '2 Peter',
  '1 John',
  '2 John',
  '3 John',
  'Helaman',
  'Mosiah',
  'Alma',
  'Ether',
  'Moroni',
  'Enos',
  'Jarom',
  'Omni',
  'Jacob',
  'Mormon',
  'Nephi',
  'Genesis',
  'Exodus',
  'Leviticus',
  'Numbers',
  'Deuteronomy',
  'Joshua',
  'Judges',
  'Ruth',
  'Ezra',
  'Nehemiah',
  'Esther',
  'Job',
  'Psalms',
  'Psalm',
  'Proverbs',
  'Ecclesiastes',
  'Isaiah',
  'Jeremiah',
  'Lamentations',
  'Ezekiel',
  'Daniel',
  'Hosea',
  'Joel',
  'Amos',
  'Obadiah',
  'Jonah',
  'Micah',
  'Nahum',
  'Habakkuk',
  'Zephaniah',
  'Haggai',
  'Zechariah',
  'Malachi',
  'Matthew',
  'Mark',
  'Luke',
  'John',
  'Acts',
  'Romans',
  'Galatians',
  'Ephesians',
  'Philippians',
  'Colossians',
  'Titus',
  'Philemon',
  'Hebrews',
  'James',
  'Jude',
  'Revelation',
  'Moses',
  'Abraham',
  'Articles of Faith',
].sort((a, b) => b.length - a.length)

const BOOK_LOOKUP_RE = new RegExp(
  `\\b(${CITATION_BOOKS.map(escapeRegExp).join('|')})\\b`,
  'gi',
)

let cachedLessons: CfmLesson[] | null = null
let loadPromise: Promise<CfmLesson[]> | null = null

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizeBook(name: string): string {
  const key = name
    .toLowerCase()
    .replace(/[—–]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
  return BOOK_ALIASES[key] ?? key.replace(/-/g, '—')
}

function toIsoDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d + days))
  return date.toISOString().slice(0, 10)
}

function lessonStart(lesson: CfmLesson): string {
  return lesson.dateStart ?? lesson.id
}

function lessonEnd(lesson: CfmLesson, all: CfmLesson[]): string {
  if (lesson.dateEnd) return lesson.dateEnd
  const sorted = [...all].sort((a, b) =>
    lessonStart(a).localeCompare(lessonStart(b)),
  )
  const idx = sorted.findIndex((l) => l.id === lesson.id)
  if (idx >= 0 && idx < sorted.length - 1) {
    return addDaysIso(lessonStart(sorted[idx + 1]), -1)
  }
  return addDaysIso(lessonStart(lesson), 6)
}

/** Parse CFM strings like "Esther", "Genesis 1–2", "1 Samuel 17–18". */
function parseCfmReference(raw: string): {
  book: string
  startChapter: number | null
  endChapter: number | null
} | null {
  const text = raw.trim()
  if (!text || /^(introduction|easter|christmas)/i.test(text)) {
    return null
  }

  const match = text.match(/^(.+?)(?:\s+(\d+)(?:\s*[–\-]\s*(\d+))?)?$/)
  if (!match) return null

  const book = normalizeBook(match[1])
  if (!book) return null

  const startChapter = match[2] ? Number(match[2]) : null
  const endChapter = match[3] ? Number(match[3]) : startChapter

  return { book, startChapter, endChapter }
}

export function lessonCoversVerse(lesson: CfmLesson, verse: Verse): boolean {
  const verseBook = normalizeBook(verse.book)

  for (const ref of lesson.scriptureReferences) {
    const parsed = parseCfmReference(ref)
    if (!parsed) continue
    if (parsed.book !== verseBook) continue
    if (parsed.startChapter == null) return true
    const end = parsed.endChapter ?? parsed.startChapter
    if (verse.chapter >= parsed.startChapter && verse.chapter <= end) {
      return true
    }
  }

  return false
}

export function findCurrentLesson(
  lessons: CfmLesson[],
  today: Date = new Date(),
): CfmLesson | null {
  if (!lessons.length) return null
  const iso = toIsoDate(today)
  for (const lesson of lessons) {
    const start = lessonStart(lesson)
    const end = lessonEnd(lesson, lessons)
    if (iso >= start && iso <= end) return lesson
  }
  return null
}

/**
 * Parse chapter/verse citations that follow a book name, including chained
 * forms like "Esther 2:21–23; 3:10–14" and bare chapters "Esther 3; 5:9–14".
 */
function parseCitationTail(book: string, tail: string): CfmVerseRef[] {
  const refs: CfmVerseRef[] = []
  const chunks = tail.split(/[;]/).map((c) => c.trim()).filter(Boolean)

  for (const chunk of chunks) {
    const rangeMatch = chunk.match(
      /^(\d+)(?:\s*:\s*(\d+)(?:\s*[–\-]\s*(\d+))?)?(?:\s*[–\-]\s*(\d+))?$/,
    )
    if (!rangeMatch) continue

    const chapter = Number(rangeMatch[1])
    if (!Number.isFinite(chapter) || chapter < 1) continue

    // "1–3" chapter range without verses
    if (rangeMatch[4] && !rangeMatch[2]) {
      const endChapter = Number(rangeMatch[4])
      for (let ch = chapter; ch <= endChapter; ch++) {
        refs.push({
          book,
          chapter: ch,
          startVerse: null,
          endVerse: null,
        })
      }
      continue
    }

    const startVerse = rangeMatch[2] ? Number(rangeMatch[2]) : null
    const endVerse = rangeMatch[3]
      ? Number(rangeMatch[3])
      : startVerse

    refs.push({ book, chapter, startVerse, endVerse })
  }

  return refs
}

/** Extract scripture citations from CFM lesson body text. */
export function parseCitationsFromText(text: string): CfmVerseRef[] {
  if (!text.trim()) return []

  const refs: CfmVerseRef[] = []
  const seen = new Set<string>()

  for (const match of text.matchAll(BOOK_LOOKUP_RE)) {
    const bookRaw = match[1]
    const book = normalizeBook(bookRaw)
    const after = text.slice(match.index! + bookRaw.length)

    // Require a chapter number soon after the book name
    const tailMatch = after.match(
      /^\s+(\d+(?:\s*:\s*\d+(?:\s*[–\-]\s*\d+)?)?(?:\s*[;,]?\s*\d+(?:\s*:\s*\d+(?:\s*[–\-]\s*\d+)?)?)*)/,
    )
    if (!tailMatch) continue

    for (const ref of parseCitationTail(book, tailMatch[1])) {
      const key = `${ref.book}|${ref.chapter}|${ref.startVerse ?? ''}|${ref.endVerse ?? ''}`
      if (seen.has(key)) continue
      seen.add(key)
      refs.push(ref)
    }
  }

  return refs
}

function verseMatchesCitation(verse: Verse, ref: CfmVerseRef): boolean {
  if (normalizeBook(verse.book) !== ref.book) return false
  if (verse.chapter !== ref.chapter) return false
  if (ref.startVerse == null) return true
  const end = ref.endVerse ?? ref.startVerse
  return verse.verse >= ref.startVerse && verse.verse <= end
}

export function versesForLessonPrimary(
  verses: Verse[],
  lesson: CfmLesson,
): Verse[] {
  return verses.filter((v) => lessonCoversVerse(lesson, v))
}

export function versesForCitations(
  verses: Verse[],
  citations: CfmVerseRef[],
): Verse[] {
  if (!citations.length) return []
  return verses.filter((v) =>
    citations.some((ref) => verseMatchesCitation(v, ref)),
  )
}

/** Primary block plus connected citations, de-duplicated by verse id. */
export function buildCfmVersePool(
  verses: Verse[],
  lesson: CfmLesson,
  connectedCitations: CfmVerseRef[] = [],
): { primary: Verse[]; connected: Verse[]; pool: Verse[] } {
  const primary = versesForLessonPrimary(verses, lesson)
  const primaryIds = new Set(primary.map((v) => v.id))
  const connected = versesForCitations(verses, connectedCitations).filter(
    (v) => !primaryIds.has(v.id),
  )
  return { primary, connected, pool: [...primary, ...connected] }
}

export async function loadCfmLessons(): Promise<CfmLesson[]> {
  if (cachedLessons) return cachedLessons
  if (!loadPromise) {
    loadPromise = fetch('/data/cfm-index.json')
      .then(async (res) => {
        if (!res.ok) throw new Error(`CFM index HTTP ${res.status}`)
        const data = (await res.json()) as CfmIndexPayload
        cachedLessons = Array.isArray(data.lessons) ? data.lessons : []
        return cachedLessons
      })
      .catch(() => {
        cachedLessons = []
        return cachedLessons
      })
  }
  return loadPromise
}

export async function findCfmLessonsForVerse(
  verse: Verse,
): Promise<CfmLesson[]> {
  const lessons = await loadCfmLessons()
  return lessons.filter((lesson) => lessonCoversVerse(lesson, verse))
}

/** Proxied Open Scripture current lesson (Worker or Vite proxy). */
export async function loadCfmCurrentLesson(): Promise<CfmCurrentPayload | null> {
  try {
    const res = await fetch('/api/cfm/current')
    if (!res.ok) return null
    const data = (await res.json()) as Record<string, unknown>
    return normalizeCurrentPayload(data)
  } catch {
    return null
  }
}

function normalizeCurrentPayload(
  data: Record<string, unknown>,
): CfmCurrentPayload | null {
  // Worker-shaped payload
  if (typeof data.contentText === 'string') {
    return {
      id: typeof data.id === 'string' ? data.id : '',
      title: typeof data.title === 'string' ? data.title : '',
      dateDisplay: typeof data.dateDisplay === 'string' ? data.dateDisplay : '',
      dateStart: typeof data.dateStart === 'string' ? data.dateStart : '',
      dateEnd: typeof data.dateEnd === 'string' ? data.dateEnd : '',
      scriptureReferences: Array.isArray(data.scriptureReferences)
        ? data.scriptureReferences.filter(
            (r): r is string => typeof r === 'string',
          )
        : [],
      contentText: data.contentText,
      href: typeof data.href === 'string' ? data.href : undefined,
    }
  }

  // Raw Open Scripture shape (Vite proxy)
  const content = data.content
  const dateRange =
    data.dateRange && typeof data.dateRange === 'object'
      ? (data.dateRange as Record<string, unknown>)
      : null
  const text =
    content && typeof content === 'object'
      ? (content as Record<string, unknown>).text
      : null
  if (typeof text !== 'string') return null

  const dateStart =
    (typeof dateRange?.start === 'string' ? dateRange.start : null) ??
    (typeof data._id === 'string' ? data._id : '')

  return {
    id: typeof data._id === 'string' ? data._id : dateStart,
    title: typeof data.title === 'string' ? data.title : '',
    dateDisplay:
      typeof dateRange?.display === 'string' ? dateRange.display : '',
    dateStart,
    dateEnd:
      (typeof dateRange?.end === 'string' ? dateRange.end : null) ?? dateStart,
    scriptureReferences: Array.isArray(data.scriptureReferences)
      ? data.scriptureReferences.filter(
          (r): r is string => typeof r === 'string',
        )
      : [],
    contentText: text,
  }
}

