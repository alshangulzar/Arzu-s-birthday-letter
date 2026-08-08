import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import EnvelopeArt from './EnvelopeArt'
import { ENVELOPES } from '../lib/assets'
import { useReducedMotion } from '../hooks'

/**
 * Pick an envelope by flicking through them — one centred and full size,
 * its neighbours peeking in smaller and faded. Same physics as the mailbox
 * rail, scaled down. No dropdown, no radio buttons, no grid of thumbnails.
 */
export default function EnvelopePicker({ value, onChange }) {
  const reduced = useReducedMotion()
  const scroller = useRef(null)
  const items = useRef([])
  const [centre, setCentre] = useState(() => Math.max(0, ENVELOPES.findIndex((e) => e.id === value)))
  const settled = useRef(false)

  const measure = useCallback(() => {
    const el = scroller.current
    if (!el) return
    const mid = el.scrollLeft + el.clientWidth / 2
    let best = 0
    let bestDist = Infinity
    items.current.forEach((node, i) => {
      if (!node) return
      const c = node.offsetLeft + node.offsetWidth / 2
      const dist = Math.abs(c - mid)
      node.style.setProperty('--p', Math.max(0, 1 - dist / (node.offsetWidth * 1.1)).toFixed(3))
      if (dist < bestDist) {
        bestDist = dist
        best = i
      }
    })
    setCentre(best)
  }, [])

  useLayoutEffect(() => {
    const i = ENVELOPES.findIndex((e) => e.id === value)
    const node = items.current[i < 0 ? 0 : i]
    const el = scroller.current
    if (node && el && !settled.current) {
      settled.current = true
      el.scrollLeft = node.offsetLeft + node.offsetWidth / 2 - el.clientWidth / 2
    }
    measure()
  }, [measure, value])

  useEffect(() => {
    const el = scroller.current
    if (!el) return
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        measure()
      })
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      el.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [measure])

  // the centred one becomes the choice, so a flick is a selection
  useEffect(() => {
    const id = ENVELOPES[centre]?.id
    if (id && id !== value) onChange(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centre])

  const scrollTo = (i) => {
    const el = scroller.current
    const node = items.current[i]
    if (!el || !node) return
    el.scrollTo({
      left: node.offsetLeft + node.offsetWidth / 2 - el.clientWidth / 2,
      behavior: reduced ? 'auto' : 'smooth',
    })
  }

  const drag = useRef({ down: false, x: 0, left: 0, moved: 0 })
  const down = (e) => {
    if (e.pointerType === 'touch') return
    drag.current = { down: true, x: e.clientX, left: scroller.current.scrollLeft, moved: 0 }
    scroller.current.classList.add('is-grabbing')
  }
  const move = (e) => {
    if (!drag.current.down) return
    const dx = e.clientX - drag.current.x
    drag.current.moved = Math.max(drag.current.moved, Math.abs(dx))
    scroller.current.scrollLeft = drag.current.left - dx
  }
  const up = () => {
    if (!drag.current.down) return
    drag.current.down = false
    scroller.current?.classList.remove('is-grabbing')
    if (drag.current.moved > 6) scrollTo(centre)
  }

  const onKeyDown = (e) => {
    let next = null
    if (e.key === 'ArrowRight') next = Math.min(centre + 1, ENVELOPES.length - 1)
    else if (e.key === 'ArrowLeft') next = Math.max(centre - 1, 0)
    if (next === null) return
    e.preventDefault()
    scrollTo(next)
    items.current[next]?.querySelector('button')?.focus({ preventScroll: true })
  }

  return (
    <div className="picker">
      <div
        className="picker__scroller"
        ref={scroller}
        role="radiogroup"
        aria-label="pick your envelope"
        onKeyDown={onKeyDown}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerLeave={up}
      >
        {ENVELOPES.map((e, i) => {
          const chosen = e.id === value
          return (
            <div
              className="picker__item"
              key={e.id}
              ref={(n) => {
                items.current[i] = n
              }}
            >
              <motion.button
                type="button"
                role="radio"
                aria-checked={chosen}
                aria-label={e.label}
                tabIndex={i === centre ? 0 : -1}
                className={`picker__btn${chosen ? ' is-chosen' : ''}`}
                onClick={() => {
                  if (drag.current.moved > 6) return
                  onChange(e.id)
                  scrollTo(i)
                }}
                animate={chosen && !reduced ? { y: -10 } : { y: 0 }}
                transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 14 }}
              >
                <EnvelopeArt envelopeId={e.id} />
              </motion.button>
              <span className="picker__label">{e.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
