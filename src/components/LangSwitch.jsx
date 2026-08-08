import { LANGS, useLang } from '../i18n'

/**
 * Two words in the corner of the sheet. It's a radio group, not a dropdown —
 * with only two languages a dropdown is one tap too many, and half the people
 * using this aren't confident with computers.
 */
export default function LangSwitch() {
  const { lang, setLang, t } = useLang()

  return (
    <div className="langswitch" role="radiogroup" aria-label={t.switchLabel}>
      {LANGS.map((l) => (
        <button
          key={l.id}
          type="button"
          role="radio"
          aria-checked={l.id === lang}
          aria-label={l.name}
          className={`langswitch__btn${l.id === lang ? ' is-on' : ''}`}
          onClick={() => setLang(l.id)}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}
