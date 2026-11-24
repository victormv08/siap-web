import { cleanup, configure, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { fijarCsrf } from '../auth/enlace'
import { instalarApi, json, presupuestoDePrueba } from '../test/apiDePrueba'

/** Renombrar y eliminar presupuestos y capítulos desde los menús, con la API simulada. Datos inventados (D-16). */

configure({ asyncUtilTimeout: 8000 })

const BASE = '/api/presupuestos/P-0001'

async function abrirApp() {
  const usuario = userEvent.setup()
  render(<App />)
  await screen.findByRole('table', { name: 'Ítems del presupuesto' })
  const menu = screen.getByRole('navigation', { name: 'Menú principal' })
  return { usuario, menu }
}

describe('CRUD de presupuesto y capítulos desde la web', { timeout: 15_000 }, () => {
  beforeEach(() => fijarCsrf(null))
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('renombra el presupuesto: PUT con el nombre nuevo y la pantalla lo muestra', async () => {
    const { llamadas } = instalarApi({
      manejador: (url, init) =>
        url === BASE && init.method === 'PUT' ? json({ ...presupuestoDePrueba(), nombre: 'Casa de campo' }) : undefined,
    })
    const { usuario, menu } = await abrirApp()

    await usuario.click(within(menu).getByRole('button', { name: 'Archivo' }))
    await usuario.click(await screen.findByRole('menuitem', { name: /Renombrar presupuesto/ }))
    const campo = await screen.findByRole('textbox', { name: /Nombre del presupuesto/ })
    expect(campo).toHaveValue('Obra de prueba')
    await usuario.clear(campo)
    await usuario.type(campo, 'Casa de campo')
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Guardar' }))

    expect(llamadas.find((l) => l.metodo === 'PUT' && l.url === BASE)?.cuerpo).toEqual({ nombre: 'Casa de campo' })
    expect(await screen.findAllByText(/Casa de campo/)).not.toHaveLength(0)
  })

  it('elimina el presupuesto solo tras confirmar: DELETE y vuelve a pedir la lista', async () => {
    const { llamadas } = instalarApi({
      manejador: (url, init) => (url === BASE && init.method === 'DELETE' ? new Response(null, { status: 204 }) : undefined),
    })
    const { usuario, menu } = await abrirApp()

    await usuario.click(within(menu).getByRole('button', { name: 'Archivo' }))
    await usuario.click(await screen.findByRole('menuitem', { name: /Eliminar presupuesto/ }))
    expect(await screen.findByText(/NO se puede deshacer/)).toBeInTheDocument()
    expect(llamadas.some((l) => l.metodo === 'DELETE')).toBe(false) // aún no borra nada

    await usuario.click(screen.getByRole('button', { name: 'Eliminar presupuesto' }))

    await screen.findByText(/Se eliminó «Obra de prueba»/)
    expect(llamadas.some((l) => l.metodo === 'DELETE' && l.url === BASE)).toBe(true)
  })

  it('cancelar la eliminación del presupuesto no borra nada', async () => {
    const { llamadas } = instalarApi()
    const { usuario, menu } = await abrirApp()

    await usuario.click(within(menu).getByRole('button', { name: 'Archivo' }))
    await usuario.click(await screen.findByRole('menuitem', { name: /Eliminar presupuesto/ }))
    await usuario.click(await screen.findByRole('button', { name: 'Cancelar' }))

    expect(llamadas.some((l) => l.metodo === 'DELETE')).toBe(false)
  })

  it('renombrar y eliminar capítulo piden elegir uno primero, y luego actúan sobre el elegido', async () => {
    const { llamadas } = instalarApi({
      manejador: (url, init) => {
        if (url === `${BASE}/capitulos/1` && init.method === 'PUT') return json({ ...presupuestoDePrueba(), capitulos: [{ ...presupuestoDePrueba().capitulos[0], nombre: 'Obras preliminares' }] })
        if (url === `${BASE}/capitulos/1` && init.method === 'DELETE') return json({ ...presupuestoDePrueba(), capitulos: [] })
        return undefined
      },
    })
    const { usuario, menu } = await abrirApp()
    const panel = screen.getByRole('complementary', { name: 'Capítulos' })
    await usuario.click(within(panel).getByRole('button', { name: /Preliminares/ }))

    await usuario.click(within(menu).getByRole('button', { name: 'Editar' }))
    await usuario.click(await screen.findByRole('menuitem', { name: /Renombrar capítulo/ }))
    const campo = await screen.findByRole('textbox', { name: /Nombre del capítulo/ })
    await usuario.clear(campo)
    await usuario.type(campo, 'Obras preliminares')
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Guardar' }))
    expect(llamadas.find((l) => l.metodo === 'PUT' && l.url === `${BASE}/capitulos/1`)?.cuerpo).toEqual({ nombre: 'Obras preliminares' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument()) // el diálogo termina de cerrarse antes de seguir

    await usuario.click(within(menu).getByRole('button', { name: 'Editar' }))
    await usuario.click(await screen.findByRole('menuitem', { name: /Eliminar capítulo/ }))
    expect(await screen.findByText(/Puede recuperarlo con Deshacer/)).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Eliminar capítulo' }))

    await vi.waitFor(() => expect(llamadas.some((l) => l.metodo === 'DELETE' && l.url === `${BASE}/capitulos/1`)).toBe(true))
  })

  it('sin capítulo ni ítem elegido, renombrar y eliminar capítulo están deshabilitados', async () => {
    instalarApi()
    const { usuario, menu } = await abrirApp()

    await usuario.click(within(menu).getByRole('button', { name: 'Editar' }))

    expect(await screen.findByRole('menuitem', { name: /Renombrar capítulo/ })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('menuitem', { name: /Eliminar capítulo/ })).toHaveAttribute('aria-disabled', 'true')
  })
})
