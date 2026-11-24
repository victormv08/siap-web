import { cleanup, configure, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { fijarCsrf } from '../auth/enlace'
import { instalarApi, json, presupuestoDePrueba } from '../test/apiDePrueba'

/** La hoja «Cantidades»: ver las cantidades de todas las actividades y modificarlas. Datos inventados (D-16). */

configure({ asyncUtilTimeout: 8000 })

async function abrirHoja() {
  const usuario = userEvent.setup()
  render(<App />)
  await screen.findByRole('table', { name: 'Ítems del presupuesto' })
  await usuario.click(screen.getByRole('button', { name: 'Hojas' }))
  await usuario.click(await screen.findByRole('menuitem', { name: 'Cantidades' }))
  return { usuario, tabla: await screen.findByRole('table', { name: 'Cantidades por actividad' }) }
}

describe('Hoja de cantidades', { timeout: 15_000 }, () => {
  beforeEach(() => fijarCsrf(null))
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('lista las cantidades y permite escribir una: Enter la guarda con la API', async () => {
    const { llamadas } = instalarApi({
      manejador: (url, init) => (url === '/api/presupuestos/P-0001/items/1.01' && init.method === 'PUT' ? json(presupuestoDePrueba()) : undefined),
    })
    const { usuario, tabla } = await abrirHoja()
    const celda = within(tabla).getByRole('textbox', { name: 'Cantidad del ítem 1.01' })
    expect(celda).not.toHaveAttribute('readonly')

    await usuario.clear(celda)
    await usuario.type(celda, '25{Enter}')

    expect(llamadas.find((l) => l.metodo === 'PUT' && l.url.endsWith('/items/1.01'))?.cuerpo).toMatchObject({ cantidad: 25 })
  })

  it('una actividad con memoria de cálculo solo se cambia desde el generador', async () => {
    const conMemoria = presupuestoDePrueba({ tieneMemoria: true })
    instalarApi({ presupuesto: conMemoria })
    const { usuario, tabla } = await abrirHoja()
    const celda = within(tabla).getByRole('textbox', { name: 'Cantidad del ítem 1.01' })
    expect(celda).toHaveAttribute('readonly')

    await usuario.click(celda)

    expect(await screen.findByRole('dialog', { name: /Generador de cantidades · 1\.01/ })).toBeInTheDocument()
  })

  it('el botón Medir de cada fila abre el generador de esa actividad', async () => {
    instalarApi()
    const { usuario, tabla } = await abrirHoja()

    await usuario.click(within(tabla).getByRole('button', { name: /Medir cantidades de Localización/ }))

    expect(await screen.findByRole('dialog', { name: /Generador de cantidades · 1\.01/ })).toBeInTheDocument()
  })
})
