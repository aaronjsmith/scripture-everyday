/**
 * Downloads public-domain scripture JSON and builds public/data/verses.json
 *
 * Sources:
 * - LDS volumes: bcbooks/scriptures-json (flat editions)
 * - Bible KJV + WEB: midvash/bible-data
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const outDir = join(root, 'public', 'data')
const outFile = join(outDir, 'verses.json')

const SOURCES = {
  bom: 'https://raw.githubusercontent.com/bcbooks/scriptures-json/master/flat/book-of-mormon-flat.json',
  dc: 'https://raw.githubusercontent.com/bcbooks/scriptures-json/master/flat/doctrine-and-covenants-flat.json',
  pgp: 'https://raw.githubusercontent.com/bcbooks/scriptures-json/master/flat/pearl-of-great-price-flat.json',
  kjv: 'https://raw.githubusercontent.com/midvash/bible-data/main/versions/en/kjv/kjv.json',
  web: 'https://raw.githubusercontent.com/midvash/bible-data/main/versions/en/web/web.json',
}

/** Church study URL book slugs keyed by normalized book title */
const CHURCH_SLUGS = {
  // Old Testament
  genesis: { volume: 'ot', book: 'gen' },
  exodus: { volume: 'ot', book: 'ex' },
  leviticus: { volume: 'ot', book: 'lev' },
  numbers: { volume: 'ot', book: 'num' },
  deuteronomy: { volume: 'ot', book: 'deut' },
  joshua: { volume: 'ot', book: 'josh' },
  judges: { volume: 'ot', book: 'judg' },
  ruth: { volume: 'ot', book: 'ruth' },
  '1 samuel': { volume: 'ot', book: '1-sam' },
  '2 samuel': { volume: 'ot', book: '2-sam' },
  '1 kings': { volume: 'ot', book: '1-kgs' },
  '2 kings': { volume: 'ot', book: '2-kgs' },
  '1 chronicles': { volume: 'ot', book: '1-chr' },
  '2 chronicles': { volume: 'ot', book: '2-chr' },
  ezra: { volume: 'ot', book: 'ezra' },
  nehemiah: { volume: 'ot', book: 'neh' },
  esther: { volume: 'ot', book: 'esth' },
  job: { volume: 'ot', book: 'job' },
  psalms: { volume: 'ot', book: 'ps' },
  psalm: { volume: 'ot', book: 'ps' },
  proverbs: { volume: 'ot', book: 'prov' },
  ecclesiastes: { volume: 'ot', book: 'eccl' },
  'song of solomon': { volume: 'ot', book: 'song' },
  'song of songs': { volume: 'ot', book: 'song' },
  isaiah: { volume: 'ot', book: 'isa' },
  jeremiah: { volume: 'ot', book: 'jer' },
  lamentations: { volume: 'ot', book: 'lam' },
  ezekiel: { volume: 'ot', book: 'ezek' },
  daniel: { volume: 'ot', book: 'dan' },
  hosea: { volume: 'ot', book: 'hosea' },
  joel: { volume: 'ot', book: 'joel' },
  amos: { volume: 'ot', book: 'amos' },
  obadiah: { volume: 'ot', book: 'obad' },
  jonah: { volume: 'ot', book: 'jonah' },
  micah: { volume: 'ot', book: 'micah' },
  nahum: { volume: 'ot', book: 'nahum' },
  habakkuk: { volume: 'ot', book: 'hab' },
  zephaniah: { volume: 'ot', book: 'zeph' },
  haggai: { volume: 'ot', book: 'hag' },
  zechariah: { volume: 'ot', book: 'zech' },
  malachi: { volume: 'ot', book: 'mal' },
  // New Testament
  matthew: { volume: 'nt', book: 'matt' },
  mark: { volume: 'nt', book: 'mark' },
  luke: { volume: 'nt', book: 'luke' },
  john: { volume: 'nt', book: 'john' },
  acts: { volume: 'nt', book: 'acts' },
  romans: { volume: 'nt', book: 'rom' },
  '1 corinthians': { volume: 'nt', book: '1-cor' },
  '2 corinthians': { volume: 'nt', book: '2-cor' },
  galatians: { volume: 'nt', book: 'gal' },
  ephesians: { volume: 'nt', book: 'eph' },
  philippians: { volume: 'nt', book: 'philip' },
  colossians: { volume: 'nt', book: 'col' },
  '1 thessalonians': { volume: 'nt', book: '1-thes' },
  '2 thessalonians': { volume: 'nt', book: '2-thes' },
  '1 timothy': { volume: 'nt', book: '1-tim' },
  '2 timothy': { volume: 'nt', book: '2-tim' },
  titus: { volume: 'nt', book: 'titus' },
  philemon: { volume: 'nt', book: 'philem' },
  hebrews: { volume: 'nt', book: 'heb' },
  james: { volume: 'nt', book: 'james' },
  '1 peter': { volume: 'nt', book: '1-pet' },
  '2 peter': { volume: 'nt', book: '2-pet' },
  '1 john': { volume: 'nt', book: '1-jn' },
  '2 john': { volume: 'nt', book: '2-jn' },
  '3 john': { volume: 'nt', book: '3-jn' },
  jude: { volume: 'nt', book: 'jude' },
  revelation: { volume: 'nt', book: 'rev' },
  // Book of Mormon
  '1 nephi': { volume: 'bofm', book: '1-ne' },
  '2 nephi': { volume: 'bofm', book: '2-ne' },
  jacob: { volume: 'bofm', book: 'jacob' },
  enos: { volume: 'bofm', book: 'enos' },
  jarom: { volume: 'bofm', book: 'jarom' },
  omni: { volume: 'bofm', book: 'omni' },
  'words of mormon': { volume: 'bofm', book: 'w-of-m' },
  mosiah: { volume: 'bofm', book: 'mosiah' },
  alma: { volume: 'bofm', book: 'alma' },
  helaman: { volume: 'bofm', book: 'hel' },
  '3 nephi': { volume: 'bofm', book: '3-ne' },
  '4 nephi': { volume: 'bofm', book: '4-ne' },
  mormon: { volume: 'bofm', book: 'morm' },
  ether: { volume: 'bofm', book: 'ether' },
  moroni: { volume: 'bofm', book: 'moro' },
  // Doctrine and Covenants
  'doctrine and covenants': { volume: 'dc-testament', book: 'dc' },
  'doctrine & covenants': { volume: 'dc-testament', book: 'dc' },
  // Pearl of Great Price
  moses: { volume: 'pgp', book: 'moses' },
  abraham: { volume: 'pgp', book: 'abr' },
  'joseph smith—matthew': { volume: 'pgp', book: 'js-m' },
  'joseph smith-matthew': { volume: 'pgp', book: 'js-m' },
  'joseph smith—history': { volume: 'pgp', book: 'js-h' },
  'joseph smith-history': { volume: 'pgp', book: 'js-h' },
  'articles of faith': { volume: 'pgp', book: 'a-of-f' },
}

