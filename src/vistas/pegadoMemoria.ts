import type { GeneradorMemoria } from '../api/cliente'

/**
 * Pegado desde Excel en la memoria de cantidades. Solo reparte texto en columnas: no calcula nada.
 * Las columnas que se llenan, en orden: genérico → Largo, Ancho, Alto, Piezas; acero → Long, Cant, Piezas.
 */
export const COLUMNAS_PEGADO = {
  Generico: ['largo', 'ancho', 'alto', 'piezas'],
  Acero: ['longitud', 'barras', 'piezas'],
} as const satisfies Record<GeneradorMemoria, readonly string[]>

function esNumero(texto: string): boolean {
  const limpio = texto.trim().replace(',', '.')
  return limpio !== '' && Number.isFinite(Number(limpio))
}

/** ¿Es un pegado de varias celdas (con tabuladores o saltos de línea)? Un solo valor se pega normal. */
export function esPegadoDeTabla(texto: string): boolean {
  return /[\t\n]/.test(texto.trim())
}

/**
 * Convierte el texto pegado en filas de valores, una por línea. Cada celda que no es un número queda
 * vacía y las líneas sin ningún número (por ejemplo, los encabezados) se omiten.
 */
export function filasDePegado(texto: string, modo: GeneradorMemoria): string[][] {
  const columnas = COLUMNAS_PEGADO[modo].length
  return texto
    .split(/\r?\n/)
    .map((linea) => linea.split('\t').slice(0, columnas).map((celda) => (esNumero(celda) ? celda.trim() : '')))
    .filter((celdas) => celdas.some((celda) => celda !== ''))
}
