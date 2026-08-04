/**
 * Fetches Come, Follow Me lesson metadata and writes public/data/cfm-index.json
 * Used to link verses to Church.org weekly study outlines.
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

async function fetchYear(year) {
  const url = `${CFM_API}&year=${year}`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`CFM API ${year}: HTTP ${res.status}`)
  }
  const data = await res.json()
  return Array.isArray(data.lessons) ? data.lessons : []
}

function lessonHref(manualId, lessonNumber) {
  return `https://www.churchofjesuschrist.org/study/manual/${manualId}/${lessonNumber}?lang=eng`
}

async function main() {
  const year = Number(process.env.CFM_YEAR) || new Date().getFullYear()
  const raw = await fetchYear(year)

  if (raw.length === 0) {
    throw new Error(`No Come, Follow Me lessons returned for ${year}`)
  }

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
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
