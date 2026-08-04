/**
 * Fetches Come, Follow Me lesson metadata and writes public/data/cfm-index.json
 * Used to link verses to Church.org weekly study outlines.
 *
 * Year selection:
 * - CFM_YEAR env override, or
 * - the Open Scripture curriculum year whose date ranges cover *today*
 *   (calendar Dec often belongs to next year's manual, e.g. 2025-12-29 → 2026).
 *
 * Note: FAIR + followHIM scrapers are currently OT/2026-oriented. When the
 * curriculum rolls to NT/BoM/D&C, core CFM week resolution still works via
 * Open Scripture; weekly FAIR/followHIM hrefs may be sparse until those
 * scrapers are pointed at the new manuals.
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fetchFairWeekLinks } from './fair-weeks.mjs'
import { fetchFollowHimWeekLinks } from './followhim-weeks.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const outDir = join(root, 'public', 'data')
const outFile = join(outDir, 'cfm-index.json')

const CFM_API =
  'https://openscriptureapi.org/api/manuals/v1/lds/en/come-follow-me?limit=100'

function toIsoDate(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function lessonCoversIso(lesson, iso) {
  const start = lesson.dateRange?.start ?? lesson._id
  const end = lesson.dateRange?.end ?? start
  if (!start || !end) return false
  return iso >= start && iso <= end
}

async function fetchYear(year) {
  const url = `${CFM_API}&year=${year}`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`CFM API ${year}: HTTP ${res.status}`)
  }
  const data = await res.json()
  return Array.isArray(data.lessons) ? data.lessons : []
}

/**
 * Pick the curriculum year that contains today's date.
 * Tries calendar year, then +1 (late Dec → next manual), then -1.
 */
async function resolveCurriculumYear(today = new Date()) {
  const override = Number(process.env.CFM_YEAR)
  if (Number.isFinite(override) && override > 0) {
    const raw = await fetchYear(override)
    return { year: override, raw }
  }

  const calYear = today.getFullYear()
  const iso = toIsoDate(today)
  const candidates = [calYear, calYear + 1, calYear - 1]
  /** @type {{ year: number, raw: unknown[] } | null} */
  let fallback = null

  for (const year of candidates) {
    try {
      const raw = await fetchYear(year)
      if (!raw.length) continue
      if (!fallback) fallback = { year, raw }
      if (raw.some((lesson) => lessonCoversIso(lesson, iso))) {
        return { year, raw }
      }
    } catch (err) {
      console.warn(
        `CFM year ${year} unavailable:`,
        err instanceof Error ? err.message : err,
      )
    }
  }

  if (fallback) {
    console.warn(
      `No CFM lesson covers ${iso}; using year ${fallback.year} (${fallback.raw.length} lessons)`,
    )
    return fallback
  }

  throw new Error(`No Come, Follow Me lessons found near ${calYear}`)
}

function lessonHref(manualId, lessonNumber) {
  return `https://www.churchofjesuschrist.org/study/manual/${manualId}/${lessonNumber}?lang=eng`
}

async function main() {
  const { year, raw } = await resolveCurriculumYear()

  if (raw.length === 0) {
    throw new Error(`No Come, Follow Me lessons returned for ${year}`)
  }

  console.log(`Using CFM curriculum year ${year} (${raw.length} lessons)`)

  let fairByWeek = new Map()
  try {
    fairByWeek = await fetchFairWeekLinks()
    console.log(`Fetched ${fairByWeek.size} FAIR weekly study pages`)
  } catch (err) {
    console.warn('FAIR week index unavailable:', err.message ?? err)
  }

  let followHimByWeek = new Map()
  try {
    followHimByWeek = await fetchFollowHimWeekLinks()
    console.log(`Fetched ${followHimByWeek.size} followHIM episode pages`)
  } catch (err) {
    console.warn('followHIM week index unavailable:', err.message ?? err)
  }

  const byManual = new Map()
  for (const lesson of raw) {
    const list = byManual.get(lesson.manualId) ?? []
    list.push(lesson)
    byManual.set(lesson.manualId, list)
  }

  const lessons = []
  for (const [, group] of byManual) {
    group.forEach((lesson, index) => {
      const lessonNumber = index + 1
      lessons.push({
        id: lesson._id,
        year: lesson.year,
        manualId: lesson.manualId,
        lessonNumber,
        title: lesson.title,
        dateDisplay: lesson.dateRange?.display ?? '',
        dateStart: lesson.dateRange?.start ?? lesson._id,
        dateEnd: lesson.dateRange?.end ?? lesson._id,
        scriptureReferences: lesson.scriptureReferences ?? [],
        href: lessonHref(lesson.manualId, lessonNumber),
        fairHref: fairByWeek.get(lessonNumber) ?? null,
        followHimHref: followHimByWeek.get(lessonNumber) ?? null,
      })
    })
  }

  const withFair = lessons.filter((l) => l.fairHref).length
  const withFollowHim = lessons.filter((l) => l.followHimHref).length
  const todayIso = toIsoDate()
  const current = lessons.find(
    (l) => todayIso >= l.dateStart && todayIso <= l.dateEnd,
  )

  const payload = {
    generatedAt: new Date().toISOString(),
    source: 'https://openscriptureapi.org/docs/come-follow-me',
    fairSource:
      'https://www.fairlatterdaysaints.org/scripture-study-resources/ot-pgp',
    followHimSource: 'https://followhim.co/episode-collections/old-testament/',
    year,
    total: lessons.length,
    fairMatched: withFair,
    followHimMatched: withFollowHim,
    lessons,
  }

  await mkdir(outDir, { recursive: true })
  await writeFile(outFile, JSON.stringify(payload), 'utf8')
  console.log(
    `Wrote ${lessons.length} CFM lessons (${withFair} FAIR, ${withFollowHim} followHIM) → ${outFile}`,
  )
  if (current) {
    console.log(
      `Current week (${todayIso}): ${current.title} · ${current.dateDisplay} · ${current.scriptureReferences.join(', ')}`,
    )
  } else {
    console.warn(`No lesson in index covers today (${todayIso})`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
