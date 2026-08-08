import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import HeartBurst from './HeartBurst'
import EnvelopeArt from './EnvelopeArt'
import Postmark from './Postmark'
import { art, size, envelopeArt } from '../lib/assets'
import { useReducedMotion, useScrollLock } from '../hooks'
import { useLang } from '../i18n'

/* The open, in order — not all at once, which is the difference between a
   letter being opened and a modal appearing.
     0.06s  the seal breaks, two halves fall away
     0.18s  the flap turns back on rotateX
     0.40s  the letter rises out of the pocket, turning as it clears
     0.64s  it grows into the page while the envelope sinks and fades          */
const OPEN_TOTAL = 1100
const CLOSE_TOTAL = 740
const ENVELOPE_EXIT = 660

function Paragraphs({ text }) {
  return text.split(/\n{2,}/).map((block, i) => (
    <p key={i}>
      {block.split('\n').map((line, j, all) => (
        <span key={j}>
          {line}
          {j < all.length - 1 && <br />}
        </span>
      ))}
    </p>
  ))
}

export default function LetterView({ letter, onClose }) {
  const reduced = useReducedMotion()
  const { t, formatDay } = useLang()
  const [phase, setPhase] = useState(reduced ? 'reading' : 'opening')
  const [showEnvelope, setShowEnvelope] = useState(!reduced)
  const closing = phase === 'closing'
  const panelRef = useRef(null)
  const firstFocusRef = useRef(null)
  const titleId = useId()
  const hasFlap = envelopeArt(letter.envelope).hasFlap

  useScrollLock(true)

  useEffect(() => {
    if (reduced) return
    const t1 = setTimeout(() => setShowEnvelope(false), ENVELOPE_EXIT)
    const t2 = setTimeout(() => setPhase('reading'), OPEN_TOTAL)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [reduced])

  const closeTimer = useRef(null)
  const handleClose = useCallback(() => {
    if (closing) return
    if (reduced) {
      onClose()
      return
    }
    setPhase('closing')
    setShowEnvelope(true)
    closeTimer.current = setTimeout(onClose, CLOSE_TOTAL)
  }, [closing, reduced, onClose])

  useEffect(() => () => clearTimeout(closeTimer.current), [])

  useEffect(() => {
    firstFocusRef.current?.focus()
    function onKeyDown(e) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        handleClose()
        return
      }
      if (e.key !== 'Tab') return
      const f = panelRef.current?.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])')
      if (!f?.length) return
      const first = f[0]
      const last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [handleClose])

  const tr = (spec) => (reduced ? { duration: 0 } : spec)

  // A sealed letter's text never left the database, so there is nothing to
  // show. This should be unreachable — you can't open a sealed envelope.
  const body = letter.message ?? t.stillSealed

  return (
    <motion.div
      className="reader"
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={tr({ duration: 0.22 })}
    >
      {!reduced && <HeartBurst seed={letter.id} />}

      <div className="reader__bar">
        <button type="button" className="reader__back" onClick={handleClose} ref={firstFocusRef}>
          {t.readerBack}
        </button>
      </div>

      <div className="reader__stack">
        <AnimatePresence>
          {showEnvelope && (
            <motion.div
              className="reader__env"
              key="env"
              initial={closing ? { opacity: 0, y: 36 } : { opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 36 }}
              transition={tr({ duration: closing ? 0.3 : 0.26, ease: 'easeOut' })}
            >
              <EnvelopeArt
                envelopeId={letter.envelope}
                flapRotation={closing ? 0 : 180}
                flapZ={closing ? 4 : 1}
                flapTransition={tr(
                  closing
                    ? { delay: 0.38, duration: 0.26, ease: 'easeInOut', zIndex: { delay: 0.3, duration: 0 } }
                    : { delay: 0.18, duration: 0.3, ease: 'easeInOut', zIndex: { delay: 0.5, duration: 0 } },
                )}
              >
                {/* the letter, rising out of the pocket */}
                <motion.span
                  className="reader__slip"
                  aria-hidden="true"
                  initial={closing ? { y: '-130%', rotate: -4 } : { y: '0%', rotate: 0 }}
                  animate={closing ? { y: '0%', rotate: 0 } : { y: '-130%', rotate: -4 }}
                  transition={tr(
                    closing
                      ? { delay: 0.16, duration: 0.3, ease: 'easeInOut' }
                      : { delay: 0.4, duration: 0.32, ease: [0.3, 0.9, 0.35, 1] },
                  )}
                >
                  <img src={art('letter-paper')} alt="" {...size('letter-paper')} />
                </motion.span>
              </EnvelopeArt>

              {/* the seal breaks in two and drops — it never just disappears */}
              {!closing && hasFlap && (
                <span className="reader__seal" aria-hidden="true">
                  <motion.span
                    className="reader__sealHalf reader__sealHalf--l"
                    initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
                    animate={{ x: '-58%', y: '82%', rotate: -42, opacity: 0 }}
                    transition={tr({ delay: 0.06, duration: 0.42, ease: 'easeIn' })}
                  >
                    <img src={art('heart-lemon')} alt="" {...size('heart-lemon')} />
                  </motion.span>
                  <motion.span
                    className="reader__sealHalf reader__sealHalf--r"
                    initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
                    animate={{ x: '58%', y: '90%', rotate: 38, opacity: 0 }}
                    transition={tr({ delay: 0.06, duration: 0.42, ease: 'easeIn' })}
                  >
                    <img src={art('heart-lemon')} alt="" {...size('heart-lemon')} />
                  </motion.span>
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* the note — grows out of the envelope, folds back down into it */}
        <motion.article
          className="note"
          initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.3, y: 12 }}
          animate={
            reduced
              ? { opacity: 1 }
              : closing
                ? { opacity: 0, scale: 0.3, y: 12 }
                : { opacity: 1, scale: 1, y: 0 }
          }
          transition={tr(
            closing
              ? { duration: 0.26, ease: 'easeIn' }
              : { delay: 0.64, duration: 0.42, ease: [0.22, 0.9, 0.3, 1] },
          )}
          style={{ pointerEvents: phase === 'reading' ? 'auto' : 'none' }}
        >
          <div className="note__head">
            <p className="note__kicker">{t.noteKicker}</p>
            <p className="note__date">{formatDay(letter.unlockDate)}</p>
          </div>

          <h2 className="note__from" id={titleId}>
            {t.noteFrom(letter.from)}
          </h2>

          <div className="note__body">
            <Paragraphs text={body} />
          </div>

          <p className="note__sign">— {letter.from}</p>

          {/* one sticker, tucked into the corner, landing with a small settle */}
          {letter.sticker && (
            <motion.img
              className="note__sticker"
              src={art(`sticker-${letter.sticker}`)}
              alt={t.stickerNames[letter.sticker] || ''}
              {...size(`sticker-${letter.sticker}`)}
              initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.5, rotate: -22 }}
              animate={
                reduced
                  ? { opacity: 1 }
                  : {
                      opacity: 1,
                      scale: [1.5, 0.94, 1],
                      rotate: [-22, -6, -11],
                      transition: { delay: 1.05, duration: 0.5, ease: [0.3, 1.3, 0.5, 1] },
                    }
              }
            />
          )}

          <Postmark date={letter.unlockDate} tilt={9} stamp={!reduced} className="note__postmark" />
        </motion.article>
      </div>

      <div className="reader__foot">
        <button type="button" className="btn reader__fold" onClick={handleClose}>
          {t.readerFold}
        </button>
      </div>
    </motion.div>
  )
}
