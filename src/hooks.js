import { useEffect, useRef, useState } from 'react'
import { msUntilNextMidnight } from './lib/dates'

/**
 * Live prefers-reduced-motion. Framer Motion ships its own, but the app needs
 * the value in plain logic too (skipping the heart burst, collapsing the open
 * sequence), so there's one source of truth here.
 */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    if (!window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = (e) => setReduced(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return reduced
}

/**
 * Re-renders at the next local midnight (and every one after), so a letter that
 * says "opens tomorrow" quietly becomes openable while the tab is still sitting
 * there. Returns a Date that every unlock calculation is measured against.
 */
export function useLocalNow() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    let timer
    const schedule = () => {
      timer = setTimeout(() => {
        setNow(new Date())
        schedule()
      }, msUntilNextMidnight())
    }
    schedule()

    // Phones suspend timers. Coming back to the tab re-checks the clock.
    const onWake = () => {
      setNow(new Date())
      clearTimeout(timer)
      schedule()
    }
    document.addEventListener('visibilitychange', onWake)
    window.addEventListener('focus', onWake)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onWake)
      window.removeEventListener('focus', onWake)
    }
  }, [])

  return now
}

/** Locks page scroll while the reading view is up, without the layout jumping. */
export function useScrollLock(active) {
  useEffect(() => {
    if (!active) return
    const { overflow, paddingRight } = document.body.style
    const gap = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    if (gap > 0) document.body.style.paddingRight = `${gap}px`
    return () => {
      document.body.style.overflow = overflow
      document.body.style.paddingRight = paddingRight
    }
  }, [active])
}

/** Stable per-render random values (envelope tilt, heart drift) that never re-roll. */
export function useStableRandom(factory, deps = []) {
  const ref = useRef(null)
  if (ref.current === null) ref.current = factory()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {}, deps)
  return ref.current
}
