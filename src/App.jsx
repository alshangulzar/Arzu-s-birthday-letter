import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import Cover from './components/Cover'
import Rail from './components/Rail'
import LetterView from './components/LetterView'
import WritePage from './components/WritePage'
import LangSwitch from './components/LangSwitch'
import { art } from './lib/assets'
import { fetchLetters, localDrafts, isRemote } from './lib/letters'
import { loadRead, markRead } from './lib/storage'
import { useLocalNow } from './hooks'
import { useLang } from './i18n'

import './components/envelope.css'
import './components/cover.css'
import './components/letter.css'
import './components/write.css'

const COVER_KEY = 'letters-for-you:cover-seen'

function coverAlreadySeen() {
  try {
    return sessionStorage.getItem(COVER_KEY) === '1'
  } catch {
    return false
  }
}

/** Two screens and no library. Netlify already rewrites every path to index.html. */
function useRoute() {
  const [path, setPath] = useState(() => window.location.pathname)
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  const go = useCallback((to) => {
    window.history.pushState({}, '', to)
    setPath(to)
    window.scrollTo(0, 0)
  }, [])
  return [path, go]
}

export default function App() {
  const now = useLocalNow()
  const { t } = useLang()
  const [path, go] = useRoute()
  const [showCover, setShowCover] = useState(() => !coverAlreadySeen())
  const [readMap, setReadMap] = useState(loadRead)
  const [openLetter, setOpenLetter] = useState(null)
  const [letters, setLetters] = useState([])
  const [loadState, setLoadState] = useState('loading')

  // the pack's own grain plate, tiled under the whole sheet
  useEffect(() => {
    document.documentElement.style.setProperty('--grain', `url(${art('paper-grain')})`)
  }, [])

  const load = useCallback(() => {
    let alive = true
    setLoadState('loading')
    fetchLetters()
      .then((rows) => {
        if (!alive) return
        setLetters([...rows, ...localDrafts()])
        setLoadState('ready')
      })
      .catch((e) => {
        if (!alive) return
        console.error(e)
        setLoadState('error')
      })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => load(), [load])

  const envRefs = useRef(new Map())
  const refSetters = useRef(new Map())
  const registerRef = useCallback((id) => {
    if (!refSetters.current.has(id)) {
      refSetters.current.set(id, (el) => {
        if (el) envRefs.current.set(id, el)
        else envRefs.current.delete(id)
      })
    }
    return refSetters.current.get(id)
  }, [])

  const enterMailbox = useCallback(() => {
    try {
      sessionStorage.setItem(COVER_KEY, '1')
    } catch {
      /* private mode — she'll see the cover again next time, which is fine */
    }
    setShowCover(false)
  }, [])

  const handleOpen = useCallback((letter) => {
    setOpenLetter(letter)
    setReadMap(markRead(letter.id))
  }, [])

  const handleClose = useCallback(() => {
    const id = openLetter?.id
    setOpenLetter(null)
    requestAnimationFrame(() => envRefs.current.get(id)?.focus())
  }, [openLetter])

  const writing = path === '/write'

  return (
    <div className="paper">
      <div className="paper__sheet" inert={!!openLetter}>
        <LangSwitch />
        <AnimatePresence mode="wait">
          {writing ? (
            <WritePage key="write" onDone={() => { load(); go('/') }} />
          ) : showCover ? (
            <Cover key="cover" onEnter={enterMailbox} />
          ) : (
            <div key="mailbox" className="mailbox">
              <header className="mailbox__head">
                <h1 className="mailbox__title">{t.mailboxTitle}</h1>
                <p className="mailbox__sub">
                  {loadState === 'loading'
                    ? t.mailboxLoading
                    : loadState === 'error'
                      ? t.mailboxError
                      : t.mailboxReady}
                </p>
              </header>

              {loadState === 'ready' && (
                <Rail
                  letters={letters}
                  readMap={readMap}
                  now={now}
                  onOpen={handleOpen}
                  registerRef={registerRef}
                />
              )}

              <div className="mailbox__write">
                <button type="button" className="btn btn--quiet" onClick={() => go('/write')}>
                  {t.writeCta}
                </button>
              </div>

              {/* A note to the developer, not to her. She should never see a
                  sentence about Supabase keys on her birthday present, so it
                  only ever appears while running `npm run dev`. */}
              {!isRemote && import.meta.env.DEV && (
                <p className="mailbox__note">{t.localNote}</p>
              )}
            </div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {openLetter && <LetterView key={openLetter.id} letter={openLetter} onClose={handleClose} />}
      </AnimatePresence>
    </div>
  )
}
