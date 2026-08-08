import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { HER_NAME } from './config'
import { daysUntil, localMidnight, postmarkParts } from './lib/dates'

/**
 * Two languages, one toggle. Every user-facing string in the app comes from
 * here — nothing is written inline in a component — so adding a third language
 * later means adding one object below and one entry to LANGS.
 *
 * Dates are formatted here too rather than in lib/dates.js: month names and
 * word order are language, not arithmetic. lib/dates.js stays pure date maths.
 */

const STORE_KEY = 'letters-for-you:lang'

export const LANGS = [
  { id: 'en', label: 'EN', name: 'English' },
  { id: 'az', label: 'AZ', name: 'Azərbaycanca' },
]

const MONTHS_SHORT = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'],
  az: ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn', 'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek'],
}

const MONTHS_LONG = {
  en: ['January', 'February', 'March', 'April', 'May', 'June',
       'July', 'August', 'September', 'October', 'November', 'December'],
  az: ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
       'iyul', 'avqust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr'],
}

const STRINGS = {
  en: {
    htmlLang: 'en',
    switchLabel: 'Language',

    // ---- cover
    coverKicker: `To my precious ${HER_NAME}`,
    coverLine: 'The people who love you wrote you something',
    coverCta: 'Open your post',
    coverHeroAlt: 'An open envelope with a letter inside and lemons growing out of it',

    // ---- mailbox
    mailboxTitle: 'Your post',
    mailboxLoading: 'Looking in the letterbox…',
    mailboxError: "The letterbox won't open — try again in a minute",
    mailboxReady: 'Flick through — one at a time',
    writeCta: 'Write her one',
    localNote: 'Running on the local sample letters — add your Supabase keys to see the real post',

    // ---- rail
    railLabel: 'Your letters — use the left and right arrow keys',
    dotsLabel: 'Where you are in the stack',
    from: (name) => `From ${name}`,
    statusReady: 'Waiting for you',
    statusRead: 'Read · open it again',
    emptyTitle: 'Nothing in the post yet.',
    emptyLine: 'Give them time — good letters take a while to write.',
    emptyAlt: 'A sprig of lemons',
    dotLabel: (i, total, name, state) =>
      `Letter ${i} of ${total}, from ${name}, ${
        { sealed: 'sealed', ready: 'ready to open', read: 'already read' }[state]
      }`,
    envSealed: (name, status) => `Letter from ${name}. Sealed — ${status}.`,
    envReady: (name) => `Letter from ${name}. Ready to open.`,
    envRead: (name) => `Letter from ${name}. Already read — open it again.`,

    // ---- countdown
    readyToOpen: 'Ready to open',
    opensTomorrow: 'Opens tomorrow',
    opensOn: (day, days) => `Opens ${day} · ${days} days`,

    // ---- postmark
    stampTop: 'air mail',
    stampBottom: 'for you',
    stampTopWaiting: 'not yet',
    stampBottomWaiting: 'posted',

    // ---- reading a letter
    readerBack: '← Back to your post',
    noteKicker: 'A letter for you',
    noteFrom: (name) => `From ${name}`,
    readerFold: 'Fold it back up',
    stillSealed: 'This one is still sealed.',

    // ---- writing a letter
    writeTitle: 'Write her one',
    writeSub: 'It stays sealed until the day you choose',
    fieldFrom: "Who it's from",
    fieldFromPlaceholder: 'Nana, Deniz, everyone at the flat',
    fieldFromEmpty: "She'll want to know who this one's from.",
    fieldMessage: 'The letter',
    fieldMessagePlaceholder: "Tell her the thing you'd never say out loud…",
    fieldMessageEmpty: "The envelope's empty — write her something.",
    fieldMessageLong: "A touch long — trim it and it'll fit.",
    fieldWhen: 'It opens on',
    dateToday: 'Today',
    dateBirthday: 'Her birthday',
    dateMonth: 'In a month',
    datePick: 'Pick a date',
    fieldEnvelope: 'Pick your envelope',
    fieldSticker: 'Tuck in a sticker',
    optional: 'optional',
    previewTo: `To ${HER_NAME}`,
    previewFrom: 'From…',
    seal: 'Seal it',
    sealing: 'Sealing…',
    sealError: "It wouldn't go through. Have another try in a moment?",
    sealed: (day) => `Sealed. She'll get it on ${day}.`,
    writeAnother: 'Write another one',
    backToPost: 'Back to your post',
    // sticker names — read out by screen readers in the picker
    stickerNames: {
      sole: 'the sun', gelato: 'gelato', spritz: 'a spritz', caffe: 'a coffee',
      vino: 'a glass of wine', uva: 'grapes', pomodoro: 'a tomato', farfalle: 'farfalle',
      margherita: 'a daisy', fiocco: 'a pink bow', camera: 'a camera', vespa: 'a vespa',
      'big-ben': 'Big Ben', 'union-jack': 'a Union Jack', 'double-decker': 'a double-decker bus',
      'phone-box': 'a phone box', 'post-box': 'a post box', crown: 'a crown', corgi: 'a corgi',
      'black-cab': 'a black cab', brolly: 'an umbrella', cuppa: 'a cup of tea',
      bowler: 'a bowler hat', 'bow-tie': 'a bow tie', paw: 'a paw print',
    },
    setItaly: 'Italy',
    setEngland: 'England',
  },

  az: {
    htmlLang: 'az',
    switchLabel: 'Dil',

    coverKicker: 'Qiymətli Arzuma',
    coverLine: 'Səni sevən insanlar sənə nəsə yazdılar',
    coverCta: 'Poçtunu aç',
    coverHeroAlt: 'İçində məktub olan açıq zərf, üstündən limon budaqları çıxır',

    mailboxTitle: 'Poçtun',
    mailboxLoading: 'Poçt qutusuna baxıram…',
    mailboxError: 'Poçt qutusu açılmır — bir dəqiqədən sonra yenidən yoxla',
    mailboxReady: 'Bir-bir vərəqlə',
    writeCta: 'Ona məktub yaz',
    localNote: 'Nümunə məktublarla işləyir — əsl poçtu görmək üçün Supabase açarlarını əlavə et',

    railLabel: 'Məktubların — sağ və sol ox düymələri ilə keç',
    dotsLabel: 'Dəstədə haradasan',
    from: (name) => `Göndərən: ${name}`,
    statusReady: 'Səni gözləyir',
    statusRead: 'Oxundu · yenidən aç',
    emptyTitle: 'Hələ poçt yoxdur.',
    emptyLine: 'Onlara vaxt ver — yaxşı məktub tez yazılmır.',
    emptyAlt: 'Limon budağı',
    dotLabel: (i, total, name, state) =>
      `${total} məktubdan ${i}-ci, göndərən ${name}, ${
        { sealed: 'möhürlü', ready: 'açmağa hazır', read: 'oxunub' }[state]
      }`,
    envSealed: (name, status) => `${name} adlı şəxsdən məktub. Möhürlüdür — ${status}.`,
    envReady: (name) => `${name} adlı şəxsdən məktub. Açmağa hazırdır.`,
    envRead: (name) => `${name} adlı şəxsdən məktub. Oxunub — yenidən aç.`,

    readyToOpen: 'Açmağa hazırdır',
    opensTomorrow: 'Sabah açılır',
    opensOn: (day, days) => `${day} açılır · ${days} gün qalıb`,

    stampTop: 'hava poçtu',
    stampBottom: 'sənə',
    stampTopWaiting: 'hələ',
    stampBottomWaiting: 'göndərilməyib',

    readerBack: '← Poçta qayıt',
    noteKicker: 'Sənə bir məktub',
    noteFrom: (name) => `Göndərən: ${name}`,
    readerFold: 'Məktubu qatla',
    stillSealed: 'Bu məktub hələ möhürlüdür.',

    writeTitle: 'Ona məktub yaz',
    writeSub: 'Seçdiyin günə qədər möhürlü qalacaq',
    fieldFrom: 'Kimdən',
    fieldFromPlaceholder: 'Nənə, Deniz, evdəki hamı',
    fieldFromEmpty: 'Bunun kimdən olduğunu bilmək istəyəcək.',
    fieldMessage: 'Məktub',
    fieldMessagePlaceholder: 'Ona üzünə deyə bilmədiyin şeyi yaz…',
    fieldMessageEmpty: 'Zərf boşdur — ona nəsə yaz.',
    fieldMessageLong: 'Bir az uzundur — qısaltsan yerləşər.',
    fieldWhen: 'Açılma tarixi',
    dateToday: 'Bu gün',
    dateBirthday: 'Ad günü',
    dateMonth: 'Bir aydan sonra',
    datePick: 'Tarix seç',
    fieldEnvelope: 'Zərfini seç',
    fieldSticker: 'Stiker əlavə et',
    optional: 'istəyə bağlı',
    previewTo: `${HER_NAME}-ya`,
    previewFrom: 'Kimdən…',
    seal: 'Möhürlə',
    sealing: 'Möhürlənir…',
    sealError: 'Göndərilmədi. Bir azdan yenidən yoxla?',
    sealed: (day) => `Möhürləndi. ${day} tarixində alacaq.`,
    writeAnother: 'Daha bir məktub yaz',
    backToPost: 'Poçta qayıt',
    stickerNames: {
      sole: 'günəş', gelato: 'dondurma', spritz: 'kokteyl', caffe: 'qəhvə',
      vino: 'bir qədəh şərab', uva: 'üzüm', pomodoro: 'pomidor', farfalle: 'makaron',
      margherita: 'çiçək', fiocco: 'çəhrayı bant', camera: 'fotoaparat', vespa: 'motoroller',
      'big-ben': 'Big Ben', 'union-jack': 'Britaniya bayrağı', 'double-decker': 'ikimərtəbəli avtobus',
      'phone-box': 'telefon budkası', 'post-box': 'poçt qutusu', crown: 'tac', corgi: 'korgi iti',
      'black-cab': 'qara taksi', brolly: 'çətir', cuppa: 'bir fincan çay',
      bowler: 'kotelok şlyapa', 'bow-tie': 'kəpənək qalstuk', paw: 'pəncə izi',
    },
    setItaly: 'İtaliya',
    setEngland: 'İngiltərə',
  },
}

