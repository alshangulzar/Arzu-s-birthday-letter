import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { art, size, HEART_BURST } from '../lib/assets'
import { useReducedMotion } from '../hooks'

const COUNT = 22

function makeHearts(seed) {
  return Array.from({ length: COUNT }, (_, i) => {
    const name = HEART_BURST[Math.floor(Math.random() * HEART_BURST.length)]
    return {
      key: `${seed}-${i}`,
      name,
      size: 16 + Math.random() * 34,
      left: 4 + Math.random() * 92,
      drift: (Math.random() - 0.5) * 140,
      rotate: (Math.random() - 0.5) * 220,
      delay: Math.random() * 0.4,
      duration: 1.7 + Math.random() * 1.3,
    }
  })
}

/** Hearts thrown up from the bottom of the screen — mixed sizes, mixed colours
 *  from the pack, random drift. Decorative, and absent under reduced motion. */
export default function HeartBurst({ seed }) {
  const reduced = useReducedMotion()
  const hearts = useMemo(() => makeHearts(seed), [seed])

  if (reduced) return null

  return (
    <div className="burst" aria-hidden="true">
      {hearts.map((h) => (
        <motion.img
          key={h.key}
          src={art(h.name)}
          alt=""
          {...size(h.name)}
          className="burst__heart"
          style={{ left: `${h.left}%`, width: h.size, height: 'auto' }}
          initial={{ y: '12vh', opacity: 0, rotate: 0, scale: 0.6 }}
          animate={{
            y: ['12vh', '-95vh'],
            x: [0, h.drift * 0.4, h.drift],
            rotate: [0, h.rotate],
            scale: [0.6, 1, 0.92],
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: h.duration,
            delay: h.delay,
            ease: [0.2, 0.7, 0.4, 1],
            opacity: { duration: h.duration, delay: h.delay, times: [0, 0.12, 0.7, 1] },
          }}
        />
      ))}
    </div>
  )
}
