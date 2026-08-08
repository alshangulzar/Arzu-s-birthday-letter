# letters for you

A private mailbox of envelopes, sealed until their date, plus a page where the
people who love her can post one. Vite + React + plain CSS, Framer Motion for
the movement, Supabase for storage. No Tailwind, no component library, no icon
packs — the identity is the illustration pack.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # -> dist/
```

Netlify: connect the repo, or `netlify deploy --prod --dir=dist`. `netlify.toml`
sets the build command, publish dir, Node version, and the SPA rewrite that
makes `/write` work on a hard refresh.

---

## Set up Supabase

Without keys the app runs on `src/data/letters.json` and says so under the rail.
That fallback is for development only — it has the messages client-side.

1. Run [`supabase/schema.sql`](supabase/schema.sql) in the SQL editor.
2. Add a `.env` (and the same two in Netlify's env settings):

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### Sealed letters are not readable early — how that's enforced

This was the one thing that had to be right, so it isn't done in JavaScript.

- The `letters` table has RLS on and **no select policy at all**. Nobody can
  read it directly, anon key or not.
- Reads go through the `letters_public` view, which returns `message` only when
  `unlock_date <= current_date` and `null` otherwise.
- `current_date` is the **database's** date. The client's clock is never
  consulted, so changing it does nothing. Worst case a letter opens late, which
  is the safe direction.

So a sealed letter's text is not in the response at all. The network tab shows
who it's from and when it opens, and `message: null`. Nothing to find.

**Verify it yourself** once your keys are in — in dev tools:

```js
const { data } = await supabase.from('letters_public').select('*')
console.table(data)   // sealed rows must show message: null
await supabase.from('letters').select('message')   // must error, not return rows
```

Faking the client date can't change either result, because neither asks the
client for the date. **I could not run this against a live database** — there
were no credentials in the repo — so please run those two lines once before you
send her the link.

What she's read stays in `localStorage` under `letters-for-you:read`, keyed by
letter id. None of her reading history goes to the server.

---

## The illustrations

All of `src/assets/` comes from `Design.pdf`, which embeds the pack as 60
transparent PNGs. [`tools/install_assets.py`](tools/install_assets.py) extracts
them, names them, and writes `manifest.json` with every intrinsic size so each
`<img>` reserves its own space before it loads. Re-run it any time the pack
changes:

```bash
python3 tools/install_assets.py
```

**Two things it derives rather than copies**, both from your own pixels:

- **Envelope layers.** The closed envelopes ship flat, but the opening
  animation needs the flap and the front panel as separate images. Every closed
  design is drawn on the same template — an X of fold lines meeting just past
  halfway down — so the script cuts `back` / `front` / `flap` along the lines
  that are already drawn. The seam lands exactly on the ink. The three open
  designs ship as pieces already, so those are composed instead.
- **The heart padlock.** The sealed state wants one and the pack hasn't got a
  lock, so it borrows the pack's cream heart and adds a shackle in the pack's
  ink `#294C68`. Nothing foreign gets drawn.

The grain plate is the pack's own, mirrored into a seamless 256px tile — a
straight crop tiled with visible seams.

## Palette

Read out of the PNGs, not eyeballed — a clustering pass over every opaque pixel
in the pack, centres taken from the clusters. In `src/index.css`:

lemon `#DBBD61` · deep lemon `#D3AF46` · sunshine `#E0CF93` · azure `#71A4C4` ·
mid blue `#5E93B6` · deep blue `#376388` · ink `#294C68` · pink `#E1A9BD` ·
deep pink `#E88FB4` · heart red `#DD4D60` · sage `#8D9F56` · olive `#697B41` ·
cream `#E2DBC5` · paper white `#E7E7E6`

The pack's own outline colour is 6.5:1 on cream, so it carries all the text —
the previous build needed a darkened value for small type and this one doesn't.

---

## The rail

The mailbox is a horizontal scroll-snap rail, one envelope centred.

- Scale, lean and dim are driven by a `--p` custom property that the scroll
  handler writes to every item on every frame — 1 at the centre, 0 a card away.
  It's continuous under the finger rather than a class flipping at a threshold.
- Drag with the mouse, swipe on touch, `←`/`→`/`Home`/`End` on a keyboard. Let
  go mid-drag and it settles onto the nearest envelope instead of stopping dead.
- Only the centred letter names itself; the rail stays quiet.
- Dots underneath: outline = sealed, lemon = ready, azure = read.
- On load it centres the **first unread ready letter**, not the first envelope.
  Done before paint, so a background tab doesn't leave it parked in the wrong
  place.

## Writing a letter

`/write` — one screen, no wizard. A live preview sits above the form with the
sender's name written on the envelope in Caveat and the unlock date stamped on
as a postmark, updating as they type. The envelope picker is the same rail
physics, smaller; the centred envelope is the choice. Stickers come from both
sets, grouped, one per letter. "seal it" folds the flap down, drops a wax heart
with a squash, and confirms.

Change her name, the cover line and the birthday shortcut in `src/config.js`.

---

## Motion

Everything is off under `prefers-reduced-motion: reduce` — the state changes all
survive, only the movement goes.

Envelopes drop in from above, 70ms apart · hover lifts the envelope and tilts
the flap up ~20° · opening runs in sequence over ~1s (seal breaks in two and
falls → flap turns back on `rotateX` → letter rises out of the pocket, turning
as it clears → grows into the page while the envelope sinks) · hearts burst up
from the bottom · postmarks stamp on with a scale-down and a rotation overshoot
· stickers land with a rotation settle · sealed letters refuse with a 400ms
shiver, a padlock jiggle and one pulse of the countdown · closing folds the
letter back down into the envelope.

## Notes

- The reading view is a real dialog: focus moves in, Tab is trapped, Escape
  closes, focus returns to the envelope she opened, and the rail behind is
  `inert`.
- Framer writes its own inline `transform`, which silently wipes a CSS
  `translate(-50%, -50%)`. Anything animated *and* centred is centred on a
  wrapper it doesn't touch (`.env__padlockWrap`, `.preview__waxWrap`).
- The pack's envelopes are about 191px wide as embedded in the PDF. They hold up
  at the sizes used here, but if you have the originals larger, drop them in —
  the filenames and the manifest are all that matter.
