import type { ReactNode } from 'react'

interface Props {
  /** Nombre accesible de la hoja (aria-label de la sección). */
  etiqueta: string
  titulo: string
  /** Una línea de descripción (hasta ~70 caracteres por línea). */
  descripcion?: string
  /** Hojas con tablas anchas (por ejemplo, el formulario de precios) usan más ancho. */
  ancha?: boolean
  children: ReactNode
}

/**
 * Página común de las hojas: lienzo con su propio desplazamiento y una página centrada de ancho máximo
 * (~1100 px), con título y descripción. Así las hojas se ven de la misma familia (estilos en estilos.css).
 */
export function HojaPagina({ etiqueta, titulo, descripcion, ancha = false, children }: Props) {
  return (
    <div className="hoja-lienzo">
      <section className={ancha ? 'hoja-pagina ancha' : 'hoja-pagina'} aria-label={etiqueta}>
        <header className="hoja-encabezado">
          <h2 className="hoja-titulo">{titulo}</h2>
          {descripcion && <p className="hoja-descripcion">{descripcion}</p>}
        </header>
        {children}
      </section>
    </div>
  )
}