const BIBLE_ABBREV_TO_NAME = {
  Gen: 'Genesis',
  Exod: 'Exodus',
  Exo: 'Exodus',
  Lev: 'Leviticus',
  Num: 'Numbers',
  Deut: 'Deuteronomy',
  Deu: 'Deuteronomy',
  Josh: 'Joshua',
  Jos: 'Joshua',
  Judg: 'Judges',
  Jdg: 'Judges',
  Ruth: 'Ruth',
  Rut: 'Ruth',
  '1Sam': '1 Samuel',
  '1Sa': '1 Samuel',
  '2Sam': '2 Samuel',
  '2Sa': '2 Samuel',
  '1Kgs': '1 Kings',
  '1Ki': '1 Kings',
  '2Kgs': '2 Kings',
  '2Ki': '2 Kings',
  '1Chr': '1 Chronicles',
  '1Ch': '1 Chronicles',
  '2Chr': '2 Chronicles',
  '2Ch': '2 Chronicles',
  Ezra: 'Ezra',
  Ezr: 'Ezra',
  Neh: 'Nehemiah',
  Esth: 'Esther',
  Est: 'Esther',
  Job: 'Job',
  Ps: 'Psalms',
  Psa: 'Psalms',
  Prov: 'Proverbs',
  Pro: 'Proverbs',
  Eccl: 'Ecclesiastes',
  Ecc: 'Ecclesiastes',
  Song: 'Song of Solomon',
  Sos: 'Song of Solomon',
  Isa: 'Isaiah',
  Jer: 'Jeremiah',
  Lam: 'Lamentations',
  Ezek: 'Ezekiel',
  Eze: 'Ezekiel',
  Dan: 'Daniel',
  Hos: 'Hosea',
  Joel: 'Joel',
  Jol: 'Joel',
  Amos: 'Amos',
  Amo: 'Amos',
  Obad: 'Obadiah',
  Oba: 'Obadiah',
  Jonah: 'Jonah',
  Jon: 'Jonah',
  Mic: 'Micah',
  Nah: 'Nahum',
  Hab: 'Habakkuk',
  Zeph: 'Zephaniah',
  Zep: 'Zephaniah',
  Hag: 'Haggai',
  Zech: 'Zechariah',
  Zec: 'Zechariah',
  Mal: 'Malachi',
  Matt: 'Matthew',
  Mat: 'Matthew',
  Mark: 'Mark',
  Mar: 'Mark',
  Luke: 'Luke',
  Luk: 'Luke',
  John: 'John',
  Jhn: 'John',
  Acts: 'Acts',
  Act: 'Acts',
  Rom: 'Romans',
  '1Cor': '1 Corinthians',
  '1Co': '1 Corinthians',
  '2Cor': '2 Corinthians',
  '2Co': '2 Corinthians',
  Gal: 'Galatians',
  Eph: 'Ephesians',
  Phil: 'Philippians',
  Php: 'Philippians',
  Col: 'Colossians',
  '1Thess': '1 Thessalonians',
  '1Th': '1 Thessalonians',
  '2Thess': '2 Thessalonians',
  '2Th': '2 Thessalonians',
  '1Tim': '1 Timothy',
  '1Ti': '1 Timothy',
  '2Tim': '2 Timothy',
  '2Ti': '2 Timothy',
  Titus: 'Titus',
  Tit: 'Titus',
  Phlm: 'Philemon',
  Phm: 'Philemon',
  Heb: 'Hebrews',
  Jas: 'James',
  Jam: 'James',
  '1Pet': '1 Peter',
  '1Pe': '1 Peter',
  '2Pet': '2 Peter',
  '2Pe': '2 Peter',
  '1John': '1 John',
  '1Jn': '1 John',
  '2John': '2 John',
  '2Jn': '2 John',
  '3John': '3 John',
  '3Jn': '3 John',
  Jude: 'Jude',
  Jud: 'Jude',
  Rev: 'Revelation',
}

