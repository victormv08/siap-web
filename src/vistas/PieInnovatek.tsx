import { infoInnovatek, textoDerechos } from '../auth/infoInnovatek'

/** Pie de marca de Innovatek, el mismo de la pantalla de entrada pero en una sola línea (estilos en estilos.css). */
export function PieInnovatek() {
  return (
    <footer className="siap-pie-marca" aria-label="Pie de página">
      <strong>{infoInnovatek.nombre}</strong>
      <span>{textoDerechos()}</span>
      <span className="producto">{infoInnovatek.producto}</span>
    </footer>
  )
}
