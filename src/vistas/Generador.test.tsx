import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { fijarCsrf } from '../auth/enlace'
import type { MemoriaRespuesta } from '../api/cliente'
import { Cantidades } from './Cantidades'
import { filasDePegado } from './pegadoMemoria'
import { instalarApi, json, presupuestoDePrueba } from '../test/apiDePrueba'
import type { Llamada } from '../test/apiDePrueba'

/** Generador de cantidades (RD-067, R-017) con la API simulada. Datos inventados (D-16). */

const URL_MEMORIA_1_01 = '/api/presupuestos/P-0001/items/1.01/memoria'
const URL_MEMORIA_1_02 = '/api/presupuestos/P-0001/items/1.02/memoria'

type Usuario = ReturnType<typeof userEvent.setup>

/** Respuesta del PUT: la memoria guardada y el presupuesto recalculado. */
function respuestaDeGuardado(total: number, extra: Partial<MemoriaRespuesta> = {}) {
  return json({
    memoria: { codigoItem: '1.01', total, generador: 'Generico', observacionGeneral: '', filas: [], ...extra },
    presupuesto: presupuestoDePrueba(),
  })
}

/** Abre la aplicación, selecciona una actividad y abre su generador con F6. */
async function abrirGenerador(descripcion = 'Localización y replanteo'): Promise<{ usuario: Usuario; dialogo: HTMLElement }> {
  const usuario = userEvent.setup()
  render(<App />)
  await screen.findByRole('table', { name: 'Ítems del presupuesto' })
  await usuario.click(screen.getByText(descripcion))
  await usuario.keyboard('{F6}')
  const dialogo = await screen.findByRole('dialog', { name: /Generador de cantidades/ })
  await waitFor(() => expect(within(dialogo).getByRole('table')).toBeInTheDocument())
  return { usuario, dialogo }
}

function cuerpoDelPut(llamadas: Llamada[], url: string) {
  const put = llamadas.find((l) => l.url === url && l.metodo === 'PUT')
  return put?.cuerpo as { generador: string; observacionGeneral: string; filas: Record<string, unknown>[] } | undefined
}

