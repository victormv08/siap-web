import { makeStyles, tokens } from '@fluentui/react-components'

const MARINO = '#0f2240'
const DORADO = '#c8a84d'

const estilos = makeStyles({
  svg: { width: '100%', height: 'auto', maxWidth: '460px', display: 'block' },
  // Flotar suave. Se apaga con prefers-reduced-motion: reduce.
  flota: {
    animationDuration: '5s',
    animationTimingFunction: 'ease-in-out',
    animationIterationCount: 'infinite',
    animationDirection: 'alternate',
    animationName: {
      from: { transform: 'translateY(0)' },
      to: { transform: 'translateY(-9px)' },
    },
    '@media (prefers-reduced-motion: reduce)': { animationName: 'none' },
  },
  flotaLenta: {
    animationDuration: '7s',
    animationTimingFunction: 'ease-in-out',
    animationIterationCount: 'infinite',
    animationDirection: 'alternate',
    animationName: {
      from: { transform: 'translateY(0)' },
      to: { transform: 'translateY(7px)' },
    },
    '@media (prefers-reduced-motion: reduce)': { animationName: 'none' },
  },
})

/**
 * Ilustración de seguridad: una persona al centro, una órbita y un escudo, una llave y un candado
 * alrededor. Es solo decoración: va oculta para lectores de pantalla. Los tonos de fondo salen de tokens
 * de Fluent (se ven en tema claro y oscuro); las piezas llevan los colores de marca de SIAP sobre una
 * insignia azul para que se distingan en cualquier fondo.
 */
export function IlustracionAcceso() {
  const e = estilos()
  const suave = { fill: tokens.colorNeutralBackground1, stroke: tokens.colorNeutralStroke2 }
  const trazo = { fill: 'none', stroke: tokens.colorNeutralStroke1 }

  return (
    <svg
      className={e.svg}
      viewBox="0 0 480 400"
      aria-hidden="true"
      role="presentation"
      focusable="false"
      data-testid="ilustracion-acceso"
    >
      {/* Fondo: disco suave y anillos */}
      <circle cx="240" cy="200" r="168" style={suave} strokeWidth="2" />
      <circle cx="240" cy="200" r="128" style={{ ...trazo, strokeDasharray: '2 8' }} strokeWidth="2" strokeLinecap="round" />

      {/* Órbita inclinada */}
      <ellipse
        cx="240"
        cy="200"
        rx="205"
        ry="74"
        transform="rotate(-24 240 200)"
        style={{ ...trazo, strokeDasharray: '7 9' }}
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* Persona al centro */}
      <circle cx="240" cy="200" r="82" fill={MARINO} stroke={DORADO} strokeWidth="4" />
      <circle cx="240" cy="176" r="24" fill={DORADO} />
      <path d="M194 262c0-30 21-46 46-46s46 16 46 46c-13 11-29 17-46 17s-33-6-46-17Z" fill={DORADO} />

      {/* Escudo con marca de verificación */}
      <g transform="translate(92 112)">
        <g className={e.flota}>
          <circle r="40" fill={MARINO} stroke={DORADO} strokeWidth="3" />
          <path
            d="M0 -22 L18 -14 V4 C18 15 9 22 0 26 C-9 22 -18 15 -18 4 V-14 Z"
            fill="none"
            stroke={DORADO}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path d="M-8 2 L-2 8 L9 -6" fill="none" stroke={DORADO} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </g>

      {/* Llave */}
      <g transform="translate(392 118)">
        <g className={e.flotaLenta}>
          <circle r="38" fill={MARINO} stroke={DORADO} strokeWidth="3" />
          <g transform="rotate(-38)" fill="none" stroke={DORADO} strokeWidth="3.6" strokeLinecap="round">
            <circle cx="-14" cy="0" r="8" />
            <path d="M-6 0H20M13 0v8M20 0v6" />
          </g>
        </g>
      </g>

      {/* Candado */}
      <g transform="translate(372 300)">
        <g className={e.flota}>
          <circle r="40" fill={MARINO} stroke={DORADO} strokeWidth="3" />
          <rect x="-15" y="-4" width="30" height="22" rx="4" fill={DORADO} />
          <path d="M-9 -4v-7a9 9 0 0 1 18 0v7" fill="none" stroke={DORADO} strokeWidth="3.6" strokeLinecap="round" />
          <circle cx="0" cy="6" r="3.2" fill={MARINO} />
          <path d="M0 8v5" stroke={MARINO} strokeWidth="2.6" strokeLinecap="round" />
        </g>
      </g>

      {/* Adornos */}
      <g style={{ fill: tokens.colorBrandBackground }}>
        <circle cx="62" cy="262" r="7" />
        <circle cx="160" cy="344" r="5" />
        <circle cx="436" cy="214" r="5" />
        <circle cx="228" cy="48" r="6" />
      </g>
      <g fill={DORADO}>
        <circle cx="118" cy="300" r="4" />
        <circle cx="318" cy="52" r="4" />
        <circle cx="450" cy="320" r="3" />
      </g>
    </svg>
  )
}
