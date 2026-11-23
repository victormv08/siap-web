import { describe, expect, it } from 'vitest'
import { aNumero, celdasVacias, esPegadoDeFilas, pegarEnCeldas, validarCeldas } from './pegadoFilas'

/** Pegado de filas desde Excel: solo reparte texto en celdas. Datos inventados (D-16). */
describe('pegarEnCeldas', () => {
  it('reparte las líneas en filas y los tabuladores en columnas, desde la primera celda', () => {
    const r = pegarEnCeldas(celdasVacias(3), 'Obra nueva\tMOR-01\t\t\t2\nObra nueva\tCON-01\tZapatas\tm3\t3,5', 0, 0)
    expect(r[0]).toEqual(['Obra nueva', 'MOR-01', '', '', '2'])
    expect(r[1]).toEqual(['Obra nueva', 'CON-01', 'Zapatas', 'm3', '3,5'])
    expect(r[2]).toEqual(['', '', '', '', ''])
  })

  it('omite el encabezado cuando se pega desde la primera columna', () => {
    const r = pegarEnCeldas(celdasVacias(2), 'Capítulo\tCódigo\tDescripción\tUnidad\tCantidad\nA\tMOR-01\t\t\t1', 0, 0)
    expect(r[0]).toEqual(['A', 'MOR-01', '', '', '1'])
  })

  it('pega desde la celda indicada, sin tocar lo de la izquierda, y la rejilla crece hacia abajo', () => {
    const base = pegarEnCeldas(celdasVacias(1), 'A\tMOR-01\t\t\t1', 0, 0)
    const r = pegarEnCeldas(base, '5\n6\n7', 0, 4)
    expect(r.map((f) => f[4])).toEqual(['5', '6', '7'])
    expect(r[0].slice(0, 4)).toEqual(['A', 'MOR-01', '', ''])
    expect(r).toHaveLength(3)
  })

  it('ignora lo que sobra a la derecha y las líneas en blanco, y entiende los saltos de Windows', () => {
    const r = pegarEnCeldas(celdasVacias(1), 'A\tMOR-01\t\t\t1\tsobra\r\n\r\nB\tMOR-01\t\t\t2\r\n', 0, 0)
    expect(r[0]).toEqual(['A', 'MOR-01', '', '', '1'])
    expect(r[1]).toEqual(['B', 'MOR-01', '', '', '2'])
  })

  it('no cambia la rejilla original', () => {
    const original = celdasVacias(1)
    pegarEnCeldas(original, 'A\tMOR-01\t\t\t1', 0, 0)
    expect(original[0]).toEqual(['', '', '', '', ''])
  })
})

describe('validarCeldas', () => {
  it('arma las filas a enviar: vacío es null y la cantidad entiende coma o punto decimal', () => {
    const r = validarCeldas([
      ['Obra nueva', 'MOR-01', '', '', '2'],
      ['Obra nueva', 'CON-01', 'Zapatas', 'm3', '1.250,5'],
    ])
    expect(r.problemas).toEqual([])
    expect(r.filas).toEqual([
      { capitulo: 'Obra nueva', codigoAnalisis: 'MOR-01', descripcion: null, unidad: null, cantidad: 2 },
      { capitulo: 'Obra nueva', codigoAnalisis: 'CON-01', descripcion: 'Zapatas', unidad: 'm3', cantidad: 1250.5 },
    ])
  })

  it('las filas en blanco se ignoran y las demás conservan su número de fila de la rejilla', () => {
    const r = validarCeldas([
      ['A', 'MOR-01', '', '', '1'],
      ['', '', '', '', ''],
      ['A', 'MOR-01', '', '', '2'],
    ])
    expect(r.filas).toHaveLength(2)
    expect(r.numerosDeFila).toEqual([1, 3])
  })

  it('informa por fila lo que no se puede enviar, sin descartar nada en silencio', () => {
    const r = validarCeldas([
      ['A', 'MOR-01', '', '', 'mucho'],
      ['A', '', '', '', '2'],
      ['', 'MOR-01', '', '', '2'],
      ['A', 'MOR-01', '', '', ''],
    ])
    expect(r.filas).toEqual([])
    expect(r.problemas.map((p) => p.fila)).toEqual([1, 2, 3, 4])
    expect(r.problemas[0].motivo).toContain('mucho')
    expect(r.problemas[3].motivo).toBe('Falta la cantidad.')
  })
})

describe('aNumero y esPegadoDeFilas', () => {
  it('entiende separadores de miles y decimales en español e inglés', () => {
    expect(['1.250,5', '1250,5', '1,250.5', '1250.5'].map(aNumero)).toEqual([1250.5, 1250.5, 1250.5, 1250.5])
    expect(aNumero('mucho')).toBeNull()
    expect(aNumero('')).toBeNull()
  })

  it('en pesos, el punto en grupos de tres dígitos separa miles y no es un decimal', () => {
    expect(['28.500', '28.500.000', '12.345', '1.250'].map(aNumero)).toEqual([28500, 28500000, 12345, 1250])
  })

  it('un punto que no separa miles es decimal, y la coma sola es el decimal en español', () => {
    expect(['0.500', '12.34', '1.2', '3,5', '0,5'].map(aNumero)).toEqual([0.5, 12.34, 1.2, 3.5, 0.5])
    expect(aNumero('1,250,000')).toBe(1250000)
    expect(aNumero('1,250')).toBe(1.25)
  })

  it('un solo valor se pega normal; varias celdas o líneas, no', () => {
    expect(esPegadoDeFilas('hola')).toBe(false)
    expect(esPegadoDeFilas('a\tb')).toBe(true)
    expect(esPegadoDeFilas('a\nb')).toBe(true)
  })
})
