import { useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import EnvelopeArt from './EnvelopeArt'
import EnvelopePicker from './EnvelopePicker'
import Postmark from './Postmark'
import HeartBurst from './HeartBurst'
import { art, size, STICKER_SETS } from '../lib/assets'
import { useReducedMotion } from '../hooks'
import { useLang } from '../i18n'
import { inAMonth, todayInput } from '../lib/dates'
import { nextBirthday } from '../config'
import { postLetter } from '../lib/letters'

const MAX = 1500
const COUNTER_FROM = 1200

export default function WritePage({ onDone }) {
  const reduced = useReducedMotion()
  const { t, formatLong } = useLang()
  const [from, setFrom] = useState('')
  const [message, setMessage] = useState('')
  const [date, setDate] = useState(() => todayInput())
  const [envelope, setEnvelope] = useState('lemon')
  const [sticker, setSticker] = useState(null)
  const [touched, setTouched] = useState({})
  const [phase, setPhase] = useState('writing') // writing → sealing → sealed
  const [error, setError] = useState(null)
  const ids = useId()
  const messageRef = useRef(null)

  const emptyMessage = !message.trim()
  const emptyFrom = !from.trim()
  const overLong = message.length > MAX

  const showCount = message.length >= COUNTER_FROM
  const sealing = phase === 'sealing'
  const sealed = phase === 'sealed'

  async function handleSubmit(e) {
    e.preventDefault()
    setTouched({ from: true, message: true })
    if (emptyMessage || emptyFrom || overLong) {
      if (emptyMessage) messageRef.current?.focus()
      return
    }
    setError(null)
    setPhase('sealing')
    try {
      await postLetter({ from: from.trim(), message: message.trim(), unlockDate: date, envelope, sticker })
      setTimeout(() => setPhase('sealed'), reduced ? 0 : 820)
    } catch (err) {
      console.error(err)
      setError(t.sealError)
      setPhase('writing')
    }
  }

  function writeAnother() {
    setFrom('')
    setMessage('')
    setDate(todayInput())
    setSticker(null)
    setTouched({})
    setPhase('writing')
  }

  const dateShortcuts = [
    [t.dateToday, todayInput()],
    [t.dateBirthday, nextBirthday()],
    [t.dateMonth, inAMonth()],
  ]

  return (
    <motion.section
      className="write"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduced ? 0.15 : 0.35 }}
    >
      <header className="write__head">
        <h1 className="write__title">{t.writeTitle}</h1>
        <p className="write__sub">{t.writeSub}</p>
      </header>

      {/* ---- live preview: updates as they type, the whole time ---- */}
      <div className="preview">
        <motion.div
          className="preview__env"
          animate={sealing && !reduced ? { rotate: [0, -1.5, 0], scale: [1, 1.03, 1] } : {}}
          transition={{ duration: 0.5 }}
        >
          <EnvelopeArt
            envelopeId={envelope}
            flapRotation={sealing || sealed ? 0 : -18}
            flapTransition={reduced ? { duration: 0 } : { duration: 0.34, ease: [0.4, 0, 0.2, 1] }}
          >
            <span className="preview__addressee" aria-hidden="true">
              <span className="preview__to">{t.previewTo}</span>
              <span className="preview__from">{from.trim() || t.previewFrom}</span>
            </span>
          </EnvelopeArt>

          <Postmark date={date} tilt={-7} stamp className="preview__postmark" key={date} />

          {sticker && (
            <img
              className="preview__sticker"
              src={art(`sticker-${sticker}`)}
              alt=""
              aria-hidden="true"
              {...size(`sticker-${sticker}`)}
            />
          )}

          {/* the wax heart drops and presses on when it's sealed */}
          <AnimatePresence>
            {(sealing || sealed) && (
              <span className="preview__waxWrap">
              <motion.img
                className="preview__wax"
                src={art('heart-lemon')}
                alt=""
                aria-hidden="true"
                {...size('heart-lemon')}
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: -70, scale: 1.5 }}
                animate={
                  reduced
                    ? { opacity: 1 }
                    : { opacity: 1, y: 0, scale: [1.5, 0.82, 1.06, 1], transition: { duration: 0.5, delay: 0.24, times: [0, 0.6, 0.8, 1] } }
                }
              />
              </span>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {sealed ? (
        <div className="write__done">
          {!reduced && <HeartBurst seed={`sealed-${from}`} />}
          <p className="write__confirm hand">
            {t.sealed(formatLong(date))}
          </p>
          <div className="write__doneActions">
            <button type="button" className="btn" onClick={writeAnother}>
              {t.writeAnother}
            </button>
            <button type="button" className="btn btn--quiet" onClick={onDone}>
              {t.backToPost}
            </button>
          </div>
        </div>
      ) : (
        <form className="write__form" onSubmit={handleSubmit} noValidate>
          {/* ---- who it's from ---- */}
          <div className="field">
            <label className="field__label" htmlFor={`${ids}-from`}>
              {t.fieldFrom}
            </label>
            <input
              id={`${ids}-from`}
              className="field__input"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, from: true }))}
              placeholder={t.fieldFromPlaceholder}
              maxLength={80}
              autoComplete="name"
            />
            {touched.from && emptyFrom && (
              <p className="field__hint">{t.fieldFromEmpty}</p>
            )}
          </div>

          {/* ---- the letter ---- */}
          <div className="field">
            <label className="field__label" htmlFor={`${ids}-msg`}>
              {t.fieldMessage}
            </label>
            <textarea
              id={`${ids}-msg`}
              ref={messageRef}
              className="field__textarea hand"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, message: true }))}
              rows={9}
              placeholder={t.fieldMessagePlaceholder}
            />
            <div className="field__row">
              <p className="field__hint" role={touched.message && emptyMessage ? 'status' : undefined}>
                {touched.message && emptyMessage
                  ? t.fieldMessageEmpty
                  : overLong
                    ? t.fieldMessageLong
                    : ''}
              </p>
              {showCount && (
                <p className={`field__count${overLong ? ' is-over' : ''}`}>
                  {message.length} / {MAX}
                </p>
              )}
            </div>
          </div>

          {/* ---- when it opens ---- */}
          <div className="field">
            <span className="field__label" id={`${ids}-when`}>
              {t.fieldWhen}
            </span>
            <div className="shortcuts" role="group" aria-labelledby={`${ids}-when`}>
              {dateShortcuts.map(([label, value]) => (
                <button
                  key={label}
                  type="button"
                  className={`chip${date === value ? ' is-on' : ''}`}
                  onClick={() => setDate(value)}
                >
                  {label}
                </button>
              ))}
              <label className={`chip chip--date${!dateShortcuts.some(([, v]) => v === date) ? ' is-on' : ''}`}>
                {t.datePick}
                <input
                  type="date"
                  value={date}
                  /* no min — a date in the past just means the letter is
                     already open, which is often exactly what's wanted */
                  onChange={(e) => e.target.value && setDate(e.target.value)}
                  /* clicking the chip focuses the field but doesn't open the
                     calendar in Chrome; showPicker() is what actually does */
                  onClick={(e) => e.currentTarget.showPicker?.()}
                />
              </label>
            </div>
          </div>

          {/* ---- the envelope ---- */}
          <div className="field">
            <span className="field__label">{t.fieldEnvelope}</span>
            <EnvelopePicker value={envelope} onChange={setEnvelope} />
          </div>

          {/* ---- a sticker ---- */}
          <div className="field">
            <span className="field__label">
              {t.fieldSticker} <span className="field__opt">{t.optional}</span>
            </span>
            {STICKER_SETS.map((set) => (
              <fieldset className="stickers" key={set.id}>
                <legend className="stickers__legend">{t[set.labelKey]}</legend>
                <ul className="stickers__grid">
                  {set.stickers.map(([id]) => (
                    <li key={id}>
                      <button
                        type="button"
                        className={`sticker${sticker === id ? ' is-on' : ''}`}
                        aria-pressed={sticker === id}
                        aria-label={t.stickerNames[id]}
                        onClick={() => setSticker(sticker === id ? null : id)}
                      >
                        <img src={art(`sticker-${id}`)} alt="" aria-hidden="true" {...size(`sticker-${id}`)} />
                      </button>
                    </li>
                  ))}
                </ul>
              </fieldset>
            ))}
          </div>

          {error && <p className="field__hint field__hint--error">{error}</p>}

          <div className="write__actions">
            <button type="submit" className="btn write__seal" disabled={sealing}>
              {sealing ? t.sealing : t.seal}
            </button>
            <button type="button" className="btn btn--quiet" onClick={onDone}>
              {t.backToPost}
            </button>
          </div>
        </form>
      )}
    </motion.section>
  )
}
