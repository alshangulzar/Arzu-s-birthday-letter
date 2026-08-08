// Everything here works in LOCAL time on purpose. A letter unlocks at local
// midnight of its date, and "days remaining" is measured midnight-to-midnight —
// so "opens tomorrow" is true all day today, right up until it isn't.

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const DAY_MS = 86400000

/** "2026-09-14" -> Date at 00:00:00 local on that day */
export function localMidnight(dateStr) {
  const [y, m, d] = String(dateStr).split('-').map(Number)
  return new Date(y, m - 1, d, 0, 0, 0, 0)
}

export function startOfToday(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
}

/** Whole days from today's local midnight to the unlock's local midnight. */
export function daysUntil(dateStr, now = new Date()) {
  const diff = localMidnight(dateStr).getTime() - startOfToday(now).getTime()
  // round, not floor: DST shifts a day by an hour and we don't want that to lie
  return Math.round(diff / DAY_MS)
}

export function isUnlocked(dateStr, now = new Date()) {
  return now.getTime() >= localMidnight(dateStr).getTime()
}

/** "opens tomorrow" / "opens 14 sept · 39 days" */
export function opensLabel(dateStr, now = new Date()) {
  const days = daysUntil(dateStr, now)
  if (days <= 0) return 'ready to open'
  if (days === 1) return 'opens tomorrow'
  return `opens ${formatDay(dateStr)} · ${days} days`
}

/** "14 sept" */
export function formatDay(dateStr) {
  const d = localMidnight(dateStr)
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

/** "14 September" — for the confirmation line, where it wants to be spelled out */
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function formatLong(dateStr) {
  const d = localMidnight(dateStr)
  return `${d.getDate()} ${MONTHS_LONG[d.getMonth()]}`
}

/** the numeric parts of a postmark; the month name is language, see i18n.jsx */
export function postmarkParts(dateStr) {
  const d = localMidnight(dateStr)
  return {
    day: String(d.getDate()).padStart(2, '0'),
    monthIndex: d.getMonth(),
    year: String(d.getFullYear()),
  }
}

/** "YYYY-MM-DD" for a Date, in local time — never toISOString, that's UTC */
export function toDateInput(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function todayInput() {
  return toDateInput(new Date())
}

export function inAMonth() {
  const d = new Date()
  d.setMonth(d.getMonth() + 1)
  return toDateInput(d)
}

/** ms until the next local midnight, so the UI can tick over without a reload */
export function msUntilNextMidnight(now = new Date()) {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 50)
  return Math.max(1000, next.getTime() - now.getTime())
}
