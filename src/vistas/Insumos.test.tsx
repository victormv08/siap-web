import { cleanup, configure, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { fijarCsrf } from '../auth/enlace'
import type { InsumoPresupuesto } from '../api/cliente'
import { instalarApi, json, presupuestoDePrueba } from '../test/apiDePrueba'

/** Panel de insumos del presupuesto, con la API simulada. Datos inventados (D-16). */

const URL_INSUMOS = '/api/presupuestos/P-0001/insumos'
const URL_PRECIOS = '/api/presupuestos/P-0001/insumos/precios'

configure({ asyncUtilTimeout: 8000 })

const INSUMOS: InsumoPresupuesto[] = [
  { descripcion: 'Cemento gris (bulto 50 kg)', unidad: 'bulto', tipo: 'Material', precio: 28500, variosPrecios: false, lineas: 2, analisis: 2 },
  { descripcion: 'Arena de río', unidad: 'm3', tipo: 'Material', precio: 60000, variosPrecios: false, lineas: 2, analisis: 2 },
  { descripcion: 'Oficial', unidad: 'día', tipo: 'ManoDeObra', precio: null, variosPrecios: true, lineas: 4, analisis: 4 },
]

type Manejador = NonNullable<Parameters<typeof instalarApi>[0]>['manejador']

function apiConInsumos(extra?: Manejador) {
  return instalarApi({
    manejador: (url, init) => (url === URL_INSUMOS ? json(INSUMOS) : extra?.(url, init)),
  })
}

async function abrirPanel() {
  const usuario = userEvent.setup()
  render(<App />)
  await screen.findByRole('table', { name: 'Ítems del presupuesto' })
  await usuario.click(within(screen.getByRole('toolbar', { name: 'Herramientas' })).getByRole('button', { name: /^Insumos/ }))
  const dialogo = await screen.findByRole('dialog')
  await within(dialogo).findByRole('table', { name: 'Insumos del presupuesto' })
  return { usuario, dialogo }
}

const precioDe = (dialogo: HTMLElement, descripcion: string) => within(dialogo).getByLabelText(new RegExp(`^Precio de ${descripcion}`))

describe('Panel de insumos', { timeout: 15_000 }, () => {
  beforeEach(() => fijarCsrf(null))
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('el botón Insumos abre el panel con cada insumo, su tipo, unidad, en cuántos APU está y su precio', async () => {
    apiConInsumos()
    const { dialogo } = await abrirPanel()

    expect(within(dialogo).getByRole('heading', { name: 'Insumos del presupuesto' })).toBeInTheDocument()
    expect(within(dialogo).getByText('Cemento gris (bulto 50 kg)')).toBeInTheDocument()
    expect(precioDe(dialogo, 'Cemento gris')).toHaveValue('28.500,00')
    expect(within(dialogo).getByRole('button', { name: 'Guardar cambios' })).toBeDisabled()
  })

  it('el menú Insumos tiene «Editar insumos del presupuesto» y abre el mismo panel', async () => {
    apiConInsumos()
    const usuario = userEvent.setup()
    render(<App />)
    await screen.findByRole('table', { name: 'Ítems del presupuesto' })

    await usuario.click(within(screen.getByRole('navigation', { name: 'Menú principal' })).getByRole('button', { name: 'Insumos' }))
    await usuario.click(await screen.findByRole('menuitem', { name: /Editar insumos del presupuesto/ }))

    expect(await screen.findByRole('heading', { name: 'Insumos del presupuesto' })).toBeInTheDocument()
  })

  it('guarda juntos los precios cambiados, sin mandar los que no se tocaron, y muestra el presupuesto que devuelve la API', async () => {
    const recalculado = presupuestoDePrueba()
    recalculado.capitulos[0].items[0].descripcion = 'Descripción recalculada por la API'
    const { llamadas } = apiConInsumos((url, init) => (url === URL_PRECIOS && init.method === 'PUT' ? json(recalculado) : undefined))
    const { usuario, dialogo } = await abrirPanel()

    fireEvent.change(precioDe(dialogo, 'Cemento gris'), { target: { value: '30.000' } })
    fireEvent.change(precioDe(dialogo, 'Arena de río'), { target: { value: '65.500,50' } })
    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar 2 cambios' }))

    await waitFor(() => expect(llamadas.find((l) => l.url === URL_PRECIOS)).toBeDefined())
    expect(llamadas.find((l) => l.url === URL_PRECIOS)!.cuerpo).toEqual({
      cambios: [
        { descripcion: 'Cemento gris (bulto 50 kg)', unidad: 'bulto', tipo: 'Material', precio: 30000 },
        { descripcion: 'Arena de río', unidad: 'm3', tipo: 'Material', precio: 65500.5 },
      ],
    })
    expect(await screen.findByText('Descripción recalculada por la API')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('un precio igual al actual no cuenta como cambio', async () => {
    apiConInsumos()
    const { dialogo } = await abrirPanel()

    fireEvent.change(precioDe(dialogo, 'Cemento gris'), { target: { value: '28500' } })

    expect(within(dialogo).getByRole('button', { name: 'Guardar cambios' })).toBeDisabled()
  })

  it('un texto que no es número se marca y bloquea el guardado', async () => {
    apiConInsumos()
    const { dialogo } = await abrirPanel()

    fireEvent.change(precioDe(dialogo, 'Cemento gris'), { target: { value: 'barato' } })

    expect(precioDe(dialogo, 'Cemento gris')).toHaveAttribute('aria-invalid', 'true')
    expect(within(dialogo).getByText(/1 precio no es un número/)).toBeInTheDocument()
    expect(within(dialogo).getByRole('button', { name: 'Guardar cambios' })).toBeDisabled()
  })

  it('un insumo con precios distintos en varios APU lo avisa y un precio nuevo los iguala', async () => {
    const { llamadas } = apiConInsumos((url, init) => (url === URL_PRECIOS && init.method === 'PUT' ? json(presupuestoDePrueba()) : undefined))
    const { usuario, dialogo } = await abrirPanel()

    const oficial = precioDe(dialogo, 'Oficial')
    expect(oficial).toHaveValue('')
    expect(oficial).toHaveAttribute('placeholder', 'Varios precios')
    fireEvent.change(oficial, { target: { value: '120000' } })
    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar 1 cambio' }))

    await waitFor(() => expect(llamadas.find((l) => l.url === URL_PRECIOS)).toBeDefined())
    expect(llamadas.find((l) => l.url === URL_PRECIOS)!.cuerpo).toEqual({
      cambios: [{ descripcion: 'Oficial', unidad: 'día', tipo: 'ManoDeObra', precio: 120000 }],
    })
  })

  it('se puede buscar un insumo por su nombre', async () => {
    apiConInsumos()
    const { usuario, dialogo } = await abrirPanel()

    await usuario.type(within(dialogo).getByLabelText('Buscar un insumo'), 'arena')

    expect(within(dialogo).getByText('Arena de río')).toBeInTheDocument()
    expect(within(dialogo).queryByText('Cemento gris (bulto 50 kg)')).not.toBeInTheDocument()
  })

  it('si la API rechaza el guardado, muestra su mensaje y el panel sigue abierto con lo escrito', async () => {
    apiConInsumos((url, init) =>
      url === URL_PRECIOS && init.method === 'PUT' ? json({ title: 'Solicitud no válida', detail: 'El precio no puede ser negativo.' }, 400) : undefined,
    )
    const { usuario, dialogo } = await abrirPanel()

    fireEvent.change(precioDe(dialogo, 'Cemento gris'), { target: { value: '30000' } })
    await usuario.click(within(dialogo).getByRole('button', { name: 'Guardar 1 cambio' }))

    expect(await within(dialogo).findByText('El precio no puede ser negativo.')).toBeInTheDocument()
    expect(precioDe(dialogo, 'Cemento gris')).toHaveValue('30000')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
