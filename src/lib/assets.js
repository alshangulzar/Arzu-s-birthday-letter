import manifest from '../assets/manifest.json'

// Every PNG in the pack, picked up by Vite at build time. Nothing is drawn in
// CSS or SVG anywhere in this app — the identity is the illustrations.
const files = import.meta.glob('../assets/*.png', { eager: true, import: 'default' })

/** src url for a pack file, by name (no extension). */
export function art(name) {
  return files[`../assets/${name}.png`]
}

/** { width, height } — goes onto every <img> so nothing reflows while loading. */
export function size(name) {
  const s = manifest[name]
  return s ? { width: s[0], height: s[1] } : { width: undefined, height: undefined }
}

export function aspect(name) {
  const s = manifest[name]
  return s ? s[0] / s[1] : 1.5
}

/**
 * The twelve envelopes, in the order Gulzar numbered them.
 *
 * Nine are closed designs and ship as three derived layers — back / front /
 * flap — cut along the fold lines already drawn in the art, so the flap can
 * turn on rotateX and the letter can slide up out of the pocket behind the
 * front panel. Three are open designs and have no flap to turn; their letter
 * still rises out of the pocket. See tools/install_assets.py.
 */
export const ENVELOPES = [
  { id: 'lemon', label: 'lemon', open: false },
  { id: 'azure', label: 'azure', open: false },
  { id: 'open-lemon', label: 'open lemon', open: true },
  { id: 'sunshine', label: 'sunshine', open: false },
  { id: 'deep-blue', label: 'deep blue', open: false },
  { id: 'open-sky', label: 'open sky', open: true },
  { id: 'fiore', label: 'fiore', open: false },
  { id: 'airmail', label: 'airmail', open: false },
  { id: 'pink', label: 'pink', open: false },
  { id: 'open-azure', label: 'open azure', open: true },
  { id: 'tied', label: 'tied', open: false },
  { id: 'gingham', label: 'gingham', open: false },
]

export const ENVELOPE_IDS = ENVELOPES.map((e) => e.id)
const BY_ID = Object.fromEntries(ENVELOPES.map((e) => [e.id, e]))

export function envelope(id) {
  return BY_ID[id] || BY_ID.lemon
}

export function envelopeArt(id) {
  const e = envelope(id)
  return {
    id: e.id,
    label: e.label,
    hasFlap: !e.open,
    back: art(`envelope-${e.id}-back`),
    front: art(`envelope-${e.id}-front`),
    flap: e.open ? null : art(`envelope-${e.id}-flap`),
    backSize: size(`envelope-${e.id}-back`),
    frontSize: size(`envelope-${e.id}-front`),
    flapSize: e.open ? null : size(`envelope-${e.id}-flap`),
    aspect: aspect(`envelope-${e.id}-back`),
  }
}

/* ------------------------------------------------------------- stickers --
   One per letter, tucked into a corner of the paper. Two sets, grouped —
   Italy sets the tone, England is along for the ride. */
export const STICKER_SETS = [
  {
    id: 'italy',
    labelKey: 'setItaly',
    stickers: [
      ['sole', 'the sun'], ['gelato', 'gelato'], ['spritz', 'a spritz'], ['caffe', 'un caffè'],
      ['vino', 'a glass of wine'], ['uva', 'grapes'], ['pomodoro', 'a tomato'], ['farfalle', 'farfalle'],
      ['margherita', 'a daisy'], ['fiocco', 'a pink bow'], ['camera', 'a camera'], ['vespa', 'a vespa'],
    ],
  },
  {
    id: 'england',
    labelKey: 'setEngland',
    stickers: [
      ['big-ben', 'Big Ben'], ['union-jack', 'a Union Jack'], ['double-decker', 'a double-decker bus'],
      ['phone-box', 'a phone box'], ['post-box', 'a post box'], ['crown', 'a crown'], ['corgi', 'a corgi'],
      ['black-cab', 'a black cab'], ['brolly', 'a brolly'], ['cuppa', 'a cuppa'], ['bowler', 'a bowler hat'],
      ['bow-tie', 'a bow tie'], ['paw', 'a paw print'],
    ],
  },
]

export const HEART_BURST = [
  'heart-lemon', 'heart-pink', 'heart-cream', 'heart-sunshine',
  'heart-azure-outline', 'heart-pink-outline',
]

export const BOB_HEARTS = ['heart-lemon', 'heart-pink', 'heart-cream']
