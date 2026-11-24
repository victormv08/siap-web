import { cleanup, configure, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { fijarCsrf } from '../auth/enlace'
import { instalarApi, json, presupuestoDePrueba } from '../test/apiDePrueba'

/** La cantidad se puede escribir a mano en la tabla o medir en el generador y guardar las medidas. Datos inventados (D-16). */

configure({ asyncUtilTimeout: 8000 })

const ITEM = '/api/presupuestos/P-0001/items/1.01'

async function abrirApp() {
  const usuario = userEvent.setup()
  render(<App />)
  await screen.findByRole('table', { name: 'Ítems del presupuesto' })
  return usuario
}

describe('Cantidad escrita a mano o medida', { timeout: 15_000 }, () => {
  beforeEach(() => fijarCsrf(null))
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('escribir la cantidad en la celda y pulsar Enter la guarda con la API', async () => {
    const { llamadas } = instalarApi({ manejador: (url, init) => (url === ITEM && init.method === 'PUT' ? json(presupuestoDePrueba()) : undefined) })
    const usuario = await abrirApp()
    const celda = screen.getByRole('textbox', { name: 'Cantidad del ítem 1.01' })
    expect(celda).not.toHaveAttribute('readonly')

    await usuario.clear(celda)
    await usuario.type(celda, '12,5{Enter}')

    const put = llamadas.find((l) => l.metodo === 'PUT' && l.url === ITEM)
    expect(put?.cuerpo).toMatchObject({ cantidad: 12.5, excluido: false })
  })

  it('Escape o un valor inválido no guardan nada, y no se abre el generador al escribir', async () => {
    const { llamadas } = instalarApi()
    const usuario = await abrirApp()
    const celda = screen.getByRole('textbox', { name: 'Cantidad del ítem 1.01' })

    await usuario.clear(celda)
    await usuario.type(celda, '99{Escape}')
    await usuario.clear(celda)
    await usuario.type(celda, 'abc{Enter}')
    await usuario.clear(celda)
    await usuario.type(celda, '-3{Enter}')

    expect(llamadas.some((l) => l.metodo === 'PUT')).toBe(false)
    expect(screen.queryByRole('dialog', { name: /Generador de cantidades/ })).not.toBeInTheDocument()
  })

  it('la regla del ítem sigue abriendo el generador para medir y guardar las medidas', async () => {
    instalarApi()
    const usuario = await abrirApp()

    await usuario.click(screen.getByRole('button', { name: /Medir cantidades de Localización/ }))

    expect(await screen.findByRole('dialog', { name: /Generador de cantidades/ })).toBeInTheDocument()
  })
})
