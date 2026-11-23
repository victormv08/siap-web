import { cleanup, configure, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { fijarCsrf } from '../auth/enlace'
import { instalarApi, json, presupuestoDePrueba } from '../test/apiDePrueba'

/** Agregar ítem con una actividad nueva, con la API simulada. Datos inventados (D-16). */

const URL_ITEMS = '/api/presupuestos/P-0001/capitulos/1/items'

configure({ asyncUtilTimeout: 8000 })

type Manejador = NonNullable<Parameters<typeof instalarApi>[0]>['manejador']

function api(extra?: Manejador) {
  return instalarApi({
    manejador: (url, init) => {
      if (url === '/api/catalogo/capitulos') return json([])
      if (url === '/api/catalogo/actividades') return json([])
      return extra?.(url, init)
    },
  })
}

async function abrirDialogo() {
  const usuario = userEvent.setup()
  render(<App />)
  await screen.findByRole('table', { name: 'Ítems del presupuesto' })
  await usuario.click(screen.getByRole('button', { name: 'Ítem' }))
  const dialogo = await screen.findByRole('dialog', { name: 'Agregar ítem' })
  return { usuario, dialogo }
}

describe('Agregar ítem con una actividad nueva', { timeout: 15_000 }, () => {
  beforeEach(() => fijarCsrf(null))
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('arranca con una actividad del catálogo y deja elegir «Actividad nueva»', async () => {
    api()
    const { usuario, dialogo } = await abrirDialogo()

    expect(within(dialogo).getByRole('radio', { name: 'Del catálogo' })).toBeChecked()
    expect(within(dialogo).getByLabelText('Actividad')).toBeInTheDocument()
    expect(within(dialogo).queryByLabelText('Código de la actividad nueva')).not.toBeInTheDocument()

    await usuario.click(within(dialogo).getByRole('radio', { name: 'Actividad nueva' }))

    expect(within(dialogo).queryByLabelText('Actividad')).not.toBeInTheDocument()
    expect(within(dialogo).getByLabelText('Código de la actividad nueva')).toBeInTheDocument()
    expect(within(dialogo).getByText(/nace/)).toHaveTextContent('sin insumos')
  })

  it('pide descripción y unidad: sin ellas no se puede agregar', async () => {
    api()
    const { usuario, dialogo } = await abrirDialogo()
    await usuario.click(within(dialogo).getByRole('radio', { name: 'Actividad nueva' }))
    const agregar = within(dialogo).getByRole('button', { name: 'Agregar ítem' })
    expect(agregar).toBeDisabled()

    await usuario.type(within(dialogo).getByLabelText(/Descripción/), 'Pintura de muros')
    expect(agregar).toBeDisabled() // falta la unidad

    await usuario.type(within(dialogo).getByLabelText(/Unidad/), 'm2')
    expect(agregar).toBeEnabled()
  })

  it('manda la actividad nueva con el código vacío como null y sin código de catálogo', async () => {
    const { llamadas } = api((url, init) => (url === URL_ITEMS && init.method === 'POST' ? json(presupuestoDePrueba()) : undefined))
    const { usuario, dialogo } = await abrirDialogo()
    await usuario.click(within(dialogo).getByRole('radio', { name: 'Actividad nueva' }))
    await usuario.type(within(dialogo).getByLabelText(/Descripción/), 'Pintura de muros')
    await usuario.type(within(dialogo).getByLabelText(/Unidad/), 'm2')

    await usuario.click(within(dialogo).getByRole('button', { name: 'Agregar ítem' }))

    await waitFor(() => expect(llamadas.find((l) => l.url === URL_ITEMS)).toBeDefined())
    expect(llamadas.find((l) => l.url === URL_ITEMS)!.cuerpo).toEqual({
      descripcion: 'Pintura de muros',
      unidad: 'm2',
      cantidad: 0,
      codigoAnalisis: '',
      nuevaActividad: { codigo: null, descripcion: 'Pintura de muros', unidad: 'm2' },
    })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Agregar ítem' })).not.toBeInTheDocument())
  })

  it('con un código escrito lo manda tal cual, sin espacios sobrantes', async () => {
    const { llamadas } = api((url, init) => (url === URL_ITEMS && init.method === 'POST' ? json(presupuestoDePrueba()) : undefined))
    const { usuario, dialogo } = await abrirDialogo()
    await usuario.click(within(dialogo).getByRole('radio', { name: 'Actividad nueva' }))
    fireEvent.change(within(dialogo).getByLabelText('Código de la actividad nueva'), { target: { value: '  pin-01 ' } })
    await usuario.type(within(dialogo).getByLabelText(/Descripción/), 'Pintura')
    await usuario.type(within(dialogo).getByLabelText(/Unidad/), 'm2')

    await usuario.click(within(dialogo).getByRole('button', { name: 'Agregar ítem' }))

    await waitFor(() => expect(llamadas.find((l) => l.url === URL_ITEMS)).toBeDefined())
    expect((llamadas.find((l) => l.url === URL_ITEMS)!.cuerpo as { nuevaActividad: { codigo: string } }).nuevaActividad.codigo).toBe('pin-01')
  })

  it('si la API rechaza el código, muestra su mensaje y el diálogo sigue abierto', async () => {
    api((url, init) =>
      url === URL_ITEMS && init.method === 'POST'
        ? json({ title: 'Solicitud no válida', detail: 'Ya existe una actividad con el código PIN-01.' }, 400)
        : undefined,
    )
    const { usuario, dialogo } = await abrirDialogo()
    await usuario.click(within(dialogo).getByRole('radio', { name: 'Actividad nueva' }))
    await usuario.type(within(dialogo).getByLabelText('Código de la actividad nueva'), 'PIN-01')
    await usuario.type(within(dialogo).getByLabelText(/Descripción/), 'Pintura')
    await usuario.type(within(dialogo).getByLabelText(/Unidad/), 'm2')

    await usuario.click(within(dialogo).getByRole('button', { name: 'Agregar ítem' }))

    expect(await within(dialogo).findByText('Ya existe una actividad con el código PIN-01.')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Agregar ítem' })).toBeInTheDocument()
  })
})
