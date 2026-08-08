import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Envelope from './Envelope'
import Sprig from './Sprig'
import { art, size } from '../lib/assets'
import { useReducedMotion } from '../hooks'
import { useLang } from '../i18n'
import { isUnlocked } from '../lib/dates'

/** Stable, id-derived tilt, so an envelope looks handled rather than printed
 *  and never jumps between renders. */
function tiltFor(id) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return Number(((Math.abs(h) % 900) / 100 - 4.5).toFixed(2))
}

export default function Rail({ letters, readMap, now, onOpen, registerRef }) {
  const reduced = useReducedMotion()
  const { t, opensLabel } = useLang()
  const scrollerRef = useRef(null)

  const statusFor = (state, letter) =>
    state === 'sealed' ? opensLabel(letter.unlockDate, now) : state === 'read' ? t.statusRead : t.statusReady
  const itemRefs = useRef([])
  const [active, setActive] = useState(0)
  const [pulse, setPulse] = useState(0)
  const didAutoCentre = useRef(false)

  const items = useMemo(
    () =>
      [...letters]
        .sort(
          (a, b) =>
            a.unlockDate.localeCompare(b.unlockDate) ||
            // an explicit order wins among letters that open on the same day
            (a.order ?? Infinity) - (b.order ?? Infinity) ||
            // then whoever wrote theirs first
            String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? '')) ||
            String(a.id).localeCompare(String(b.id)),
        )
        .map((letter) => {
          const unlocked = letter.unlocked ?? isUnlocked(letter.unlockDate, now)
          const state = !unlocked ? 'sealed' : readMap[letter.id] ? 'read' : 'ready'
          return { letter, state }
        }),
    [letters, readMap, now],
  )

  /* ---- scroll-driven emphasis ------------------------------------------
     Every frame the rail moves, each item gets a --p of 1 at the centre
     falling to 0 at a card's distance away. Scale, tilt and dim all read from
     that in CSS, so the whole thing is continuous under the finger instead of
     snapping between two classes. */
  const measure = useCallback(() => {
    const el = scrollerRef.current
    if (!el) return
    const mid = el.scrollLeft + el.clientWidth / 2
    let best = 0
    let bestDist = Infinity
    itemRefs.current.forEach((node, i) => {
      if (!node) return
      const centre = node.offsetLeft + node.offsetWidth / 2
      const dist = Math.abs(centre - mid)
      const p = Math.max(0, 1 - dist / (node.offsetWidth * 1.05))
      node.style.setProperty('--p', p.toFixed(3))
      node.style.setProperty('--side', centre < mid ? '-1' : '1')
      // they overlap now, so the nearest to centre has to sit on top
      node.style.zIndex = String(Math.round(p * 100))
      if (dist < bestDist) {
        bestDist = dist
        best = i
      }
    })
    setActive((prev) => (prev === best ? prev : best))
  }, [])

  useLayoutEffect(() => {
    measure()
  }, [measure, items.length])

  useEffect(() => {
    const el = scrollerRef.current
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

  const scrollTo = useCallback(
    (i, behavior) => {
      const el = scrollerRef.current
      const node = itemRefs.current[i]
      if (!el || !node) return
      el.scrollTo({
        left: node.offsetLeft + node.offsetWidth / 2 - el.clientWidth / 2,
        behavior: behavior || (reduced ? 'auto' : 'smooth'),
      })
    },
    [reduced],
  )

  /* ---- open on the first unread ready letter, not on the beginning -----
     Done synchronously before paint. It used to wait on a rAF, which never
     fires if the page is loaded into a background tab — and then she'd come
     back to the rail parked on the wrong letter. */
  useLayoutEffect(() => {
    if (didAutoCentre.current || !items.length) return
    const el = scrollerRef.current
    if (!el || !el.clientWidth) return
    didAutoCentre.current = true
    const first = items.findIndex((it) => it.state === 'ready')
    scrollTo(first === -1 ? 0 : first, 'auto')
    measure()
  }, [items, scrollTo, measure])

  /* ---- drag to flick through, the way you'd push post across a table --- */
  const drag = useRef({ down: false, startX: 0, startScroll: 0, moved: 0 })
  const onPointerDown = (e) => {
    if (e.pointerType === 'touch') return // native touch scrolling is better
    const el = scrollerRef.current
    drag.current = { down: true, startX: e.clientX, startScroll: el.scrollLeft, moved: 0 }
    el.classList.add('is-grabbing')
  }
  const onPointerMove = (e) => {
    if (!drag.current.down) return
    const el = scrollerRef.current
    const dx = e.clientX - drag.current.startX
    drag.current.moved = Math.max(drag.current.moved, Math.abs(dx))
    el.scrollLeft = drag.current.startScroll - dx
  }
  const endDrag = () => {
    if (!drag.current.down) return
    drag.current.down = false
    scrollerRef.current?.classList.remove('is-grabbing')
    // let go and it settles onto the nearest envelope rather than stopping dead
    if (drag.current.moved > 6) {
      const el = scrollerRef.current
      const mid = el.scrollLeft + el.clientWidth / 2
      let best = 0
      let bestDist = Infinity
      itemRefs.current.forEach((n, i) => {
        if (!n) return
        const d = Math.abs(n.offsetLeft + n.offsetWidth / 2 - mid)
        if (d < bestDist) {
          bestDist = d
          best = i
        }
      })
      scrollTo(best)
    }
  }
  const swallowClick = (e) => {
    if (drag.current.moved > 6) {
      e.preventDefault()
      e.stopPropagation()
      drag.current.moved = 0
    }
  }

  /* ---- keyboard: the rail is one control, arrows move through it ------- */
  const onKeyDown = (e) => {
    let next = null
    if (e.key === 'ArrowRight') next = Math.min(active + 1, items.length - 1)
    else if (e.key === 'ArrowLeft') next = Math.max(active - 1, 0)
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = items.length - 1
    if (next === null) return
    e.preventDefault()
    scrollTo(next)
    itemRefs.current[next]?.querySelector('button')?.focus({ preventScroll: true })
  }

  if (!items.length) {
    return (
      <div className="empty">
        <img src={art('lemon-sprig')} alt={t.emptyAlt} {...size('lemon-sprig')} />
        <p>{t.emptyTitle}</p>
        <p>{t.emptyLine}</p>
      </div>
    )
  }

  const current = items[active]

  return (
    <div className="rail">
      <div
        className="rail__scroller"
        ref={scrollerRef}
        role="group"
        aria-label={t.railLabel}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onClickCapture={swallowClick}
      >
        {items.map(({ letter, state }, i) => (
          <div
            className="rail__item"
            key={letter.id}
            ref={(n) => {
              itemRefs.current[i] = n
            }}
            style={{ '--tilt': tiltFor(String(letter.id)) }}
          >
            <Envelope
              ref={registerRef(letter.id)}
              letter={letter}
              state={state}
              statusText={statusFor(state, letter)}
              tilt={tiltFor(String(letter.id))}
              active={i === active}
              onOpen={onOpen}
              onRefuse={() => setPulse((n) => n + 1)}
            />
          </div>
        ))}
      </div>

      {/* the rail stays quiet — only the centred letter says who it's from */}
      <div className="rail__caption" aria-live="polite">
        <p className="rail__from">{t.from(current.letter.from)}</p>
        <p key={pulse} className={`rail__status${pulse ? ' is-pulsing' : ''}`}>
          {statusFor(current.state, current.letter)}
        </p>
      </div>

      <ol className="rail__dots" aria-label={t.dotsLabel}>
        {items.map(({ letter, state }, i) => (
          <li key={letter.id}>
            <button
              type="button"
              className={`dot dot--${state}${i === active ? ' is-active' : ''}`}
              aria-label={t.dotLabel(i + 1, items.length, letter.from, state)}
              aria-current={i === active ? 'true' : undefined}
              onClick={() => scrollTo(i)}
            />
          </li>
        ))}
      </ol>

      <div className="rail__garden" aria-hidden="true">
        <Sprig name="lemon-sprig" width={40} duration={8} />
        <Sprig name="olive-sprig" width={52} delay={1.2} duration={9.5} drift={1.6} />
        <Sprig name="lemon-sprig" width={34} delay={0.6} duration={7.4} />
      </div>
    </div>
  )
}
