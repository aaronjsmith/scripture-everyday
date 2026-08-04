/**
 * Scrapes FAIR OT/PGP weekly study resource URLs from their index page.
 * Returns Map<lessonNumber, absoluteHref>
 */
export async function fetchFairWeekLinks() {
  const indexUrl =
    'https://www.fairlatterdaysaints.org/scripture-study-resources/ot-pgp'
  const res = await fetch(indexUrl)
  if (!res.ok) {
    throw new Error(`FAIR index HTTP ${res.status}`)
  }
  const html = await res.text()
  const re =
    /https:\/\/www\.fairlatterdaysaints\.org\/scripture-study-resources\/ot-pgp\/(week-(\d+)[^"'<\s]*)/g
  /** @type {Map<number, string>} */
  const byWeek = new Map()
  for (const match of html.matchAll(re)) {
    const week = Number(match[2])
    const href = `https://www.fairlatterdaysaints.org/scripture-study-resources/ot-pgp/${match[1]}`
    if (!byWeek.has(week)) {
      byWeek.set(week, href)
    }
  }
  return byWeek
}
