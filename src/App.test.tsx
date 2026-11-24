import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import type { Presupuesto } from './api/cliente'

/**
 * Pruebas de comportamiento con una API simulada. La web no calcula: estas pruebas comprueban
 * que muestra lo que devuelve la API y que pide las confirmaciones correctas.
 * Los datos son inventados (D-16).
 */

function presupuesto(overrides: Partial<Presupuesto> = {}): Presupuesto {
  return {
    id: 'P-0001',
    nombre: 'Obra de prueba',
    costoDirecto: 500000,
    total: 575000,
    capitulos: [
      {
        codigo: '1',
        nombre: 'Preliminares',
        subtotal: 500000,
        items: [
          {
            codigo: '1.01',
            descripcion: 'Localización y replanteo',
            unidad: 'm2',
            cantidad: 10,
            codigoAnalisis: 'PRE-01',
            precioUnitario: 50000,
            valorCalculado: 500000,
            valorConsiderado: 500000,
            excluido: false,
            motivoExclusion: null,
            explicacion: '10 m2 × 50.000 = 500.000',
          },
          {
            codigo: '1.02',
            descripcion: 'Cerramiento provisional',
            unidad: 'gl',
            cantidad: 2,
            codigoAnalisis: 'PRE-01',
            precioUnitario: 50000,
            valorCalculado: 100000,
            valorConsiderado: 0,
            excluido: true,
            motivoExclusion: 'Por confirmar en plano',
            explicacion: 'Excluido: Por confirmar en plano.',
          },
        ],
      },
    ],
    cierre: [
      { concepto: 'Costos directos', porcentaje: null, monto: 500000, formula: 'Suma de subtotales' },
      { concepto: 'Administración', porcentaje: 15, monto: 75000, formula: '15 % de 500.000' },
      { concepto: 'Total del presupuesto', porcentaje: null, monto: 575000, formula: 'Suma' },
    ],
    configuracion: {
      porcentajeAdministracion: 15,
      porcentajeImprevistos: null,
      porcentajeUtilidad: 5,
      porcentajeIvaSobreUtilidad: 19,
    },
    politica: { decimalesValorItem: 0, decimalesParcialAnalisis: 2, decimalesCostoAnalisis: 0, decimalesCierre: 0 },
    ...overrides,
  }
}

