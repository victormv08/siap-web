/**
 * Cliente de siap-api. La web NO calcula dinero (D-27, D-51): todo valor monetario llega ya calculado
 * por el núcleo de la API, con su explicación. Aquí solo se transporta y se muestra.
 * Las rutas van con el prefijo /api, que Vite reenvía a la API (vite.config.ts).
 */
import { csrfActual, sesionTerminada } from '../auth/enlace'

export type TipoLinea ='Material' | 'ManoDeObra' | 'Equipo' | 'Transporte' | 'Otro'

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

/** Tipo de fila de la memoria de cantidades (RD-067). Los valores coinciden con la API. */
export type TipoFilaMemoria = 'Fila' | 'Subtitulo' | 'Descuento'

/** Fila tal como la guarda la API. El valor lo calcula el núcleo; la web no lo recalcula. */
export interface FilaMemoriaRespuesta {
  tipo: TipoFilaMemoria
  observacion: string
  largo: number | null
  ancho: number | null
  alto: number | null
  piezas: number | null
  valor: number | null
}

export interface MemoriaRespuesta {
  codigoItem: string
  total: number
  filas: FilaMemoriaRespuesta[]
}

export interface FilaMemoriaSolicitud {
  tipo: TipoFilaMemoria
  observacion: string | null
  largo: number | null
  ancho: number | null
  alto: number | null
  piezas: number | null
}

export interface MemoriaGuardadaRespuesta {
  memoria: MemoriaRespuesta
  presupuesto: Presupuesto
}

/** Línea de un análisis: un insumo con su precio, o un subanálisis (por código). */
export interface LineaAnalisis {
  tipo: 'Insumo' | 'Subanalisis'
  descripcion: string
  unidad: string
  tipoLinea: TipoLinea | null
  codigoAnalisis: string | null
  cantidad: number
  precio: number | null
}

export interface AnalisisEditable {
  codigo: string
  descripcion: string
  unidad: string
  costoDirecto: number
  lineas: LineaAnalisis[]
  parciales: ParcialLinea[]
}

export interface LineaAnalisisSolicitud {
  tipo: 'Insumo' | 'Subanalisis'
  descripcion: string | null
  unidad: string | null
  tipoLinea: TipoLinea | null
  codigoAnalisis: string | null
  cantidad: number
  precio: number
}

export interface EditarAnalisisSolicitud {
  descripcion: string
  unidad: string
  lineas: LineaAnalisisSolicitud[]
}

export interface CategoriaCosto {
  tipo: TipoLinea
  monto: number
  porcentaje: number
}

export interface ResumenDesagregado {
  categorias: CategoriaCosto[]
  total: number
  costoDirecto: number
}

export interface FilaFormulario {
  capitulo: string
  item: string
  codigoAnalisis: string
  descripcion: string
  unidad: string
  cantidad: number
  precioUnitario: number
  valor: number
  excluido: boolean
}

export interface EntradaHistorial {
  cuando: string
  autor: string
  accion: string
  detalle: string
}

export interface CapituloCatalogo {
  numero: string
  nombre: string
}

export interface ActividadCatalogo {
  codigo: string
  capitulo: string
  descripcion: string
  unidad: string
  precioUnitario: number
}

export interface NuevoItemSolicitud {
  descripcion: string
  unidad: string | null
  cantidad: number
  codigoAnalisis: string
}

export interface ActualizarItemSolicitud {
  cantidad: number
  excluido: boolean
  motivoExclusion: string | null
}

async function pedir<T>(ruta: string, init?: RequestInit): Promise<T> {
  // Los cambios (POST, PUT...) llevan el token CSRF de la sesión; las lecturas no lo necesitan.
  const csrf = (init?.method ?? 'GET').toUpperCase() === 'GET' ? null : csrfActual()
  const respuesta = await fetch(`/api${ruta}`, {
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(csrf ? { 'X-CSRF-Token': csrf } : {}) },
    ...init,
  })
  if (respuesta.status === 401) sesionTerminada() // la sesión venció: la web vuelve a la pantalla de entrada
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

  catalogoCapitulos: () => pedir<CapituloCatalogo[]>('/catalogo/capitulos'),

  catalogoActividades: (capitulo: string) =>
    pedir<ActividadCatalogo[]>(`/catalogo/actividades?capitulo=${encodeURIComponent(capitulo)}`),

  agregarItem: (id: string, codigoCapitulo: string, datos: NuevoItemSolicitud) =>
    pedir<Presupuesto>(`/presupuestos/${encodeURIComponent(id)}/capitulos/${encodeURIComponent(codigoCapitulo)}/items`, {
      method: 'POST',
      body: JSON.stringify(datos),
    }),

  analisisDelPresupuesto: (id: string, codigo: string) =>
    pedir<AnalisisEditable>(`/presupuestos/${encodeURIComponent(id)}/analisis/${encodeURIComponent(codigo)}`),

  editarAnalisis: (id: string, codigo: string, datos: EditarAnalisisSolicitud) =>
    pedir<Presupuesto>(`/presupuestos/${encodeURIComponent(id)}/analisis/${encodeURIComponent(codigo)}`, {
      method: 'PUT',
      body: JSON.stringify(datos),
    }),

  resumenDesagregado: (id: string) => pedir<ResumenDesagregado>(`/presupuestos/${encodeURIComponent(id)}/resumen-desagregado`),

  formulario: (id: string) => pedir<FilaFormulario[]>(`/presupuestos/${encodeURIComponent(id)}/formulario`),

  historial: (id: string) => pedir<EntradaHistorial[]>(`/presupuestos/${encodeURIComponent(id)}/historial`),

  agregarCapitulo: (id: string, nombre: string) =>
    pedir<Presupuesto>(`/presupuestos/${encodeURIComponent(id)}/capitulos`, {
      method: 'POST',
      body: JSON.stringify({ nombre }),
    }),

  actualizarCierre: (id: string, cierre: ConfiguracionCierre) =>
    pedir<Presupuesto>(`/presupuestos/${encodeURIComponent(id)}/cierre`, {
      method: 'PUT',
      body: JSON.stringify(cierre),
    }),

  memoria: (id: string, codigoItem: string) =>
    pedir<MemoriaRespuesta>(
      `/presupuestos/${encodeURIComponent(id)}/items/${encodeURIComponent(codigoItem)}/memoria`,
    ),

  guardarMemoria: (id: string, codigoItem: string, filas: FilaMemoriaSolicitud[]) =>
    pedir<MemoriaGuardadaRespuesta>(
      `/presupuestos/${encodeURIComponent(id)}/items/${encodeURIComponent(codigoItem)}/memoria`,
      { method: 'PUT', body: JSON.stringify({ filas }) },
    ),

  analisis: (codigo: string) => pedir<Analisis>(`/analisis/${encodeURIComponent(codigo)}`),
}