async function fetchJson(url) {
  console.log(`Fetching ${url}`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed ${url}: ${res.status}`)
  return res.json()
}

function normalizeBookKey(name) {
  return name
    .toLowerCase()
    .replace(/[—–]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseLdsReference(reference) {
  // "1 Nephi 1:1", "Doctrine and Covenants 76:22", "Joseph Smith—History 1:17"
  const match = reference.match(/^(.+?)\s+(\d+):(\d+)$/)
  if (!match) return null
  return {
    book: match[1].trim(),
    chapter: Number(match[2]),
    verse: Number(match[3]),
  }
}

function churchMeta(bookName) {
  const key = normalizeBookKey(bookName)
  return CHURCH_SLUGS[key] ?? null
}

function fromFlatVolume(volumeId, volumeLabel, flat) {
  const verses = []
  for (const entry of flat.verses ?? []) {
    const parsed = parseLdsReference(entry.reference)
    if (!parsed) continue
    // Skip Official Declarations if present
    if (/official declaration/i.test(parsed.book)) continue

    const meta = churchMeta(parsed.book)
    const id = `${volumeId}|${normalizeBookKey(parsed.book).replace(/\s+/g, '-')}|${parsed.chapter}|${parsed.verse}`
    verses.push({
      id,
      volume: volumeId,
      volumeLabel,
      book: parsed.book,
      chapter: parsed.chapter,
      verse: parsed.verse,
      reference: entry.reference,
      text: entry.text.trim(),
      churchVolume: meta?.volume ?? null,
      churchBook: meta?.book ?? null,
    })
  }
  return verses
}

function bibleBookName(bookAbbrev, englishName) {
  if (englishName) return englishName
  return BIBLE_ABBREV_TO_NAME[bookAbbrev] ?? bookAbbrev
}

function indexBible(bibleJson) {
  /** @type {Map<string, string>} */
  const map = new Map()
  for (const book of bibleJson.books ?? []) {
    const name = bibleBookName(book.book, book.englishName)
    for (const chapter of book.chapters ?? []) {
      for (const verse of chapter.verses ?? []) {
        const key = `${normalizeBookKey(name)}|${chapter.chapter}|${verse.number}`
        map.set(key, String(verse.text).trim())
      }
    }
  }
  return map
}

function fromBible(kjv, web) {
  const webIndex = indexBible(web)
  const verses = []

  for (const book of kjv.books ?? []) {
    const name = bibleBookName(book.book, book.englishName)
    const meta = churchMeta(name)
    for (const chapter of book.chapters ?? []) {
      for (const verse of chapter.verses ?? []) {
        const key = `${normalizeBookKey(name)}|${chapter.chapter}|${verse.number}`
        const webText = webIndex.get(key)
        const id = `bible|${normalizeBookKey(name).replace(/\s+/g, '-')}|${chapter.chapter}|${verse.number}`
        verses.push({
          id,
          volume: 'bible',
          volumeLabel: 'Holy Bible',
          book: name,
          chapter: chapter.chapter,
          verse: verse.number,
          reference: `${name} ${chapter.chapter}:${verse.number}`,
          text: String(verse.text).trim(),
          textWeb: webText ?? null,
          churchVolume: meta?.volume ?? null,
          churchBook: meta?.book ?? null,
        })
      }
    }
  }
  return verses
}

async function main() {
  const [bom, dc, pgp, kjv, web] = await Promise.all([
    fetchJson(SOURCES.bom),
    fetchJson(SOURCES.dc),
    fetchJson(SOURCES.pgp),
    fetchJson(SOURCES.kjv),
    fetchJson(SOURCES.web),
  ])

  const verses = [
    ...fromFlatVolume('bom', 'Book of Mormon', bom),
    ...fromBible(kjv, web),
    ...fromFlatVolume('pgp', 'Pearl of Great Price', pgp),
    ...fromFlatVolume('dc', 'Doctrine and Covenants', dc),
  ]

  const byVolume = verses.reduce((acc, v) => {
    acc[v.volume] = (acc[v.volume] ?? 0) + 1
    return acc
  }, {})

  const payload = {
    generatedAt: new Date().toISOString(),
    sources: {
      lds: 'bcbooks/scriptures-json (public domain)',
      bible: 'midvash/bible-data KJV + WEB (public domain)',
    },
    counts: { total: verses.length, byVolume },
    verses,
  }

  await mkdir(outDir, { recursive: true })
  await writeFile(outFile, JSON.stringify(payload))
  console.log(`Wrote ${verses.length} verses → ${outFile}`)
  console.log(byVolume)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
