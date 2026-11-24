import { cleanup, configure, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { fijarCsrf } from '../auth/enlace'
import { instalarApi, json, presupuestoDePrueba } from '../test/apiDePrueba'

/** «Medir cantidad» en Agregar ítem: crea el ítem y abre su generador de cantidades. Datos inventados (D-16). */

configure({ asyncUtilTimeout: 8000 })

describe('Agregar ítem y medir su cantidad', { timeout: 15_000 }, () => {
  beforeEach(() => fijarCsrf(null))
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('el botón Medir cantidad agrega el ítem y abre el generador del ítem nuevo', async () => {
    const conNuevo = presupuestoDePrueba()
    conNuevo.capitulos[0].items = [
      ...conNuevo.capitulos[0].items,
      { ...conNuevo.capitulos[0].items[0], codigo: '1.03', descripcion: 'Muro nuevo', cantidad: 0, valorConsiderado: 0, valorCalculado: 0 },
    ]
    const { llamadas } = instalarApi({
      manejador: (url, init) => {
        if (url === '/api/catalogo/capitulos') return json([])
        if (url === '/api/catalogo/actividades')
          return json([{ codigo: 'MAM-01', capitulo: '', descripcion: 'Mampostería en bloque', unidad: 'm2', precioUnitario: 133305 }])
        if (url === '/api/presupuestos/P-0001/capitulos/1/items' && init.method === 'POST') return json(conNuevo)
        return undefined
      },
    })
    const usuario = userEvent.setup()
    render(<App />)
    await screen.findByRole('table', { name: 'Ítems del presupuesto' })
    await usuario.click(screen.getByRole('button', { name: 'Ítem' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Agregar ítem' })
    const medir = within(dialogo).getByRole('button', { name: 'Medir cantidad' })
    expect(medir).toBeDisabled() // sin actividad elegida no se puede

    await waitFor(() => expect(within(dialogo).getByRole('row', { name: /MAM-01/ })).toBeInTheDocument())
    await usuario.click(within(dialogo).getByRole('row', { name: /MAM-01/ }))
    await usuario.click(within(dialogo).getByRole('button', { name: 'Medir cantidad' }))

    expect(await screen.findByRole('dialog', { name: /Generador de cantidades · 1\.03/ })).toBeInTheDocument()
    const post = llamadas.find((l) => l.url === '/api/presupuestos/P-0001/capitulos/1/items')
    expect(post?.cuerpo).toMatchObject({ codigoAnalisis: 'MAM-01', cantidad: 0 })
  })

  it('mientras falte algo, el cuadro dice qué falta en vez de dejar los botones apagados sin explicación', async () => {
    instalarApi({
      manejador: (url) => {
        if (url === '/api/catalogo/capitulos') return json([])
        if (url === '/api/catalogo/actividades')
          return json([{ codigo: 'MAM-01', capitulo: '', descripcion: 'Mampostería en bloque', unidad: 'm2', precioUnitario: 133305 }])
        return undefined
      },
    })
    const usuario = userEvent.setup()
    render(<App />)
    await screen.findByRole('table', { name: 'Ítems del presupuesto' })
    await usuario.click(screen.getByRole('button', { name: 'Ítem' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Agregar ítem' })

    expect(within(dialogo).getByRole('status')).toHaveTextContent('Elija una actividad del catálogo')
    expect(within(dialogo).getByRole('button', { name: 'Medir cantidad' })).toHaveAttribute('title', expect.stringContaining('Elija una actividad'))

    await waitFor(() => expect(within(dialogo).getByRole('row', { name: /MAM-01/ })).toBeInTheDocument())
    await usuario.click(within(dialogo).getByRole('row', { name: /MAM-01/ }))

    expect(within(dialogo).queryByRole('status')).not.toBeInTheDocument()
    expect(within(dialogo).getByRole('button', { name: 'Medir cantidad' })).toBeEnabled()
  })

  it('la unidad se elige de una lista: la actividad del catálogo propone la suya y sin unidad no se puede agregar', async () => {
    instalarApi({
      manejador: (url) => {
        if (url === '/api/catalogo/capitulos') return json([])
        if (url === '/api/catalogo/actividades')
          return json([{ codigo: 'MAM-01', capitulo: '', descripcion: 'Mampostería en bloque', unidad: 'm2', precioUnitario: 133305 }])
        return undefined
      },
    })
    const usuario = userEvent.setup()
    render(<App />)
    await screen.findByRole('table', { name: 'Ítems del presupuesto' })
    await usuario.click(screen.getByRole('button', { name: 'Ítem' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Agregar ítem' })
    const unidad = within(dialogo).getByLabelText('Unidad')
    expect(unidad.tagName).toBe('SELECT')

    await waitFor(() => expect(within(dialogo).getByRole('row', { name: /MAM-01/ })).toBeInTheDocument())
    await usuario.click(within(dialogo).getByRole('row', { name: /MAM-01/ }))
    expect(unidad).toHaveValue('m2')
    expect(within(dialogo).getByRole('button', { name: 'Agregar ítem' })).toBeEnabled()

    await usuario.selectOptions(unidad, '')
    expect(within(dialogo).getByRole('button', { name: 'Agregar ítem' })).toBeDisabled()
    expect(within(dialogo).getByRole('status')).toHaveTextContent('Elija la unidad')
  })
})
