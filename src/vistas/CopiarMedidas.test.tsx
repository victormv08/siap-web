import { cleanup, configure, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { fijarCsrf } from '../auth/enlace'
import type { MemoriaRespuesta } from '../api/cliente'
import { instalarApi, json, presupuestoDePrueba } from '../test/apiDePrueba'

/** En el generador de cantidades se pueden copiar las medidas ya guardadas de otra actividad. Datos inventados (D-16). */

configure({ asyncUtilTimeout: 8000 })

const MEMORIA_DE_ZAPATAS: MemoriaRespuesta = {
  codigoItem: '1.02',
  total: 24,
  generador: 'Generico',
  observacionGeneral: 'Zapatas del eje A',
  filas: [
    { tipo: 'Fila', observacion: 'zapata 1', largo: 4, ancho: 3, alto: null, piezas: null, valor: 12 },
    { tipo: 'Fila', observacion: 'zapata 2', largo: 4, ancho: 3, alto: null, piezas: null, valor: 12 },
  ],
}

function conMemoriaEnLaSegunda() {
  const p = presupuestoDePrueba()
  p.capitulos[0].items[1] = { ...p.capitulos[0].items[1], tieneMemoria: true, cantidad: 24 }
  return p
}

async function abrirGeneradorDeLaPrimera() {
  const usuario = userEvent.setup()
  render(<App />)
  await screen.findByRole('table', { name: 'Ítems del presupuesto' })
  await usuario.click(screen.getByRole('button', { name: /Medir cantidades de Localización/ }))
  return { usuario, dialogo: await screen.findByRole('dialog', { name: /Generador de cantidades · 1\.01/ }) }
}

describe('Copiar medidas guardadas de otra actividad', { timeout: 15_000 }, () => {
  beforeEach(() => fijarCsrf(null))
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('ofrece las actividades con medidas guardadas y copia sus filas sin guardar nada hasta confirmar', async () => {
    const { llamadas } = instalarApi({
      presupuesto: conMemoriaEnLaSegunda(),
      manejador: (url) => (url === '/api/presupuestos/P-0001/items/1.02/memoria' ? json(MEMORIA_DE_ZAPATAS) : undefined),
    })
    const { usuario, dialogo } = await abrirGeneradorDeLaPrimera()

    const lista = within(dialogo).getByRole('combobox', { name: 'Usar medidas guardadas de otra actividad' })
    expect(within(lista).getByRole('option', { name: /1\.02 · Acero de refuerzo para zapatas/ })).toBeInTheDocument()
    expect(within(lista).queryByRole('option', { name: /1\.01/ })).not.toBeInTheDocument() // no se ofrece a sí misma

    await usuario.selectOptions(lista, '1.02')

    await waitFor(() => expect(within(dialogo).getByText(/Se copiaron 2 filas de la actividad 1\.02/)).toBeInTheDocument())
    expect(within(dialogo).getAllByDisplayValue(/zapata/)).toHaveLength(2)
    expect(within(dialogo).getByText(/Cantidad del ítem: 24/)).toBeInTheDocument()
    expect(llamadas.some((l) => l.metodo === 'PUT')).toBe(false) // copiar no guarda
  })

  it('sin otras actividades con medidas guardadas no muestra la lista', async () => {
    instalarApi()
    const { dialogo } = await abrirGeneradorDeLaPrimera()

    expect(within(dialogo).queryByRole('combobox', { name: 'Usar medidas guardadas de otra actividad' })).not.toBeInTheDocument()
  })
})
