/**
 * Bundles the built app into ONE self-contained .html file.
 *
 * This exists so the app can be handed round as a link with no server: every
 * PNG becomes a data URI, the JS and CSS are inlined, and the three webfonts
 * are fetched once and embedded as base64. Nothing loads from another host,
 * which is what a strict CSP (an Artifact page, say) requires.
 *
 * It is a preview build. Supabase can't be reached from a page like that, so
 * it runs on src/data/letters.json. The real deploy is `netlify deploy`.
 *
 * Run:  npm run build && node tools/build_singlefile.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join, dirname, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const DIST = join(ROOT, 'dist')
const ASSETS = join(DIST, 'assets')

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' }

// ---------------------------------------------------------------- fonts
// Google's CSS endpoint hands back different formats per user agent; this UA
// gets woff2. We only need the latin ranges.
const FONT_CSS =
  'https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&family=Fraunces:ital,opsz,wght@1,9..144,700&family=Quicksand:wght@500;600;700&display=swap'

async function inlineFonts() {
  const res = await fetch(FONT_CSS, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
    },
  })
  const raw = await res.text()

  // Drop the non-latin subsets BEFORE fetching — cyrillic, greek and vietnamese
  // are most of the weight and none of the text. "Arzű" needs latin-ext.
  const blocks = raw.split(/(?=@font-face)/).filter((b) => {
    if (!b.includes('@font-face')) return false
    const range = (b.match(/unicode-range:\s*([^;]+)/) || [, ''])[1]
    return !range || /U\+0000|U\+0100|U\+0102|U\+0130/i.test(range)
  })

  let css = blocks.join('')
  const urls = [...new Set([...css.matchAll(/url\((https:\/\/[^)]+\.woff2)\)/g)].map((m) => m[1]))]
  let bytes = 0

  for (const url of urls) {
    const buf = Buffer.from(await (await fetch(url)).arrayBuffer())
    bytes += buf.length
    css = css.split(url).join(`data:font/woff2;base64,${buf.toString('base64')}`)
  }

  console.log(`  fonts: ${urls.length} latin files, ${(bytes / 1024).toFixed(0)} kB raw`)
  return css
}

// --------------------------------------------------------------- assets
function assetMap() {
  const map = new Map()
  let total = 0
  const files = readdirSync(ASSETS)
  for (const f of files) {
    const ext = extname(f)
    if (!MIME[ext]) continue
    // tools/webp_dist.py leaves a .png.webp beside each PNG; prefer it. The
    // extension inside a data URI is irrelevant, only the mime type matters.
    const webp = files.includes(`${f}.webp`)
    const buf = readFileSync(join(ASSETS, webp ? `${f}.webp` : f))
    total += buf.length
    map.set(`/assets/${f}`, `data:${webp ? 'image/webp' : MIME[ext]};base64,${buf.toString('base64')}`)
  }
  console.log(`  assets: ${map.size} files, ${(total / 1024 / 1024).toFixed(2)} MB raw`)
  return map
}

function inlineRefs(text, map) {
  for (const [path, data] of map) {
    text = text.split(path).join(data)
  }
  return text
}

// ----------------------------------------------------------------- build
const html = readFileSync(join(DIST, 'index.html'), 'utf8')
const jsFile = readdirSync(ASSETS).find((f) => f.endsWith('.js'))
const cssFile = readdirSync(ASSETS).find((f) => f.endsWith('.css'))

const media = assetMap()
const fontCss = await inlineFonts()
const css = inlineRefs(readFileSync(join(ASSETS, cssFile), 'utf8'), media)
const js = inlineRefs(readFileSync(join(ASSETS, jsFile), 'utf8'), media)

const title = (html.match(/<title>([^<]*)<\/title>/) || [, 'letters for you'])[1]

const out = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${title}</title>
<style>
${fontCss}
${css}
</style>
</head>
<body>
<div id="root"></div>
<script type="module">
${js}
</script>
</body>
</html>
`

const outPath = join(ROOT, 'dist', 'letters-for-you.html')
writeFileSync(outPath, out)
console.log(`  wrote ${outPath} — ${(Buffer.byteLength(out) / 1024 / 1024).toFixed(2)} MB`)
