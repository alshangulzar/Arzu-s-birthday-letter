import { motion } from 'framer-motion'
import { useReducedMotion } from '../hooks'
import { useLang } from '../i18n'

/**
 * A faint circular date stamp, sat slightly crooked and a little ink-starved,
 * the way a hand-pressed postmark lands. Sealed ones read "not yet posted".
 *
 * This is type and rings, not an illustration — the pack has no stamp in it,
 * and inventing one in PNG would look nothing like the rest.
 */
export default function Postmark({ date, posted = true, tilt = -8, stamp = false, className = '' }) {
  const reduced = useReducedMotion()
  const { t, postmark } = useLang()
  const { day, month, year } = postmark(date)

  const press = stamp && !reduced

  return (
    <motion.span
      className={`postmark ${posted ? '' : 'postmark--waiting'} ${className}`}
      aria-hidden="true"
      style={{ rotate: tilt }}
      initial={press ? { scale: 2.1, opacity: 0, rotate: tilt - 14 } : false}
      animate={press ? { scale: [2.1, 0.92, 1], opacity: [0, 1, 1], rotate: [tilt - 14, tilt + 4, tilt] } : undefined}
      transition={press ? { duration: 0.42, ease: [0.3, 1.4, 0.5, 1], times: [0, 0.72, 1] } : undefined}
    >
      <span className="postmark__ring" />
      <span className="postmark__inner">
        <span className="postmark__day">{day}</span>
        <span className="postmark__month">{month}</span>
        <span className="postmark__year">{year}</span>
      </span>
      <span className="postmark__arc postmark__arc--top">{posted ? t.stampTop : t.stampTopWaiting}</span>
      <span className="postmark__arc postmark__arc--bottom">{posted ? t.stampBottom : t.stampBottomWaiting}</span>
    </motion.span>
  )
}
