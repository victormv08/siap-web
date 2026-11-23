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
  /** La cantidad sale de una memoria de cálculo. Opcional: solo lo manda una API que lo informe. */
  tieneMemoria?: boolean
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
  /** Si hay un cambio que deshacer o rehacer. Opcional: solo lo manda una API que lo informe. */
  puedeDeshacer?: boolean
  puedeRehacer?: boolean
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
  // Campos del generador completo (RD-067, R-017). Opcionales: una API anterior no los manda.
  nivel?: string
  eje?: string
  tramo?: string
  clasificador?: string
  /** Código de la figura geométrica de la fila, o null si no usa figura. */
  figura?: string | null
  parametros?: Record<string, number> | null
  // Acero de refuerzo.
  esquema?: string
  ref?: string
  longitud?: number | null
  barras?: number | null
  /** Peso kg/m de la tabla de acero: lo devuelve la API, la web no lo escribe. */
  peso?: number | null
}

/** Tipo de generador de cantidades (RD-067): medidas genéricas o acero de refuerzo (R-017). */
export type GeneradorMemoria = 'Generico' | 'Acero'

export interface MemoriaRespuesta {
  codigoItem: string
  total: number
  generador?: GeneradorMemoria
  observacionGeneral?: string
  filas: FilaMemoriaRespuesta[]
}

export interface FilaMemoriaSolicitud {
  tipo: TipoFilaMemoria
  observacion: string | null
  largo: number | null
  ancho: number | null
  alto: number | null
  piezas: number | null
  nivel?: string | null
  eje?: string | null
  tramo?: string | null
  clasificador?: string | null
  figura?: string | null
  parametros?: Record<string, number> | null
  esquema?: string | null
  ref?: string | null
  longitud?: number | null
  barras?: number | null
}

/** Cuerpo del PUT de la memoria completa: tipo de generador, observación general y todas las filas. */
export interface GuardarMemoriaSolicitud {
  generador: GeneradorMemoria
  observacionGeneral: string
  filas: FilaMemoriaSolicitud[]
}

export interface ParametroFigura {
  codigo: string
  etiqueta: string
}

/** Figura geométrica del generador (GEOMETRIA_GENERADOR): área (S) o volumen (V) a partir de medidas. */
export interface FiguraGeometrica {
  codigo: string
  nombre: string
  resultado: 'S' | 'V'
  unidad: 'm2' | 'm3'
  formula: string
  parametros: ParametroFigura[]
}

export interface ResultadoFigura {
  resultado: number
  unidad: string
  /** Fórmula con los valores sustituidos, calculada por la API. */
  formula: string
}

export interface FilaTablaAcero {
  ref: string
  pesoKgPorMetro: number
}

export interface TablaAcero {
  fuente: string
  filas: FilaTablaAcero[]
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

/** Actividad que nace junto con el ítem, solo en este presupuesto. Sin código, la API le asigna uno (NUEVA-01…). */
export interface NuevaActividadSolicitud {
  codigo: string | null
  descripcion: string
  unidad: string
}

export interface NuevoItemSolicitud {
  descripcion: string
  unidad: string | null
  cantidad: number
  /** Código de una actividad del catálogo. Con `nuevaActividad` va vacío. */
  codigoAnalisis: string
  nuevaActividad?: NuevaActividadSolicitud
}

/** Una fila pegada desde Excel. Sin precio: la API lo toma del catálogo. */
export interface FilaImportadaSolicitud {
  capitulo: string
  codigoAnalisis: string
  descripcion: string | null
  unidad: string | null
  cantidad: number
}

/** Un insumo de los análisis del presupuesto. Si sus líneas traen precios distintos, el precio es null. */
export interface InsumoPresupuesto {
  descripcion: string
  unidad: string
  tipo: TipoLinea
  precio: number | null
  variosPrecios: boolean
  /** Cuántas líneas de análisis lo usan y en cuántos análisis (APU) distintos. */
  lineas: number
  analisis: number
}

/** Precio nuevo de un insumo, identificado por descripción, unidad y tipo. */
export interface CambioPrecioInsumo {
  descripcion: string
  unidad: string
  tipo: TipoLinea
  precio: number
}

/** Una fila que la API no aceptó: su número (1 es la primera enviada) y el motivo. */
export interface ErrorDeFila {
  fila: number
  motivo: string
}

/** Error de la API que, cuando son filas pegadas, trae el motivo de cada fila rechazada. */
export class ErrorDeImportacion extends Error {
  readonly errores: ErrorDeFila[]

