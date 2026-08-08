// The things you'll want to change up top.
export const HER_NAME = 'Arzű'

// Cover and UI copy live in src/i18n.jsx, one block per language.

// Powers the "her birthday" shortcut on the write page. Month is 1-based.
export const BIRTHDAY = { month: 8, day: 9 }

/** The next occurrence of her birthday, as "YYYY-MM-DD". */
export function nextBirthday(now = new Date()) {
  const { month, day } = BIRTHDAY
  const thisYear = new Date(now.getFullYear(), month - 1, day)
  const target = thisYear < new Date(now.getFullYear(), now.getMonth(), now.getDate())
    ? new Date(now.getFullYear() + 1, month - 1, day)
    : thisYear
  const p = (n) => String(n).padStart(2, '0')
  return `${target.getFullYear()}-${p(target.getMonth() + 1)}-${p(target.getDate())}`
}