describe('Generador de cantidades', () => {
  beforeEach(() => fijarCsrf(null))
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('abre en Genérico si la unidad no es kg y en Acero si lo es', async () => {
    instalarApi()
    const { dialogo } = await abrirGenerador('Localización y replanteo')
    expect(within(dialogo).getByRole('radio', { name: 'Genérico' })).toBeChecked()
    expect(within(dialogo).getByRole('columnheader', { name: 'Largo' })).toBeInTheDocument()
    cleanup()

    instalarApi()
    const acero = await abrirGenerador('Acero de refuerzo para zapatas')
    expect(within(acero.dialogo).getByRole('radio', { name: 'Acero de refuerzo' })).toBeChecked()
    expect(within(acero.dialogo).getByRole('columnheader', { name: 'Peso kg/m' })).toBeInTheDocument()
  })

  it('al cambiar el tipo de generador cambian las columnas y la unidad del total', async () => {
    instalarApi()
    const { usuario, dialogo } = await abrirGenerador()
    expect(within(dialogo).getByText(/Cantidad del ítem: .* m2/)).toBeInTheDocument()

    await usuario.click(within(dialogo).getByRole('radio', { name: 'Acero de refuerzo' }))

    expect(within(dialogo).queryByRole('columnheader', { name: 'Largo' })).not.toBeInTheDocument()
    expect(within(dialogo).getByRole('columnheader', { name: 'Esquema' })).toBeInTheDocument()
    expect(within(dialogo).getByRole('columnheader', { name: 'Cant' })).toBeInTheDocument()
    expect(within(dialogo).getByText(/Cantidad del ítem: .* kg/)).toBeInTheDocument()
  })

  it('una fila genérica con factores vacíos se envía con nulos: vacío cuenta como 1 lo decide la API', async () => {
    const { llamadas } = instalarApi({
      manejador: (url, init) => (url === URL_MEMORIA_1_01 && init.method === 'PUT' ? respuestaDeGuardado(3) : undefined),
    })
    const { usuario, dialogo } = await abrirGenerador()

    await usuario.type(within(dialogo).getByLabelText('largo de la fila 1'), '3')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar memoria' }))

    await waitFor(() => expect(cuerpoDelPut(llamadas, URL_MEMORIA_1_01)).toBeDefined())
    const cuerpo = cuerpoDelPut(llamadas, URL_MEMORIA_1_01)!
    expect(cuerpo.generador).toBe('Generico')
    expect(cuerpo.filas).toHaveLength(1)
    expect(cuerpo.filas[0]).toMatchObject({ tipo: 'Fila', largo: 3, ancho: null, alto: null, piezas: null, figura: null })
  })

  it('el tipo de generador es un control segmentado que cambia con las flechas', async () => {
    instalarApi()
    const { usuario, dialogo } = await abrirGenerador()
    const grupo = within(dialogo).getByRole('radiogroup', { name: 'Tipo de generador' })
    const generico = within(grupo).getByRole('radio', { name: 'Genérico' })
    const acero = within(grupo).getByRole('radio', { name: 'Acero de refuerzo' })
    expect(generico).toBeChecked()
    expect(acero).not.toBeChecked()

    generico.focus()
    await usuario.keyboard('{ArrowRight}')

    expect(acero).toBeChecked()
    expect(acero).toHaveFocus()
    expect(within(dialogo).getByRole('columnheader', { name: 'Peso kg/m' })).toBeInTheDocument()

    await usuario.keyboard('{ArrowLeft}')

    expect(generico).toBeChecked()
    expect(generico).toHaveFocus()
  })

  it('el encabezado muestra el código, el nombre de la actividad y la unidad como insignia', async () => {
    instalarApi()
    const { dialogo } = await abrirGenerador()

    expect(within(dialogo).getByTitle('Unidad de la actividad')).toHaveTextContent('m2')
    expect(within(dialogo).getByText('Localización y replanteo')).toBeInTheDocument()
  })

  it('cada fila tiene su número y un botón con icono para borrarla', async () => {
    instalarApi()
    const { usuario, dialogo } = await abrirGenerador()
    await usuario.click(within(dialogo).getByRole('button', { name: 'Agregar fila' }))
    expect(within(dialogo).getByLabelText('largo de la fila 2')).toBeInTheDocument()
    await usuario.type(within(dialogo).getByLabelText('largo de la fila 2'), '7')

    await usuario.click(within(dialogo).getByRole('button', { name: 'Quitar la fila 1' }))

    // Queda una sola fila, y es la que tenía el 7.
    expect(within(dialogo).queryByLabelText('largo de la fila 2')).not.toBeInTheDocument()
    expect(within(dialogo).getByLabelText('largo de la fila 1')).toHaveValue('7')
  })

  it('la barra inferior reúne el total con Cancelar y Guardar', async () => {
    instalarApi()
    const { dialogo } = await abrirGenerador()

    const total = within(dialogo).getByText(/Cantidad del ítem: .* m2/)
    const barra = total.parentElement as HTMLElement

    expect(barra).toHaveClass('gen-barra')
    expect(within(barra).getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
    expect(within(barra).getByRole('button', { name: 'Guardar memoria' })).toBeInTheDocument()
  })

  it('el detalle del cálculo va en un bloque plegable «¿Cómo se calcula?», cerrado al abrir', async () => {
    instalarApi()
    const { usuario, dialogo } = await abrirGenerador()
    const resumen = within(dialogo).getByText('¿Cómo se calcula?')
    const detalle = resumen.closest('details') as HTMLDetailsElement

    expect(detalle).not.toHaveAttribute('open')
    expect(within(detalle).getByText(/Un factor vacío cuenta como 1/)).toBeInTheDocument()

    await usuario.click(resumen)

    expect(detalle).toHaveAttribute('open')
  })

  it('manda la observación general y las columnas nuevas en el PUT, y las filas sin observación la heredan en pantalla', async () => {
    const { llamadas } = instalarApi({
      manejador: (url, init) => (url === URL_MEMORIA_1_01 && init.method === 'PUT' ? respuestaDeGuardado(4) : undefined),
    })
    const { usuario, dialogo } = await abrirGenerador()

    await usuario.type(within(dialogo).getByLabelText('Observación general de la actividad'), 'Primer piso')
    expect(within(dialogo).getByLabelText('Observación de la fila 1')).toHaveAttribute('placeholder', 'Primer piso')
    await usuario.type(within(dialogo).getByLabelText('Nivel de la fila 1'), 'N1')
    await usuario.type(within(dialogo).getByLabelText('Eje de la fila 1'), 'A')
    await usuario.type(within(dialogo).getByLabelText('Tramo de la fila 1'), '1-2')
    await usuario.type(within(dialogo).getByLabelText('Clasificador de la fila 1'), 'Muro')
    await usuario.type(within(dialogo).getByLabelText('largo de la fila 1'), '2,5')
    await usuario.type(within(dialogo).getByLabelText('piezas de la fila 1'), '4')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar memoria' }))

    await waitFor(() => expect(cuerpoDelPut(llamadas, URL_MEMORIA_1_01)).toBeDefined())
    const cuerpo = cuerpoDelPut(llamadas, URL_MEMORIA_1_01)!
    expect(cuerpo.observacionGeneral).toBe('Primer piso')
    expect(cuerpo.filas[0]).toMatchObject({
      observacion: null,
      nivel: 'N1',
      eje: 'A',
      tramo: '1-2',
      clasificador: 'Muro',
      largo: 2.5,
      piezas: 4,
    })
  })

  it('una fila con figura: elegir, calcular con la API y «Usar en la fila» deshabilita Largo, Ancho y Alto', async () => {
    const { llamadas } = instalarApi({
      manejador: (url, init) => {
        if (url === '/api/catalogo/figuras/circulo/calcular' && init.method === 'POST') {
          return json({ resultado: 12.566, unidad: 'm2', formula: 'S = π × 2² = 12,57' })
        }
        if (url === URL_MEMORIA_1_01 && init.method === 'PUT') return respuestaDeGuardado(12.57)
        return undefined
      },
    })
    const { usuario, dialogo } = await abrirGenerador()

    await usuario.click(within(dialogo).getByRole('button', { name: 'Figura de la fila 1' }))
    const figuras = await screen.findByRole('dialog', { name: 'Figuras geométricas' })
    await usuario.selectOptions(within(figuras).getByLabelText('Figura'), 'circulo')
    expect(within(figuras).getByText('S = π × r²')).toBeInTheDocument()
    await usuario.type(within(figuras).getByLabelText('Radio (r)'), '2')
    await usuario.click(within(figuras).getByRole('button', { name: 'Calcular' }))

    expect(await within(figuras).findByText('Resultado: 12,57 m2')).toBeInTheDocument()
    expect(within(figuras).getByText('S = π × 2² = 12,57')).toBeInTheDocument()
    expect(llamadas.find((l) => l.url.endsWith('/calcular'))?.cuerpo).toEqual({ parametros: { r: 2 } })

    await usuario.click(within(figuras).getByRole('button', { name: 'Usar en la fila' }))

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Figuras geométricas' })).not.toBeInTheDocument())
    expect(within(dialogo).getByLabelText('largo de la fila 1')).toBeDisabled()
    expect(within(dialogo).getByLabelText('ancho de la fila 1')).toBeDisabled()
    expect(within(dialogo).getByLabelText('alto de la fila 1')).toBeDisabled()
    expect(within(dialogo).getByLabelText('piezas de la fila 1')).toBeEnabled()
    expect(within(dialogo).getByRole('button', { name: 'Figura de la fila 1: Círculo' })).toBeInTheDocument()

    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar memoria' }))
    await waitFor(() => expect(cuerpoDelPut(llamadas, URL_MEMORIA_1_01)).toBeDefined())
    expect(cuerpoDelPut(llamadas, URL_MEMORIA_1_01)!.filas[0]).toMatchObject({
      figura: 'circulo',
      parametros: { r: 2 },
      largo: null,
      ancho: null,
      alto: null,
    })
  })

  it('se puede quitar la figura de una fila y vuelven a habilitarse las medidas', async () => {
    instalarApi({
      memoria: {
        codigoItem: '1.01',
        total: 12.57,
        generador: 'Generico',
        observacionGeneral: '',
        filas: [
          {
            tipo: 'Fila', observacion: '', largo: null, ancho: null, alto: null, piezas: null, valor: 12.57,
            figura: 'circulo', parametros: { r: 2 },
          },
        ],
      },
    })
    const { usuario, dialogo } = await abrirGenerador()
    expect(within(dialogo).getByLabelText('largo de la fila 1')).toBeDisabled()

    await usuario.click(within(dialogo).getByRole('button', { name: 'Quitar la figura de la fila 1' }))

    expect(within(dialogo).getByLabelText('largo de la fila 1')).toBeEnabled()
    expect(within(dialogo).getByRole('button', { name: 'Figura de la fila 1' })).toBeInTheDocument()
  })

  it('en la figura, el error de la API (400) se muestra en un aviso', async () => {
    instalarApi({
      manejador: (url, init) =>
        url.endsWith('/calcular') && init.method === 'POST' ? json({ detail: 'Falta el parámetro «r».' }, 400) : undefined,
    })
    const { usuario, dialogo } = await abrirGenerador()
    await usuario.click(within(dialogo).getByRole('button', { name: 'Figura de la fila 1' }))
    const figuras = await screen.findByRole('dialog', { name: 'Figuras geométricas' })

    await usuario.click(within(figuras).getByRole('button', { name: 'Calcular' }))

    expect(await within(figuras).findByRole('alert')).toHaveTextContent('Falta el parámetro «r».')
    expect(within(figuras).getByRole('button', { name: 'Usar en la fila' })).toBeDisabled()
  })

  it('en Acero el peso es de solo lectura y sale de la tabla que entrega la API', async () => {
    const { llamadas } = instalarApi({
      manejador: (url, init) =>
        url === URL_MEMORIA_1_02 && init.method === 'PUT' ? respuestaDeGuardado(100, { codigoItem: '1.02', generador: 'Acero' }) : undefined,
    })
    const { usuario, dialogo } = await abrirGenerador('Acero de refuerzo para zapatas')

    await usuario.selectOptions(within(dialogo).getByLabelText('Referencia del acero de la fila 1'), '#4')

    const celdaPeso = within(dialogo).getByTitle('Peso kg/m de la tabla de acero (solo lectura)')
    expect(celdaPeso).toHaveTextContent('0,99')
    expect(within(celdaPeso).queryByRole('textbox')).not.toBeInTheDocument()
    expect(within(dialogo).queryByLabelText(/peso/i)).not.toBeInTheDocument()
    expect(within(dialogo).getByText(/Tabla de prueba \(inventada\)/)).toBeInTheDocument()

    await usuario.type(within(dialogo).getByLabelText('longitud de la fila 1'), '6')
    await usuario.type(within(dialogo).getByLabelText('barras de la fila 1'), '8')
    await usuario.type(within(dialogo).getByLabelText('piezas de la fila 1'), '2')
    await usuario.type(within(dialogo).getByLabelText('Esquema de la fila 1'), 'L-1')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar memoria' }))

    await waitFor(() => expect(cuerpoDelPut(llamadas, URL_MEMORIA_1_02)).toBeDefined())
    const cuerpo = cuerpoDelPut(llamadas, URL_MEMORIA_1_02)!
    expect(cuerpo.generador).toBe('Acero')
    expect(cuerpo.filas[0]).toMatchObject({ ref: '#4', longitud: 6, barras: 8, piezas: 2, esquema: 'L-1', largo: null, figura: null })
    expect(cuerpo.filas[0]).not.toHaveProperty('peso') // el peso no se manda: lo pone la API
  })

  it('el error del PUT se muestra en un aviso y el diálogo sigue abierto', async () => {
    instalarApi({
      manejador: (url, init) =>
        url === URL_MEMORIA_1_01 && init.method === 'PUT' ? json({ detail: 'Los descuentos superan las medidas.' }, 400) : undefined,
    })
    const { usuario, dialogo } = await abrirGenerador()

    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar memoria' }))

    expect(await within(dialogo).findByRole('alert')).toHaveTextContent('Los descuentos superan las medidas.')
    expect(screen.getByRole('dialog', { name: /Generador de cantidades/ })).toBeInTheDocument()
  })

  it('pegar desde Excel agrega una fila por línea en Largo, Ancho, Alto y Piezas', async () => {
    instalarApi()
    const { dialogo } = await abrirGenerador()
    const tabla = within(dialogo).getByRole('table')

    fireEvent.paste(tabla, { clipboardData: { getData: () => '2\t3\t\t1\n4,5\t1\t2\t2\n' } })

    // La fila vacía inicial se reemplaza: quedan 2 filas.
    expect(within(dialogo).getByLabelText('largo de la fila 1')).toHaveValue('2')
    expect(within(dialogo).getByLabelText('ancho de la fila 1')).toHaveValue('3')
    expect(within(dialogo).getByLabelText('alto de la fila 1')).toHaveValue('')
    expect(within(dialogo).getByLabelText('largo de la fila 2')).toHaveValue('4,5')
    expect(within(dialogo).queryByLabelText('largo de la fila 3')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Se agregaron 2 filas')
  })

  it('pegar un solo valor no lo intercepta', async () => {
    instalarApi()
    const { dialogo } = await abrirGenerador()
    const tabla = within(dialogo).getByRole('table')

    const evento = fireEvent.paste(tabla, { clipboardData: { getData: () => '12' } })

    expect(evento).toBe(true) // no se canceló: el navegador lo pega en la celda
  })

  it('Enter en la última fila agrega una fila nueva y pasa a ella', async () => {
    instalarApi()
    const { usuario, dialogo } = await abrirGenerador()

    await usuario.type(within(dialogo).getByLabelText('largo de la fila 1'), '2{Enter}')

    expect(within(dialogo).getByLabelText('largo de la fila 2')).toHaveFocus()
  })
})

describe('filasDePegado', () => {
  it('reparte las columnas del genérico y omite encabezados y celdas que no son números', () => {
    expect(filasDePegado('Largo\tAncho\n2\t3\n4\tx\n', 'Generico')).toEqual([
      ['2', '3'],
      ['4', ''],
    ])
  })

  it('en acero llena solo Long, Cant y Piezas', () => {
    expect(filasDePegado('6\t8\t2\t99', 'Acero')).toEqual([['6', '8', '2']])
  })
})

describe('Medir cantidades desde las hojas', () => {
  beforeEach(() => fijarCsrf(null))
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('Costos directos tiene un botón «Medir cantidades de …» en cada actividad que abre el generador', async () => {
    instalarApi()
    const usuario = userEvent.setup()
    render(<App />)
    await screen.findByRole('table', { name: 'Ítems del presupuesto' })

    await usuario.click(screen.getByRole('button', { name: 'Medir cantidades de Localización y replanteo' }))

    const dialogo = await screen.findByRole('dialog', { name: /Generador de cantidades · 1\.01/ })
    expect(dialogo).toBeInTheDocument()
  })

  it('F6 sin actividad seleccionada avisa y con una seleccionada abre su generador', async () => {
    instalarApi()
    const usuario = userEvent.setup()
    render(<App />)
    await screen.findByRole('table', { name: 'Ítems del presupuesto' })

    await usuario.keyboard('{F6}')
    expect(await screen.findByText('Selecciona una actividad para medir sus cantidades.')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await usuario.click(screen.getByText('Acero de refuerzo para zapatas'))
    await usuario.keyboard('{F6}')
    expect(await screen.findByRole('dialog', { name: /Generador de cantidades · 1\.02/ })).toBeInTheDocument()
  })

  it('una actividad con memoria muestra su origen y no deja editar la cantidad a mano', async () => {
    instalarApi({ presupuesto: presupuestoDePrueba({ tieneMemoria: true }) })
    render(<App />)
    await screen.findByRole('table', { name: 'Ítems del presupuesto' })

    const cantidad = screen.getByLabelText('Cantidad del ítem 1.01')

    expect(cantidad).toHaveAttribute('readonly')
    expect(screen.getByText('memoria')).toBeInTheDocument()
    expect(screen.getByLabelText('Cantidad del ítem 1.02')).toBeEnabled()
  })

  it('tras guardar una memoria, la actividad queda marcada como «memoria»', async () => {
    instalarApi({
      manejador: (url, init) =>
        url === URL_MEMORIA_1_01 && init.method === 'PUT'
          ? json({
              memoria: {
                codigoItem: '1.01', total: 6, generador: 'Generico', observacionGeneral: '',
                filas: [{ tipo: 'Fila', observacion: '', largo: 3, ancho: 2, alto: null, piezas: null, valor: 6 }],
              },
              presupuesto: presupuestoDePrueba(),
            })
          : undefined,
    })
    const { usuario, dialogo } = await abrirGenerador()
    await usuario.type(within(dialogo).getByLabelText('largo de la fila 1'), '3')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar memoria' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByText('memoria')).toBeInTheDocument()
    expect(screen.getByLabelText('Cantidad del ítem 1.01')).toHaveAttribute('readonly')
  })

  it('la hoja Cantidades tiene un botón «Medir» por actividad y el aviso dice cómo abrirlo', async () => {
    const alAbrir = vi.fn()
    render(<Cantidades presupuesto={presupuestoDePrueba()} onAbrirMedidor={alAbrir} />)
    const usuario = userEvent.setup()

    await usuario.click(screen.getByRole('button', { name: 'Medir cantidades de Acero de refuerzo para zapatas' }))

    expect(alAbrir).toHaveBeenCalledWith('1.02')
    expect(screen.getByText(/pulse «Medir» para abrir el generador/)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^Medir cantidades de/ })).toHaveLength(2)
  })
})
