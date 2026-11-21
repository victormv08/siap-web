import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { fijarCsrf } from './auth/enlace'
import { instalarApi } from './test/apiDePrueba'

/** Regreso a Costos directos desde las demás hojas. Datos inventados (D-16). */

const NOMBRE_INICIO = 'Costos directos (inicio)'
const FRANJA = { name: 'Ubicación en el presupuesto' }

async function abrirApp() {
  const usuario = userEvent.setup()
  render(<App />)
  await screen.findByRole('table', { name: 'Ítems del presupuesto' })
  return usuario
}

describe('Regreso a Costos directos', () => {
  beforeEach(() => {
    fijarCsrf(null)
    instalarApi()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('el botón de inicio está siempre y marca la hoja actual con aria-current', async () => {
    const usuario = await abrirApp()
    const inicio = screen.getByRole('button', { name: NOMBRE_INICIO })

    expect(inicio).toHaveAttribute('aria-current', 'page')

    await usuario.click(screen.getByRole('button', { name: 'AIU e IVA' }))

    expect(screen.getByRole('button', { name: NOMBRE_INICIO })).not.toHaveAttribute('aria-current')
  })

  it('la franja de ubicación aparece solo fuera de Costos directos y trae el título de la hoja', async () => {
    const usuario = await abrirApp()
    expect(screen.queryByRole('navigation', FRANJA)).not.toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'AIU e IVA' }))

    const franja = screen.getByRole('navigation', FRANJA)
    expect(within(franja).getByText('Datos generales, AIU e IVA')).toBeInTheDocument()
    expect(within(franja).getByRole('button', { name: 'Volver a Costos directos' })).toBeInTheDocument()
  })

  it('«Volver a Costos directos» regresa y quita la franja', async () => {
    const usuario = await abrirApp()
    await usuario.click(screen.getByRole('button', { name: 'AIU e IVA' }))

    await usuario.click(screen.getByRole('button', { name: 'Volver a Costos directos' }))

    expect(screen.getByRole('table', { name: 'Ítems del presupuesto' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', FRANJA)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: NOMBRE_INICIO })).toHaveAttribute('aria-current', 'page')
  })

  it('el botón de inicio de la barra de herramientas también regresa', async () => {
    const usuario = await abrirApp()
    await usuario.click(screen.getByRole('button', { name: 'AIU e IVA' }))

    await usuario.click(screen.getByRole('button', { name: NOMBRE_INICIO }))

    expect(screen.getByRole('table', { name: 'Ítems del presupuesto' })).toBeInTheDocument()
  })

  it('un clic en la marca SIAP regresa a Costos directos', async () => {
    const usuario = await abrirApp()
    await usuario.click(screen.getByRole('button', { name: 'AIU e IVA' }))

    await usuario.click(screen.getByRole('button', { name: /Ir al inicio/ }))

    expect(screen.getByRole('table', { name: 'Ítems del presupuesto' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', FRANJA)).not.toBeInTheDocument()
  })

  it('Escape sin diálogo abierto regresa a Costos directos', async () => {
    const usuario = await abrirApp()
    await usuario.click(screen.getByRole('button', { name: 'AIU e IVA' }))
    expect(screen.getByRole('navigation', FRANJA)).toBeInTheDocument()

    await usuario.keyboard('{Escape}')

    expect(screen.getByRole('table', { name: 'Ítems del presupuesto' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', FRANJA)).not.toBeInTheDocument()
  })

  it('Escape no se roba cuando un campo está en edición', async () => {
    const usuario = await abrirApp()
    await usuario.click(screen.getByRole('button', { name: 'AIU e IVA' }))
    await usuario.click(screen.getByLabelText(/Imprevistos/))

    await usuario.keyboard('{Escape}')

    expect(screen.getByRole('navigation', FRANJA)).toBeInTheDocument()
  })

  it('con un diálogo abierto, Escape solo cierra el diálogo; el siguiente Escape sí regresa', async () => {
    const usuario = await abrirApp()
    await usuario.click(screen.getByText('Localización y replanteo')) // selecciona la actividad
    await usuario.click(screen.getByRole('button', { name: 'AIU e IVA' }))
    await usuario.keyboard('{F6}')
    const dialogo = await screen.findByRole('dialog', { name: /Generador de cantidades/ })
    await waitFor(() => expect(within(dialogo).getByRole('table')).toBeInTheDocument())

    await usuario.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByRole('navigation', FRANJA)).toBeInTheDocument() // sigue en la misma hoja

    await usuario.keyboard('{Escape}')

    expect(screen.getByRole('table', { name: 'Ítems del presupuesto' })).toBeInTheDocument()
  })

  it('al volver se conserva la actividad seleccionada', async () => {
    const usuario = await abrirApp()
    await usuario.click(screen.getByText('Localización y replanteo'))
    await usuario.click(screen.getByRole('button', { name: 'AIU e IVA' }))

    await usuario.click(screen.getByRole('button', { name: 'Volver a Costos directos' }))

    const fila = screen.getByText('Localización y replanteo').closest('tr')
    expect(fila).toHaveClass('seleccionada')
  })
})
