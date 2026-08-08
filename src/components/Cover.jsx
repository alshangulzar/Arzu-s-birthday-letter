import { motion } from 'framer-motion'
import Sprig from './Sprig'
import { art, size } from '../lib/assets'
import { useReducedMotion } from '../hooks'
import { HER_NAME } from '../config'
import { useLang } from '../i18n'

export default function Cover({ onEnter }) {
  const reduced = useReducedMotion()
  const { t } = useLang()
  const rise = (delay) =>
    reduced
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.25 } }
      : {
          initial: { opacity: 0, y: 26 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.6, delay, ease: [0.22, 0.8, 0.3, 1] },
        }

  return (
    <motion.section
      className="cover"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, y: -24 }}
      transition={{ duration: reduced ? 0.15 : 0.45 }}
    >
      <div className="cover__art">
        <Sprig className="cover__sprig cover__sprig--l" name="lemon-sprig" width={62} duration={9} />
        <Sprig className="cover__sprig cover__sprig--r" name="olive-sprig" width={58} duration={7.6} delay={0.8} />
        <motion.img
          className="cover__hero"
          src={art('envelope-open-lemon-back')}
          alt={t.coverHeroAlt}
          {...size('envelope-open-lemon-back')}
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 34, rotate: -3 }}
          animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, rotate: 0 }}
          transition={{ duration: reduced ? 0.25 : 0.8, ease: [0.22, 0.8, 0.3, 1] }}
        />
      </div>

      <motion.p className="cover__kicker" {...rise(0.25)}>
        {t.coverKicker}
      </motion.p>

      <motion.h1 className="cover__name display" {...rise(0.35)}>
        {HER_NAME}
      </motion.h1>

      <motion.p className="cover__line hand" {...rise(0.48)}>
        {t.coverLine}
      </motion.p>

      <motion.div {...rise(0.62)}>
        <motion.button
          type="button"
          className="btn cover__cta"
          onClick={onEnter}
          whileHover={reduced ? undefined : { y: -3, scale: 1.02 }}
          whileTap={reduced ? undefined : { y: 0, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 340, damping: 20 }}
        >
          {t.coverCta}
        </motion.button>
      </motion.div>
    </motion.section>
  )
}
