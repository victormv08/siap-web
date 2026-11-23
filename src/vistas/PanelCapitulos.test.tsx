import { cleanup, configure, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { fijarCsrf } from '../auth/enlace'
import { instalarApi, presupuestoDePrueba } from '../test/apiDePrueba'
import type { Presupuesto } from '../api/cliente'

/** Panel «Capítulos» de la izquierda, con la API simulada. Datos inventados (D-16). */

configure({ asyncUtilTimeout: 8000 })

/** El presupuesto de prueba con un segundo capítulo, para ver que el resaltado cambia de uno a otro. */
function conDosCapitulos(): Presupuesto {
  const p = presupuestoDePrueba()
  p.capitulos.push({
    codigo: '2',
    nombre: 'Estructura',
    subtotal: 0,
    items: [
      {
        codigo: '2.01',
        descripcion: 'Concreto en zapatas',
        unidad: 'm3',
        cantidad: 3,
        codigoAnalisis: 'CON-01',
        precioUnitario: 0,
        valorCalculado: 0,
        valorConsiderado: 0,
        excluido: false,
        motivoExclusion: null,
        explicacion: '',
      },
    ],
  })
  return p
}

async function abrirApp() {
  const usuario = userEvent.setup()
  render(<App />)
  await screen.findByRole('table', { name: 'Ítems del presupuesto' })
  return { usuario, panel: screen.getByRole('complementary', { name: 'Capítulos' }) }
}

describe('Panel de capítulos', { timeout: 15_000 }, () => {
  beforeEach(() => fijarCsrf(null))
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('al hacer clic en un capítulo queda marcado en el panel y resaltado en la rejilla, aunque no haya a dónde desplazarse', async () => {
    instalarApi({ presupuesto: conDosCapitulos() })
    const { usuario, panel } = await abrirApp()
    expect(within(panel).getByRole('button', { name: /Estructura/ })).not.toHaveAttribute('aria-current')

    await usuario.click(within(panel).getByRole('button', { name: /Estructura/ }))

    expect(within(panel).getByRole('button', { name: /Estructura/ })).toHaveAttribute('aria-current', 'true')
    expect(document.getElementById('capitulo-2')).toHaveClass('resaltado')
    expect(document.getElementById('capitulo-1')).not.toHaveClass('resaltado')
  })

  it('el resaltado pasa de un capítulo al otro con cada clic', async () => {
    instalarApi({ presupuesto: conDosCapitulos() })
    const { usuario, panel } = await abrirApp()

    await usuario.click(within(panel).getByRole('button', { name: /Estructura/ }))
    await usuario.click(within(panel).getByRole('button', { name: /Preliminares/ }))

    expect(within(panel).getByRole('button', { name: /Preliminares/ })).toHaveAttribute('aria-current', 'true')
    expect(within(panel).getByRole('button', { name: /Estructura/ })).not.toHaveAttribute('aria-current')
  })

  it('al seleccionar un ítem, el resaltado sigue al capítulo de ese ítem y no al elegido antes', async () => {
    instalarApi({ presupuesto: conDosCapitulos() })
    const { usuario, panel } = await abrirApp()
    await usuario.click(within(panel).getByRole('button', { name: /Estructura/ }))

    await usuario.click(await screen.findByText('Localización y replanteo'))

    expect(within(panel).getByRole('button', { name: /Preliminares/ })).toHaveAttribute('aria-current', 'true')
    expect(within(panel).getByRole('button', { name: /Estructura/ })).not.toHaveAttribute('aria-current')
  })

  it('la tarjeta del presupuesto quita el capítulo elegido y vuelve al inicio de la rejilla', async () => {
    instalarApi({ presupuesto: conDosCapitulos() })
    const { usuario, panel } = await abrirApp()
    await usuario.click(within(panel).getByRole('button', { name: /Estructura/ }))
    const alInicio = vi.fn()
    const rejilla = document.querySelector('.siap-rejilla') as HTMLElement
    rejilla.scrollTo = alInicio as unknown as typeof rejilla.scrollTo

    await usuario.click(within(panel).getByRole('button', { name: /Obra de prueba/ }))

    expect(within(panel).getByRole('button', { name: /Estructura/ })).not.toHaveAttribute('aria-current')
    expect(document.getElementById('capitulo-2')).not.toHaveClass('resaltado')
    expect(alInicio).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
  })

  it('al hacer clic en un capítulo la rejilla se desplaza hasta él', async () => {
    instalarApi({ presupuesto: conDosCapitulos() })
    const { usuario, panel } = await abrirApp()
    const desplazar = vi.fn()
    document.getElementById('capitulo-2')!.scrollIntoView = desplazar

    await usuario.click(within(panel).getByRole('button', { name: /Estructura/ }))

    expect(desplazar).toHaveBeenCalledWith({ block: 'start', behavior: 'smooth' })
  })
})
