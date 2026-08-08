import { forwardRef, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import EnvelopeArt from './EnvelopeArt'
import Postmark from './Postmark'
import { art, size, BOB_HEARTS } from '../lib/assets'
import { useReducedMotion } from '../hooks'
import { useLang } from '../i18n'

/**
 * One envelope in the rail. The three states are unchanged from before —
 * they work:
 *
 *   sealed — desaturated and translucent, heart padlock over the seal, and the
 *            postmark reads "not yet posted". Tapping refuses: 400ms shiver,
 *            padlock jiggle, and the countdown pulses once.
 *   ready  — full colour, three hearts bobbing above, gentle idle float.
 *   read   — flap sits open, a sprig tucked in the corner. Re-openable.
 */
const Envelope = forwardRef(function Envelope(
  { letter, state, statusText, onOpen, onRefuse, tilt, active },
  ref,
) {
  const reduced = useReducedMotion()
  const { t } = useLang()
  const [refusing, setRefusing] = useState(false)
  const timer = useRef(null)

  const sealed = state === 'sealed'
  const read = state === 'read'

  useEffect(() => () => clearTimeout(timer.current), [])

  function handleClick() {
    if (sealed) {
      clearTimeout(timer.current)
      setRefusing(true)
      onRefuse?.()
      timer.current = setTimeout(() => setRefusing(false), 420)
      return
    }
    onOpen(letter)
  }

  // hover/press lifts the flap about 20° as a peek — but only on one she can
  // actually open, and never on an already-open design that has no flap
  const [peeking, setPeeking] = useState(false)
  const flapRest = read ? 180 : 0
  const flapRotation = peeking && !sealed && !read && !reduced ? -22 : flapRest

  const ariaLabel = sealed
    ? t.envSealed(letter.from, statusText)
    : read
      ? t.envRead(letter.from)
      : t.envReady(letter.from)

  return (
    <motion.button
      ref={ref}
      type="button"
      className={`env env--${state}${refusing ? ' is-refusing' : ''}`}
      onClick={handleClick}
      aria-label={ariaLabel}
      tabIndex={active ? 0 : -1}
      initial="rest"
      animate={refusing ? 'shiver' : 'rest'}
      whileHover={reduced ? undefined : 'peek'}
      whileFocus={reduced ? undefined : 'peek'}
      whileTap={reduced ? undefined : 'press'}
      onHoverStart={() => setPeeking(true)}
      onHoverEnd={() => setPeeking(false)}
      onFocus={() => setPeeking(true)}
      onBlur={() => setPeeking(false)}
      variants={{
        rest: { x: 0, y: 0 },
        peek: { x: 0, y: -10, transition: { type: 'spring', stiffness: 320, damping: 22 } },
        press: { x: 0, y: -3 },
        shiver: reduced
          ? { x: 0 }
          : { x: [0, -7, 7, -5, 5, -3, 3, 0], transition: { duration: 0.4, ease: 'easeInOut' } },
      }}
    >
      <EnvelopeArt
        envelopeId={letter.envelope}
        flapRotation={flapRotation}
        flapTransition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 24 }}
        className="env__art"
      >
        {read && (
          <img
            className="env__marker"
            src={art('olive-sprig')}
            alt=""
            aria-hidden="true"
            {...size('olive-sprig')}
          />
        )}
      </EnvelopeArt>

      <Postmark date={letter.unlockDate} posted={!sealed} tilt={sealed ? -9 : -6} className="env__postmark" />

      {/* whoever wrote it picked this — it belongs on the envelope in the rail
          too, not only on the letter once it's open */}
      {letter.sticker && (
        <img
          className="env__sticker"
          src={art(`sticker-${letter.sticker}`)}
          alt=""
          aria-hidden="true"
          {...size(`sticker-${letter.sticker}`)}
        />
      )}

      {sealed && (
        <span className="env__padlockWrap">
        <motion.img
          className="env__padlock"
          src={art('padlock-heart')}
          alt=""
          aria-hidden="true"
          {...size('padlock-heart')}
          animate={refusing && !reduced ? { rotate: [0, -14, 12, -9, 7, 0], y: [0, -2, 1, 0] } : { rotate: 0, y: 0 }}
          transition={{ duration: 0.42, ease: 'easeInOut' }}
        />
        </span>
      )}

      {state === 'ready' && (
        <span className="env__hearts" aria-hidden="true">
          {BOB_HEARTS.map((name, i) => (
            <motion.img
              key={name}
              src={art(name)}
              alt=""
              {...size(name)}
              animate={reduced ? undefined : { y: [0, -9, 0], rotate: [-5, 5, -5] }}
              transition={
                reduced ? undefined : { duration: 2.1 + i * 0.35, repeat: Infinity, ease: 'easeInOut', delay: i * 0.28 }
              }
            />
          ))}
        </span>
      )}
    </motion.button>
  )
})

export default Envelope
