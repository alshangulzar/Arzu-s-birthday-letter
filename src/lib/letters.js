import { createClient } from '@supabase/supabase-js'
import seed from '../data/letters.json'

const env = import.meta.env

// Accept every name these keys realistically arrive under: set by hand as
// VITE_*, or written automatically by the Supabase → Vercel integration.
const URL =
  env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || ''
const KEY =
  env.VITE_SUPABASE_ANON_KEY ||
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  env.SUPABASE_ANON_KEY ||
  env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  ''

export const isRemote = Boolean(URL && KEY)

export const supabase = isRemote ? createClient(URL, KEY, { auth: { persistSession: false } }) : null

/**
 * Read the mailbox.
 *
 * Reads go through letters_public, never the letters table. That view returns
 * `message: null` for anything still sealed — the text of a sealed letter is
 * not in the response at all, so there is nothing to find in dev tools. See
 * supabase/schema.sql.
 *
 * With no credentials configured the app falls back to src/data/letters.json so
 * it still runs locally. That fallback has the messages client-side, obviously
 * — it's for development, not for her.
 */
export async function fetchLetters() {
  if (!isRemote) {
    return seed.map((l) => ({
      id: l.id,
      from: l.from,
      message: l.message,
      unlockDate: l.unlockDate,
      envelope: l.envelope || 'lemon',
      sticker: l.sticker || null,
      order: l.order,
      unlocked: undefined, // let the client decide in the local fallback
    }))
  }

  const { data, error } = await supabase
    .from('letters_public')
    .select('id, from_name, message, unlock_date, envelope, sticker, unlocked, created_at')
    .order('unlock_date', { ascending: true })

  if (error) throw error

  return (data || []).map((r) => ({
    id: r.id,
    from: r.from_name,
    message: r.message, // null while sealed — the server withheld it
    unlockDate: r.unlock_date,
    envelope: r.envelope,
    sticker: r.sticker,
    unlocked: r.unlocked,
    createdAt: r.created_at,
  }))
}

const DRAFTS_KEY = 'letters-for-you:drafts'

/**
 * Letters sealed while there's no Supabase configured.
 *
 * These used to live in sessionStorage, which empties the moment the tab
 * closes — real letters from real people were one accidental close away from
 * being gone. localStorage keeps them. It's still only this one browser, so
 * Supabase is the real answer, but nothing is lost by refreshing.
 */
function readDrafts() {
  try {
    const stored = JSON.parse(localStorage.getItem(DRAFTS_KEY) || '[]')
    // rescue anything left behind by the old sessionStorage version
    const stale = JSON.parse(sessionStorage.getItem(DRAFTS_KEY) || '[]')
    if (stale.length) {
      const known = new Set(stored.map((d) => d.id))
      const merged = [...stored, ...stale.filter((d) => !known.has(d.id))]
      localStorage.setItem(DRAFTS_KEY, JSON.stringify(merged))
      sessionStorage.removeItem(DRAFTS_KEY)
      return merged
    }
    return stored
  } catch {
    return []
  }
}

/** Post a letter into the mailbox. Insert is the only thing anon may do. */
export async function postLetter({ from, message, unlockDate, envelope, sticker }) {
  if (!isRemote) {
    const local = readDrafts()
    const row = {
      id: `local-${Date.now()}`,
      from,
      message,
      unlockDate,
      envelope,
      sticker,
      // each new one queues behind the last, so they arrive in the order they
      // were sealed rather than shuffling among letters that share a date
      order: 1000 + local.length,
      createdAt: new Date().toISOString(),
    }
    try {
      localStorage.setItem(DRAFTS_KEY, JSON.stringify([...local, row]))
    } catch {
      /* storage full or blocked — the letter still shows until reload */
    }
    return row
  }

  const { data, error } = await supabase
    .from('letters')
    .insert({
      from_name: from,
      message,
      unlock_date: unlockDate,
      envelope,
      sticker: sticker || null,
    })
    .select('id')
    .single()

  if (error) throw error
  return { id: data.id, from, message, unlockDate, envelope, sticker }
}

/** Letters sealed on this browser while running without Supabase. */
export function localDrafts() {
  if (isRemote) return []
  return readDrafts()
}
