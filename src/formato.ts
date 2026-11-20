/**
 * Solo da formato para mostrar. No suma, no multiplica ni redondea dinero (D-27, D-51):
 * el valor que se muestra es el que llegó de la API.
 */
const pesosFormato = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })
const decimalesFormato = new Intl.NumberFormat('es-CO', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const porcentajeFormato = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 })

/** Valor en pesos, sin decimales, como viene de la API. */
export function pesos(valor: number): string {
  return pesosFormato.format(valor)
}

/** Cantidad o precio con dos decimales. */
export function decimales(valor: number): string {
  return decimalesFormato.format(valor)
}

/** Porcentaje en puntos (15 → «15»). */
export function porcentaje(valor: number | null): string {
  return valor === null ? '—' : porcentajeFormato.format(valor)
}
