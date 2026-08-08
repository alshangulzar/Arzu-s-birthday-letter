// Which letters she's already read. One object, keyed by letter id, so a letter
// that gets renamed or removed just quietly stops mattering.
//
//   { "amma-01": "2026-08-06T19:04:11.021Z", ... }

const KEY = 'letters-for-you:read'

// Safari in private mode throws on localStorage. A birthday present should not
// white-screen over that, so every access is wrapped.
function safeParse(raw) {
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

export function loadRead() {
  try {
    return safeParse(localStorage.getItem(KEY))
  } catch {
    return {}
  }
}

export function saveRead(map) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map))
  } catch {
    /* no persistence available — the session still works, it just forgets */
  }
}

export function markRead(id) {
  const map = loadRead()
  if (map[id]) return map
  const next = { ...map, [id]: new Date().toISOString() }
  saveRead(next)
  return next
}
