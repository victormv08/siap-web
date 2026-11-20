import type { ReactNode } from 'react'

/**
 * Iconos de los campos de la pantalla de entrada, dibujados en línea (trazo con `currentColor`, así toman
 * el color del tema). Son decorativos: el nombre del campo lo da su etiqueta, por eso van con aria-hidden.
 * Se dibujan aquí y no con @fluentui/react-icons porque ese paquete no está declarado en package.json.
 */
function Base({ children }: { children: ReactNode }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

export function IconoEmpresa() {
  return (
    <Base>
      <path d="M4 21V5.5A1.5 1.5 0 0 1 5.5 4h8A1.5 1.5 0 0 1 15 5.5V21" />
      <path d="M15 10h3.5A1.5 1.5 0 0 1 20 11.5V21" />
      <path d="M2.5 21h19" />
      <path d="M8 8h3M8 12h3M8 16h3" />
    </Base>
  )
}

export function IconoPersona() {
  return (
    <Base>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20.5c.6-3.9 3.7-6 7.5-6s6.9 2.1 7.5 6" />
    </Base>
  )
}

export function IconoCandado() {
  return (
    <Base>
      <rect x="5" y="10.5" width="14" height="10" rx="2.2" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
      <circle cx="12" cy="15.5" r="1.2" />
    </Base>
  )
}

export function IconoOjo({ tachado }: { tachado: boolean }) {
  return (
    <Base>
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {tachado ? <path d="M4 4l16 16" /> : null}
    </Base>
  )
}