function respuestaJson(cuerpo: unknown, estado = 200): Response {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** Simula la API: devuelve el presupuesto, o el valor que la API calcula tras un cambio. */
function apiSimulada(tras?: (url: string, init: RequestInit) => Response | undefined) {
  const llamadas: { url: string; metodo: string; cuerpo: unknown }[] = []
  const fetchFalso = vi.fn(async (entrada: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(entrada)
    const metodo = init.method ?? 'GET'
    llamadas.push({ url, metodo, cuerpo: init.body ? JSON.parse(String(init.body)) : undefined })

    const personalizada = tras?.(url, init)
    if (personalizada) return personalizada

    // Hay una sesión vigente: estas pruebas son de la aplicación, no de la pantalla de entrada.
    if (url === '/api/auth/me') {
      return respuestaJson({
        empresa: { codigo: 'EMP-PRUEBA', nombre: 'Empresa de prueba' },
        usuario: { usuario: 'ana', nombre: 'Ana de prueba' },
        csrfToken: 'token-de-prueba',
      })
    }
    if (url === '/api/presupuestos' && init?.method === 'POST') return respuestaJson(presupuesto(), 201)
    if (url === '/api/presupuestos') return respuestaJson([{ id: 'P-0001', nombre: 'Obra de prueba', costoDirecto: 500000, total: 575000 }])
    if (url === '/api/presupuestos/P-0001') return respuestaJson(presupuesto())
    if (url.startsWith('/api/analisis/')) {
      return respuestaJson({
        codigo: 'PRE-01',
        descripcion: 'Cerramiento provisional y campamento',
        unidad: 'gl',
        costoDirecto: 50000,
        formula: 'Suma de 2 parciales = 50.000',
        parciales: [
          { descripcion: 'Oficial', tipo: 'ManoDeObra', cantidad: 2, precio: 25000, parcial: 50000, formula: '2 × 25.000 = 50.000' },
        ],
      })
    }
    return respuestaJson({ detail: 'No encontrado' }, 404)
  })
  vi.stubGlobal('fetch', fetchFalso)
  return { fetchFalso, llamadas }
}

describe('SIAP web', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('muestra el presupuesto que devuelve la API, con sus valores tal cual', async () => {
    apiSimulada()
    render(<App />)

    expect(await screen.findByText('Obra de prueba')).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Ítems del presupuesto' })).toBeInTheDocument()
    expect(screen.getByText('Localización y replanteo')).toBeInTheDocument()
    // El total aparece en el árbol y en la barra de estado: basta con que la API lo muestre.
    expect(screen.getAllByText('$ 575.000', { exact: false }).length).toBeGreaterThan(0)
  })

  it('un ítem excluido se ve con su motivo y no suma', async () => {
    apiSimulada()
    render(<App />)

    await screen.findByText('Obra de prueba')
    expect(screen.getByText('Por confirmar en plano')).toBeInTheDocument()
    expect(screen.getByText('no suma')).toBeInTheDocument()
  })

  it('un ítem con memoria de cálculo no se escribe a mano: tocar su cantidad abre el generador', async () => {
    const conMemoria = presupuesto()
    conMemoria.capitulos[0].items[0] = { ...conMemoria.capitulos[0].items[0], tieneMemoria: true }
    const { llamadas } = apiSimulada((url, init) =>
      url === '/api/presupuestos/P-0001' || (url === '/api/presupuestos' && init.method === 'POST') ? respuestaJson(conMemoria) : undefined,
    )
    const usuario = userEvent.setup()
    render(<App />)

    const cantidad = await screen.findByRole('textbox', { name: 'Cantidad del ítem 1.01' })
    expect(cantidad).toHaveAttribute('readonly')
    await usuario.click(cantidad)

    expect(await screen.findByRole('dialog', { name: /Generador de cantidades · 1\.01/ })).toBeInTheDocument()
    expect(llamadas.some((l) => l.metodo === 'PUT' && l.url.endsWith('/items/1.01'))).toBe(false)
  })

  it('excluir un ítem exige un motivo antes de enviar', async () => {
    apiSimulada()
    const usuario = userEvent.setup()
    render(<App />)

    await screen.findByText('Obra de prueba')
    // Se selecciona el ítem y se excluye desde la barra de herramientas, como en la maqueta.
    await usuario.click(screen.getByRole('row', { name: /Localización y replanteo/ }))
    await usuario.click(screen.getByRole('button', { name: 'Excluir' }))

    const dialogo = await screen.findByRole('dialog')
    const confirmar = within(dialogo).getByRole('button', { name: 'Excluir' })
    expect(confirmar).toBeDisabled()

    await usuario.type(within(dialogo).getByRole('textbox'), 'Lo asume el propietario')
    expect(confirmar).toBeEnabled()
  })

  it('una hoja que la API todavía no expone dice que está pendiente y no muestra cifras', async () => {
    apiSimulada()
    const usuario = userEvent.setup()
    render(<App />)

    await screen.findByText('Obra de prueba')
    await usuario.click(screen.getByRole('button', { name: 'Hojas' }))
    // Cantidades ya está conectada a la API; el Gantt sigue pendiente (depende de R-016).
    await usuario.click(await screen.findByRole('menuitem', { name: 'Diagrama de Gantt' }))

    expect(screen.getByText('Esta hoja todavía no está conectada a la API.')).toBeInTheDocument()
  })

  it('el cierre rechaza porcentajes fuera de rango y no llama a la API', async () => {
    const { llamadas } = apiSimulada()
    const usuario = userEvent.setup()
    render(<App />)

    await screen.findByText('Obra de prueba')
    await usuario.click(screen.getByRole('button', { name: 'AIU e IVA' }))

    const administracion = screen.getByRole('textbox', { name: /Administración/ })
    await usuario.clear(administracion)
    await usuario.type(administracion, '150')
    await usuario.click(screen.getByRole('button', { name: 'Guardar cierre' }))

    expect(screen.getByText(/entre 0 y 100/)).toBeInTheDocument()
    expect(llamadas.some((l) => l.metodo === 'PUT' && l.url.endsWith('/cierre'))).toBe(false)
  })
})
