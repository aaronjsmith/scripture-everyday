/**
 * Scrapes followHIM (followhim.co) 2026 OT episode show-note URLs.
 * Episode numbers align with Come, Follow Me lesson numbers.
 * Returns Map<lessonNumber, absoluteHref> (prefers Part 1 show notes).
 */

const COLLECTIONS_URL =
  'https://followhim.co/episode-collections/old-testament/'

const FALLBACK_INDEX_PAGES = [
  'https://followhim.co/old-testament-2026-episodes-1-10/',
  'https://followhim.co/old-testament-2026-episodes-11-20/',
  'https://followhim.co/old-testament-2026-episodes-21-30/',
  'https://followhim.co/old-testament-2026-episodes-31-40/',
]

function absolutize(href, base) {
  try {
    return new URL(href, base).href
  } catch {
    return null
  }
}

async function discoverIndexPages() {
  const res = await fetch(COLLECTIONS_URL)
  if (!res.ok) {
    return [...FALLBACK_INDEX_PAGES]
  }
  const html = await res.text()
  const found = new Set()
  const re =
    /href=["']([^"']*old-testament-2026-episodes-\d+-\d+\/?)["']/gi
  for (const match of html.matchAll(re)) {
    const href = absolutize(match[1], COLLECTIONS_URL)
    if (href) found.add(href.endsWith('/') ? href : `${href}/`)
  }
  if (found.size === 0) {
    return [...FALLBACK_INDEX_PAGES]
  }
  return [...found].sort()
}

/**
 * Prefer durable slug Part 1 URLs; otherwise first show-note near the episode heading.
 * @param {string} html
 * @param {Map<number, string>} byEpisode
 */
function collectFromIndexHtml(html, byEpisode) {
  const durable =
    /https?:\/\/followhim\.co\/show-note\/old-testament-episode-(\d+)-2026-[^"'<\s]+-part-1\/?/gi
  for (const match of html.matchAll(durable)) {
    const episode = Number(match[1])
    const href = match[0].endsWith('/') ? match[0] : `${match[0]}/`
    if (!byEpisode.has(episode)) {
      byEpisode.set(episode, href)
    }
  }

  const sections = html.split(/(?=EPISODE\s+\d+)/i)
  for (const section of sections) {
    const epMatch = section.match(/EPISODE\s+(\d+)/i)
    if (!epMatch) continue
    const episode = Number(epMatch[1])
    if (!Number.isFinite(episode) || episode < 1 || episode > 60) continue
    if (byEpisode.has(episode)) continue

    const linkMatch = section.match(
      /href=["'](https?:\/\/followhim\.co\/show-note\/[^"']+)["']/i,
    )
    if (!linkMatch) continue
    const href = linkMatch[1].endsWith('/') ? linkMatch[1] : `${linkMatch[1]}/`
    byEpisode.set(episode, href)
  }
}

export async function fetchFollowHimWeekLinks() {
  const indexPages = await discoverIndexPages()
  /** @type {Map<number, string>} */
  const byEpisode = new Map()

  for (const url of indexPages) {
    const res = await fetch(url)
    if (!res.ok) continue
    const html = await res.text()
    collectFromIndexHtml(html, byEpisode)
  }

  return byEpisode
}