  constructor(mensaje: string, errores: ErrorDeFila[]) {
    super(mensaje)
    this.errores = errores
  }
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
      const problema = (await respuesta.json()) as { detail?: string; title?: string; errores?: ErrorDeFila[] }
      mensaje = problema.detail ?? problema.title ?? mensaje
      if (Array.isArray(problema.errores)) throw new ErrorDeImportacion(mensaje, problema.errores)
    } catch (ex) {
      if (ex instanceof ErrorDeImportacion) throw ex
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

  /** Sin capítulo trae todas las actividades (las de la base y, mientras no haya base, las de demostración). */
  catalogoActividades: (capitulo?: string) =>
    pedir<ActividadCatalogo[]>(capitulo ? `/catalogo/actividades?capitulo=${encodeURIComponent(capitulo)}` : '/catalogo/actividades'),

  agregarItem: (id: string, codigoCapitulo: string, datos: NuevoItemSolicitud) =>
    pedir<Presupuesto>(`/presupuestos/${encodeURIComponent(id)}/capitulos/${encodeURIComponent(codigoCapitulo)}/items`, {
      method: 'POST',
      body: JSON.stringify(datos),
    }),

  /** Agrega varias filas pegadas desde Excel: todo o nada. Si alguna falla, lanza ErrorDeImportacion con el motivo de cada fila. */
  importarFilas: (id: string, filas: FilaImportadaSolicitud[]) =>
    pedir<Presupuesto>(`/presupuestos/${encodeURIComponent(id)}/filas`, {
      method: 'POST',
      body: JSON.stringify({ filas }),
    }),

  /** Los insumos que usan los análisis del presupuesto, con su precio. */
  insumos: (id: string) => pedir<InsumoPresupuesto[]>(`/presupuestos/${encodeURIComponent(id)}/insumos`),

  /** Cambia el precio de varios insumos de una vez, solo en este presupuesto. La API recalcula y devuelve el presupuesto. */
  actualizarPreciosInsumos: (id: string, cambios: CambioPrecioInsumo[]) =>
    pedir<Presupuesto>(`/presupuestos/${encodeURIComponent(id)}/insumos/precios`, {
      method: 'PUT',
      body: JSON.stringify({ cambios }),
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

  eliminarItem: (id: string, codigoItem: string) =>
    pedir<Presupuesto>(`/presupuestos/${encodeURIComponent(id)}/items/${encodeURIComponent(codigoItem)}`, { method: 'DELETE' }),

  deshacer: (id: string) => pedir<Presupuesto>(`/presupuestos/${encodeURIComponent(id)}/deshacer`, { method: 'POST' }),

  rehacer: (id: string) => pedir<Presupuesto>(`/presupuestos/${encodeURIComponent(id)}/rehacer`, { method: 'POST' }),

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

  /** PUT de la memoria completa (generador, observación general y filas). */
  guardarMemoriaCompleta: (id: string, codigoItem: string, cuerpo: GuardarMemoriaSolicitud) =>
    pedir<MemoriaGuardadaRespuesta>(
      `/presupuestos/${encodeURIComponent(id)}/items/${encodeURIComponent(codigoItem)}/memoria`,
      { method: 'PUT', body: JSON.stringify(cuerpo) },
    ),

  figuras: () => pedir<FiguraGeometrica[]>('/catalogo/figuras'),

  calcularFigura: (codigo: string, parametros: Record<string, number>) =>
    pedir<ResultadoFigura>(`/catalogo/figuras/${encodeURIComponent(codigo)}/calcular`, {
      method: 'POST',
      body: JSON.stringify({ parametros }),
    }),

  acero: () => pedir<TablaAcero>('/catalogo/acero'),

  analisis: (codigo: string) => pedir<Analisis>(`/analisis/${encodeURIComponent(codigo)}`),
}
