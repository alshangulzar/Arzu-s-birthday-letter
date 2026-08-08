import { motion } from 'framer-motion'
import { art, size } from '../lib/assets'
import { useReducedMotion } from '../hooks'

/**
 * A lemon or olive sprig that sways a couple of degrees, forever, from its
 * stem base. Decorative — hidden from the accessibility tree.
 */
export default function Sprig({
  name = 'lemon-sprig',
  className = '',
  width = 70,
  delay = 0,
  drift = 2.2,
  duration = 7,
}) {
  const reduced = useReducedMotion()
  const s = size(name)

  return (
    <motion.img
      src={art(name)}
      alt=""
      aria-hidden="true"
      className={`sprig ${className}`}
      width={s.width}
      height={s.height}
      style={{ width, height: 'auto', transformOrigin: '50% 100%' }}
      animate={reduced ? undefined : { rotate: [-drift, drift, -drift] }}
      transition={reduced ? undefined : { duration, delay, repeat: Infinity, ease: 'easeInOut' }}
    />
  )
}
