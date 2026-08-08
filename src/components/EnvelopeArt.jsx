import { motion } from 'framer-motion'
import { envelopeArt } from '../lib/assets'

/**
 * One envelope, drawn from the pack's layers.
 *
 *   back   the whole body            z0
 *   letter (optional, passed in)     z2   — slides up out of the pocket
 *   front  the pocket panel only     z3   — the letter passes behind this
 *   flap   the top triangle          z4   — turns on rotateX, then drops to z1
 *                                          so an open flap sits behind the letter
 *
 * The stage takes the envelope's own aspect ratio, so a closed design and an
 * already-open one both reserve exactly the space they need before the PNGs
 * have loaded.
 */
export default function EnvelopeArt({
  envelopeId,
  flapRotation = 0,
  flapTransition,
  flapZ,
  children,
  className = '',
  alt = '',
}) {
  const a = envelopeArt(envelopeId)

  return (
    <span className={`envart ${className}`} style={{ '--env-aspect': a.aspect }}>
      <img
        className="envart__layer envart__back"
        src={a.back}
        alt={alt}
        aria-hidden={alt ? undefined : 'true'}
        width={a.backSize.width}
        height={a.backSize.height}
        draggable="false"
      />

      {children}

      <img
        className="envart__layer envart__front"
        src={a.front}
        alt=""
        aria-hidden="true"
        width={a.frontSize.width}
        height={a.frontSize.height}
        draggable="false"
      />

      {a.hasFlap && (
        <motion.img
          className="envart__layer envart__flap"
          src={a.flap}
          alt=""
          aria-hidden="true"
          width={a.flapSize.width}
          height={a.flapSize.height}
          draggable="false"
          animate={{ rotateX: flapRotation, ...(flapZ !== undefined ? { zIndex: flapZ } : {}) }}
          transition={flapTransition}
        />
      )}
    </span>
  )
}
