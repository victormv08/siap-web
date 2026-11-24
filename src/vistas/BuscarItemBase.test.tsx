import { cleanup, configure, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { fijarCsrf } from '../auth/enlace'
import { instalarApi, json } from '../test/apiDePrueba'

/** «Buscar ítem base» (F4): buscar una actividad de la base y agregarla al presupuesto. Datos inventados (D-16). */

configure({ asyncUtilTimeout: 8000 })

const ACTIVIDADES = [
  { codigo: 'MAM-01', capitulo: '3', descripcion: 'Mampostería en bloque de arcilla', unidad: 'm2', precioUnitario: 133305 },
  { codigo: 'CIM-01', capitulo: '2', descripcion: 'Excavación para cimentación', unidad: 'm3', precioUnitario: 45000 },
  { codigo: 'PIN-01', capitulo: '5', descripcion: 'Pintura vinilo en muros', unidad: 'm2', precioUnitario: 18000 },
]

function api() {
  return instalarApi({
    manejador: (url) => {
      if (url === '/api/catalogo/actividades') return json(ACTIVIDADES)
      if (url === '/api/catalogo/capitulos')
        return json([
          { numero: '2', nombre: 'Estructura' },
          { numero: '3', nombre: 'Muros' },
          { numero: '5', nombre: 'Acabados' },
        ])
      return undefined
    },
  })
}

async function abrirBusqueda() {
  const usuario = userEvent.setup()
  render(<App />)
  await screen.findByRole('table', { name: 'Ítems del presupuesto' })
  await usuario.click(screen.getByRole('button', { name: 'Ítem base' }))
  const dialogo = await screen.findByRole('dialog', { name: 'Buscar ítem base' })
  await within(dialogo).findByRole('table', { name: 'Resultados de la búsqueda' })
  return { usuario, dialogo }
}

describe('Buscar ítem base', { timeout: 15_000 }, () => {
  beforeEach(() => fijarCsrf(null))
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('el botón de la barra abre la búsqueda con todas las actividades', async () => {
    api()
    const { dialogo } = await abrirBusqueda()

    expect(within(dialogo).getAllByRole('row')).toHaveLength(1 + ACTIVIDADES.length) // encabezado + 3
    expect(within(dialogo).getByRole('status')).toHaveTextContent('3 actividades')
  })

  it('filtra por varias palabras, sin importar tildes ni mayúsculas, también por capítulo', async () => {
    api()
    const { usuario, dialogo } = await abrirBusqueda()
    const caja = within(dialogo).getByRole('textbox', { name: 'Buscar en la base de actividades' })

    await usuario.type(caja, 'CIMENTACION excavacion')
    expect(within(dialogo).getAllByRole('row')).toHaveLength(2)
    expect(within(dialogo).getByText('Excavación para cimentación')).toBeInTheDocument()

    await usuario.clear(caja)
    await usuario.type(caja, 'acabados') // nombre del capítulo, que no está en la descripción
    expect(within(dialogo).getByText('Pintura vinilo en muros')).toBeInTheDocument()
    expect(within(dialogo).queryByText('Excavación para cimentación')).not.toBeInTheDocument()

    await usuario.clear(caja)
    await usuario.type(caja, 'zzzz')
    expect(within(dialogo).getByRole('status')).toHaveTextContent('Ninguna actividad coincide')
  })

  it('al elegir una actividad se abre Agregar ítem con ella ya puesta (descripción y unidad)', async () => {
    api()
    const { usuario, dialogo } = await abrirBusqueda()

    await usuario.click(within(dialogo).getByRole('row', { name: /MAM-01/ }))

    const agregar = await screen.findByRole('dialog', { name: 'Agregar ítem' })
    await waitFor(() => expect(within(agregar).getByRole('row', { name: /MAM-01/ })).toHaveAttribute('aria-selected', 'true'))
    expect(within(agregar).getByLabelText(/Descripción/)).toHaveValue('Mampostería en bloque de arcilla')
    expect(within(agregar).getByLabelText('Unidad')).toHaveValue('m2')
    expect(within(agregar).getByRole('button', { name: 'Agregar ítem' })).toBeEnabled()
  })

  it('Enter elige la primera coincidencia y F4 abre la búsqueda', async () => {
    api()
    const usuario = userEvent.setup()
    render(<App />)
    await screen.findByRole('table', { name: 'Ítems del presupuesto' })

    await usuario.keyboard('{F4}')
    const dialogo = await screen.findByRole('dialog', { name: 'Buscar ítem base' })
    await within(dialogo).findByRole('table', { name: 'Resultados de la búsqueda' })
    await usuario.type(within(dialogo).getByRole('textbox', { name: 'Buscar en la base de actividades' }), 'pintura{Enter}')

    const agregar = await screen.findByRole('dialog', { name: 'Agregar ítem' })
    await waitFor(() => expect(within(agregar).getByRole('row', { name: /PIN-01/ })).toHaveAttribute('aria-selected', 'true'))
  })

  it('las flechas mueven la fila activa y Enter elige la marcada', async () => {
    api()
    const { usuario, dialogo } = await abrirBusqueda()
    const filas = () => within(dialogo).getAllByRole('row').slice(1)
    expect(filas()[0]).toHaveAttribute('aria-selected', 'true')

    await usuario.click(within(dialogo).getByRole('textbox', { name: 'Buscar en la base de actividades' }))
    await usuario.keyboard('{ArrowDown}{ArrowDown}')
    expect(filas()[2]).toHaveAttribute('aria-selected', 'true')
    await usuario.keyboard('{ArrowUp}')
    expect(filas()[1]).toHaveAttribute('aria-selected', 'true')
    await usuario.keyboard('{Enter}')

    const agregar = await screen.findByRole('dialog', { name: 'Agregar ítem' })
    await waitFor(() => expect(within(agregar).getByRole('row', { name: /CIM-01/ })).toHaveAttribute('aria-selected', 'true'))
  })
})
