import { cleanup, configure, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { fijarCsrf } from '../auth/enlace'
import { instalarApi, json } from '../test/apiDePrueba'

/** Panel del APU de la actividad seleccionada, con la API simulada. Datos inventados (D-16). */

configure({ asyncUtilTimeout: 8000 })

const ANALISIS = {
  codigo: 'PRE-01',
  descripcion: 'Localización de prueba',
  unidad: 'm2',
  costoDirecto: 50000,
  lineas: [],
  parciales: [{ descripcion: 'Oficial', tipo: 'ManoDeObra', cantidad: 2, precio: 25000, parcial: 50000, formula: '2 × 25.000 = 50.000' }],
}

describe('Panel del APU', { timeout: 15_000 }, () => {
  beforeEach(() => fijarCsrf(null))
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    window.history.replaceState({}, '', '/')
  })

  it('no tiene la columna «Cómo se calcula»: la fórmula se ve al pasar el cursor sobre el parcial', async () => {
    instalarApi({
      manejador: (url) => (url === '/api/presupuestos/P-0001/analisis/PRE-01' ? json(ANALISIS) : undefined),
    })
    // El APU se abre en su propia pestaña (?apu=<presupuesto>&item=<código>), como al pulsar «APU» en la barra.
    window.history.replaceState({}, '', '/?apu=P-0001&item=1.01')
    render(<App />)

    const tabla = await screen.findByRole('table', { name: 'Insumos del análisis PRE-01' })

    for (const columna of ['Insumo', 'Tipo', 'Cantidad', 'Precio', 'Parcial']) {
      expect(within(tabla).getByRole('columnheader', { name: columna })).toBeInTheDocument()
    }
    expect(within(tabla).queryByRole('columnheader', { name: 'Cómo se calcula' })).not.toBeInTheDocument()
    expect(within(tabla).queryByText('2 × 25.000 = 50.000')).not.toBeInTheDocument()
    expect(within(tabla).getByTitle('2 × 25.000 = 50.000')).toHaveTextContent('$ 50.000')
  })
})
