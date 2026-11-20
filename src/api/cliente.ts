/**
 * Cliente de siap-api. La web NO calcula dinero (D-27, D-51): todo valor monetario llega ya calculado
 * por el núcleo de la API, con su explicación. Aquí solo se transporta y se muestra.
 * Las rutas van con el prefijo /api, que Vite reenvía a la API (vite.config.ts).
 */

export type TipoLinea = 'Material' | 'ManoDeObra' | 'Equipo' | 'Transporte' | 'Otro'

export interface ItemResultado {
  codigo: string
  descripcion: string
  unidad: string
  cantidad: number
  codigoAnalisis: string
  precioUnitario: number
  valorCalculado: number
  valorConsiderado: number
  excluido: boolean
  motivoExclusion: string | null
  explicacion: string
}

export interface CapituloResultado {
  codigo: string
  nombre: string
  subtotal: number
  items: ItemResultado[]
}

export interface LineaCierre {
  concepto: string
  porcentaje: number | null
  monto: number
  formula: string
}

export interface ConfiguracionCierre {
  porcentajeAdministracion: number
  porcentajeImprevistos: number | null
  porcentajeUtilidad: number
  porcentajeIvaSobreUtilidad: number
}

export interface Presupuesto {
  id: string
  nombre: string
  costoDirecto: number
  total: number
  capitulos: CapituloResultado[]
  cierre: LineaCierre[]
  configuracion: ConfiguracionCierre
  politica: {
    decimalesValorItem: number
    decimalesParcialAnalisis: number
    decimalesCostoAnalisis: number
    decimalesCierre: number
  }
}

export interface ResumenPresupuesto {
  id: string
  nombre: string
  costoDirecto: number
  total: number
}

export interface ParcialLinea {
  descripcion: string
  tipo: TipoLinea | null
  cantidad: number
  precio: number
  parcial: number
  formula: string
}

export interface Analisis {
  codigo: string
  descripcion: string
  unidad: string
  costoDirecto: number
  formula: string
  parciales: ParcialLinea[]
}

export interface ActualizarItemSolicitud {
  cantidad: number
  excluido: boolean
  motivoExclusion: string | null
}

async function pedir<T>(ruta: string, init?: RequestInit): Promise<T> {
  const respuesta = await fetch(`/api${ruta}`, {
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    ...init,
  })
  if (!respuesta.ok) {
    // La API responde con «problem details» en español (RFC 9457): mostramos su detalle.
    let mensaje = `La API respondió ${respuesta.status}.`
    try {
      const problema = (await respuesta.json()) as { detail?: string; title?: string }
      mensaje = problema.detail ?? problema.title ?? mensaje
    } catch {
      // Sin cuerpo JSON: queda el mensaje genérico.
    }
    throw new Error(mensaje)
  }
  return (await respuesta.json()) as T
}

export const api = {
  listar: () => pedir<ResumenPresupuesto[]>('/presupuestos'),

  obtener: (id: string) => pedir<Presupuesto>(`/presupuestos/${encodeURIComponent(id)}`),

  crear: (nombre: string) =>
    pedir<Presupuesto>('/presupuestos', { method: 'POST', body: JSON.stringify({ nombre }) }),

  actualizarItem: (id: string, codigoItem: string, cambio: ActualizarItemSolicitud) =>
    pedir<Presupuesto>(`/presupuestos/${encodeURIComponent(id)}/items/${encodeURIComponent(codigoItem)}`, {
      method: 'PUT',
      body: JSON.stringify(cambio),
    }),

  actualizarCierre: (id: string, cierre: ConfiguracionCierre) =>
    pedir<Presupuesto>(`/presupuestos/${encodeURIComponent(id)}/cierre`, {
      method: 'PUT',
      body: JSON.stringify(cierre),
    }),

  analisis: (codigo: string) => pedir<Analisis>(`/analisis/${encodeURIComponent(codigo)}`),
}