const LangContext = createContext(null)

function initialLang() {
  try {
    const saved = localStorage.getItem(STORE_KEY)
    if (saved && STRINGS[saved]) return saved
  } catch {
    /* private mode — fall through to the browser's preference */
  }
  // Only the primary subtag counts. "en-AZ" is English in Azerbaijan — a
  // substring match on the whole tag reads that region code as the language
  // and hands an English speaker the Azerbaijani UI.
  const tags = navigator.languages?.length ? navigator.languages : [navigator.language || 'en']
  const primary = tags.map((tag) => String(tag).toLowerCase().split('-')[0])
  return primary.includes('az') ? 'az' : 'en'
}

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(initialLang)

  const setLang = useCallback((next) => {
    setLangState(next)
    try {
      localStorage.setItem(STORE_KEY, next)
    } catch {
      /* it just won't be remembered next visit */
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = STRINGS[lang].htmlLang
  }, [lang])

  const value = useMemo(() => {
    const t = STRINGS[lang]

    /** "14 Sept" / "14 sen" */
    const formatDay = (dateStr) => {
      const d = localMidnight(dateStr)
      return `${d.getDate()} ${MONTHS_SHORT[lang][d.getMonth()]}`
    }

    /** "14 September" / "14 sentyabr" — spelled out, for the confirmation line */
    const formatLong = (dateStr) => {
      const d = localMidnight(dateStr)
      return `${d.getDate()} ${MONTHS_LONG[lang][d.getMonth()]}`
    }

    /** "Opens tomorrow" / "14 Sept açılır · 39 gün qalıb" */
    const opensLabel = (dateStr, now = new Date()) => {
      const days = daysUntil(dateStr, now)
      if (days <= 0) return t.readyToOpen
      if (days === 1) return t.opensTomorrow
      return t.opensOn(formatDay(dateStr), days)
    }

    /** the three lines inside a postmark ring */
    const postmark = (dateStr) => {
      const { day, monthIndex, year } = postmarkParts(dateStr)
      return { day, month: MONTHS_SHORT[lang][monthIndex].toUpperCase(), year }
    }

    return { lang, setLang, t, formatDay, formatLong, opensLabel, postmark }
  }, [lang, setLang])

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

export function useLang() {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang must be used inside <LangProvider>')
  return ctx
}
