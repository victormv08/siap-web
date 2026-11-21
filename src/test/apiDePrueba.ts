import { vi } from 'vitest'
import type {
  FiguraGeometrica,
  MemoriaRespuesta,
  Presupuesto,
  TablaAcero,
} from '../api/cliente'

/** API simulada con datos inventados (D-16), compartida por las pruebas de la aplicación completa. */

export function json(cuerpo: unknown, estado = 200): Response {
  return new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } })
}

export const SESION = {
  empresa: { codigo: 'EMP-PRUEBA', nombre: 'Empresa de prueba' },
  usuario: { usuario: 'ana', nombre: 'Ana de prueba' },
  csrfToken: 'token-de-prueba',
}

export function presupuestoDePrueba(extra: { tieneMemoria?: boolean } = {}): Presupuesto {
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
            tieneMemoria: extra.tieneMemoria,
          },
          {
            codigo: '1.02',
            descripcion: 'Acero de refuerzo para zapatas',
            unidad: 'kg',
            cantidad: 100,
            codigoAnalisis: 'EST-01',
            precioUnitario: 5000,
            valorCalculado: 500000,
            valorConsiderado: 500000,
            excluido: false,
            motivoExclusion: null,
            explicacion: '100 kg × 5.000 = 500.000',
          },
        ],
      },
    ],
    cierre: [
      { concepto: 'Costos directos', porcentaje: null, monto: 500000, formula: 'Suma de subtotales' },
      { concepto: 'Total del presupuesto', porcentaje: null, monto: 575000, formula: 'Suma' },
    ],
    configuracion: {
      porcentajeAdministracion: 15,
      porcentajeImprevistos: null,
      porcentajeUtilidad: 5,
      porcentajeIvaSobreUtilidad: 19,
    },
    politica: { decimalesValorItem: 0, decimalesParcialAnalisis: 2, decimalesCostoAnalisis: 0, decimalesCierre: 0 },
  }
}

export const FIGURAS: FiguraGeometrica[] = [
  {
    codigo: 'rectangulo',
    nombre: 'Rectángulo',
    resultado: 'S',
    unidad: 'm2',
    formula: 'S = b × h',
    parametros: [
      { codigo: 'b', etiqueta: 'Base (b)' },
      { codigo: 'h', etiqueta: 'Altura (h)' },
    ],
  },
  {
    codigo: 'circulo',
    nombre: 'Círculo',
    resultado: 'S',
    unidad: 'm2',
    formula: 'S = π × r²',
    parametros: [{ codigo: 'r', etiqueta: 'Radio (r)' }],
  },
]

export const ACERO: TablaAcero = {
  fuente: 'Tabla de prueba (inventada)',
  filas: [
    { ref: '#3', pesoKgPorMetro: 0.56 },
    { ref: '#4', pesoKgPorMetro: 0.994 },
  ],
}

export const MEMORIA_VACIA: MemoriaRespuesta = {
  codigoItem: '1.01',
  total: 10,
  generador: 'Generico',
  observacionGeneral: '',
  filas: [],
}

export interface Llamada {
  url: string
  metodo: string
  cuerpo: unknown
}

interface Opciones {
  presupuesto?: Presupuesto
  memoria?: MemoriaRespuesta
  /** Maneja primero lo que la prueba quiera sobrescribir; devuelve undefined para seguir con lo normal. */
  manejador?: (url: string, init: RequestInit) => Response | undefined
}

/** Instala un fetch falso con sesión vigente y las rutas de la aplicación. Devuelve las llamadas hechas. */
export function instalarApi(opciones: Opciones = {}) {
  const llamadas: Llamada[] = []
  const falso = vi.fn(async (entrada: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(entrada)
    llamadas.push({ url, metodo: init.method ?? 'GET', cuerpo: init.body ? JSON.parse(String(init.body)) : undefined })

    const propia = opciones.manejador?.(url, init)
    if (propia) return propia

    if (url === '/api/auth/me') return json(SESION)
    if (url === '/api/presupuestos') return json([{ id: 'P-0001', nombre: 'Obra de prueba', costoDirecto: 500000, total: 575000 }])
    if (url === '/api/presupuestos/P-0001') return json(opciones.presupuesto ?? presupuestoDePrueba())
    if (url.startsWith('/api/presupuestos/P-0001/items/') && url.endsWith('/memoria')) {
      return json({ ...(opciones.memoria ?? MEMORIA_VACIA), codigoItem: url.split('/')[5] })
    }
    if (url === '/api/catalogo/figuras') return json(FIGURAS)
    if (url === '/api/catalogo/acero') return json(ACERO)
    if (url.startsWith('/api/analisis/')) {
      return json({ codigo: 'PRE-01', descripcion: 'Análisis de prueba', unidad: 'm2', costoDirecto: 50000, formula: 'Suma = 50.000', parciales: [] })
    }
    return json({ detail: 'No encontrado' }, 404)
  })
  vi.stubGlobal('fetch', falso)
  return { llamadas, falso }
}
