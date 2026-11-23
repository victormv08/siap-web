/**
 * Filas pegadas desde Excel para agregar varios ítems de una vez (ADR 0003 de siap-api).
 * Solo reparte el texto en celdas y revisa lo evidente: no calcula nada, el precio sale del catálogo en la API.
 *
 * Columnas, en orden: Capítulo | Código (del catálogo) | Descripción | Unidad | Cantidad.
 * Descripción y Unidad pueden ir vacías: la API toma las del catálogo.
 */
export interface FilaPegada {
  capitulo: string
  codigoAnalisis: string
  descripcion: string | null
  unidad: string | null
  cantidad: number
}

export interface ProblemaDeFila {
  /** Número de la fila en la rejilla (1 es la primera). */
  fila: number
  motivo: string
}

export const COLUMNAS_FILAS = ['Capítulo', 'Código', 'Descripción', 'Unidad', 'Cantidad'] as const
export const NUMERO_DE_COLUMNAS = COLUMNAS_FILAS.length

/** Filas en blanco con las que se abre la rejilla, para que se vea como una hoja. */
export const FILAS_INICIALES = 10

export function celdasVacias(filas: number): string[][] {
  return Array.from({ length: filas }, () => Array<string>(NUMERO_DE_COLUMNAS).fill(''))
}

/**
 * Convierte un número escrito como en Excel o a mano en un número; null si no lo es. Pensado para pesos colombianos:
 * «28.500» es 28 500 y «3,5» es 3,5. Con coma y punto, el último que aparece es el decimal (1.250,5 y 1,250.5 son 1 250,5).
 * Solo con puntos, son miles si van en grupos de tres dígitos («28.500», «1.250.000»), salvo que empiece por 0 («0.500» es 0,5).
 * Solo con comas, la coma es el decimal, salvo grupos de tres repetidos («1,250,000»).
 */
export function aNumero(texto: string): number | null {
  const limpio = texto.trim().replace(/\s/g, '')
  if (limpio === '') return null
  const puntos = (limpio.match(/\./g) ?? []).length
  const comas = (limpio.match(/,/g) ?? []).length
  let normal: string
  if (puntos > 0 && comas > 0) {
    const decimalEsComa = limpio.lastIndexOf(',') > limpio.lastIndexOf('.')
    normal = decimalEsComa ? limpio.replace(/\./g, '').replace(',', '.') : limpio.replace(/,/g, '')
  } else if (puntos > 0) {
    normal = /^-?[1-9]\d{0,2}(\.\d{3})+$/.test(limpio) ? limpio.replace(/\./g, '') : limpio
  } else if (comas > 0) {
    normal = comas > 1 && /^-?[1-9]\d{0,2}(,\d{3})+$/.test(limpio) ? limpio.replace(/,/g, '') : limpio.replace(',', '.')
  } else {
    normal = limpio
  }
  if (!/^-?\d+(\.\d+)?$/.test(normal)) return null
  return Number(normal)
}

/** ¿Es un pegado de varias celdas (con tabuladores o saltos de línea)? Un solo valor se pega normal. */
export function esPegadoDeFilas(texto: string): boolean {
  return /[\t\n]/.test(texto.trim())
}

/** Reparte el texto copiado de Excel en filas de celdas, sin las líneas en blanco. */
export function lineasDePegado(texto: string): string[][] {
  return texto
    .split(/\r?\n/)
    .filter((linea) => linea.trim() !== '')
    .map((linea) => linea.split('\t').map((celda) => celda.trim()))
}

/** Solo la primera línea puede ser un encabezado: dice «Cantidad» o «Código» en su columna. */
export function esEncabezado(fila: string[]): boolean {
  return fila.length >= NUMERO_DE_COLUMNAS && aNumero(fila[4]) === null && (/^cant/i.test(fila[4]) || /^c[oó]digo$/i.test(fila[1]))
}

/**
 * Pega el texto en la rejilla a partir de una celda, como Excel: cada línea baja una fila y cada tabulador
 * pasa a la columna siguiente. Lo que sobra a la derecha se ignora y la rejilla crece hacia abajo si hace falta.
 * Si se pega desde la primera columna y la primera línea es el encabezado, se omite.
 */
export function pegarEnCeldas(celdas: string[][], texto: string, fila: number, columna: number): string[][] {
  let lineas = lineasDePegado(texto)
  if (columna === 0 && lineas.length > 0 && esEncabezado(lineas[0])) lineas = lineas.slice(1)
  const nuevas = celdas.map((f) => [...f])
  lineas.forEach((linea, i) => {
    while (nuevas.length <= fila + i) nuevas.push(Array<string>(NUMERO_DE_COLUMNAS).fill(''))
    linea.forEach((celda, j) => {
      if (columna + j < NUMERO_DE_COLUMNAS) nuevas[fila + i][columna + j] = celda
    })
  })
  return nuevas
}

export interface CeldasValidadas {
  /** Las filas listas para enviar, en el orden de la rejilla (sin las filas en blanco). */
  filas: FilaPegada[]
  /** Para cada fila enviada, su número en la rejilla (1 es la primera): sirve para ubicar un error de la API. */
  numerosDeFila: number[]
  problemas: ProblemaDeFila[]
}

/** Revisa lo evidente de cada fila no vacía. El resto (código en el catálogo, etc.) lo valida la API. */
export function validarCeldas(celdas: string[][]): CeldasValidadas {
  const filas: FilaPegada[] = []
  const numerosDeFila: number[] = []
  const problemas: ProblemaDeFila[] = []
  celdas.forEach((c, i) => {
    if (c.every((celda) => celda.trim() === '')) return
    const fila = i + 1
    const [capitulo = '', codigo = '', descripcion = '', unidad = '', cantidadTexto = ''] = c.map((x) => x.trim())
    const cantidad = aNumero(cantidadTexto)
    if (codigo === '') {
      problemas.push({ fila, motivo: 'Falta el código del catálogo.' })
    } else if (capitulo === '') {
      problemas.push({ fila, motivo: 'Falta el capítulo.' })
    } else if (cantidad === null) {
      problemas.push({ fila, motivo: cantidadTexto === '' ? 'Falta la cantidad.' : `La cantidad «${cantidadTexto}» no es un número.` })
    } else {
      filas.push({
        capitulo,
        codigoAnalisis: codigo,
        descripcion: descripcion === '' ? null : descripcion,
        unidad: unidad === '' ? null : unidad,
        cantidad,
      })
      numerosDeFila.push(fila)
    }
  })
  return { filas, numerosDeFila, problemas }
}
