import { useEffect, useRef, useState } from 'react'
import type { ClipboardEvent, KeyboardEvent } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Input,
  MessageBar,
  MessageBarBody,
  Spinner,
  Text,
} from '@fluentui/react-components'
import { api } from '../api/cliente'
import type {
  FiguraGeometrica,
  FilaMemoriaSolicitud,
  GeneradorMemoria,
  MemoriaRespuesta,
  Presupuesto,
  TablaAcero,
  TipoFilaMemoria,
} from '../api/cliente'
import { decimales, pesoKgPorMetro } from '../formato'
import { DialogoFiguras } from './DialogoFiguras'
import { COLUMNAS_PEGADO, esPegadoDeTabla, filasDePegado } from './pegadoMemoria'

interface Props {
  presupuestoId: string
  codigoItem: string
  descripcion: string
  unidad: string
  onCerrar: () => void
  /** Se llama tras guardar con el presupuesto recalculado y si la actividad quedó con memoria. */
  onGuardado: (presupuesto: Presupuesto, conMemoria: boolean) => void
}

/** Fila en edición. Los números se guardan como texto para no perder lo que la persona escribe a medias. */
interface Borrador {
  tipo: TipoFilaMemoria
  observacion: string
  nivel: string
  eje: string
  tramo: string
  clasificador: string
  largo: string
  ancho: string
  alto: string
  piezas: string
  /** Figura geométrica de la fila (código) y sus medidas; con figura, largo/ancho/alto no se usan. */
  figura: string | null
  parametros: Record<string, number> | null
  // Acero de refuerzo.
  esquema: string
  ref: string
  longitud: string
  barras: string
  /** Peso kg/m que devolvió la API: solo lectura. */
  peso: number | null
  valorGuardado: number | null
}

type CampoTexto = 'observacion' | 'nivel' | 'eje' | 'tramo' | 'clasificador' | 'esquema'
type CampoNumero = 'largo' | 'ancho' | 'alto' | 'piezas' | 'longitud' | 'barras'

const TIPOS: { valor: TipoFilaMemoria; etiqueta: string }[] = [
  { valor: 'Fila', etiqueta: 'Medida' },
  { valor: 'Descuento', etiqueta: 'Descuento' },
  { valor: 'Subtitulo', etiqueta: 'Subtítulo' },
]

const GENERADORES: { valor: GeneradorMemoria; etiqueta: string }[] = [
  { valor: 'Generico', etiqueta: 'Genérico' },
  { valor: 'Acero', etiqueta: 'Acero de refuerzo' },
]

const FILA_VACIA: Borrador = {
  tipo: 'Fila',
  observacion: '',
  nivel: '',
  eje: '',
  tramo: '',
  clasificador: '',
  largo: '',
  ancho: '',
  alto: '',
  piezas: '',
  figura: null,
  parametros: null,
  esquema: '',
  ref: '',
  longitud: '',
  barras: '',
  peso: null,
  valorGuardado: null,
}

/** Convierte lo que escribe la persona («12,5» o «12.5») en un número. Es entrada, no cálculo. */
function leerNumero(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.')
  if (limpio === '') return null
  const valor = Number(limpio)
  return Number.isFinite(valor) ? valor : null
}

function textoONulo(texto: string): string | null {
  const limpio = texto.trim()
  return limpio === '' ? null : limpio
}

function numeroATexto(n: number | null | undefined): string {
  return n === null || n === undefined ? '' : String(n)
}

/** Un kg se abre en Acero de refuerzo; cualquier otra unidad, en Genérico. */
function generadorPorUnidad(unidad: string): GeneradorMemoria {
  return unidad.trim().toLowerCase() === 'kg' ? 'Acero' : 'Generico'
}

function aBorrador(memoria: MemoriaRespuesta): Borrador[] {
  return memoria.filas.map((f) => ({
    tipo: f.tipo,
    observacion: f.observacion,
    nivel: f.nivel ?? '',
    eje: f.eje ?? '',
    tramo: f.tramo ?? '',
    clasificador: f.clasificador ?? '',
    largo: numeroATexto(f.largo),
    ancho: numeroATexto(f.ancho),
    alto: numeroATexto(f.alto),
    piezas: numeroATexto(f.piezas),
    figura: f.figura ?? null,
    parametros: f.parametros ?? null,
    esquema: f.esquema ?? '',
    ref: f.ref ?? '',
    longitud: numeroATexto(f.longitud),
    barras: numeroATexto(f.barras),
    peso: f.peso ?? null,
    valorGuardado: f.valor,
  }))
}

/** Lo que se envía al guardar: solo los campos del tipo de generador elegido; el resto va vacío. */
function aSolicitud(f: Borrador, generador: GeneradorMemoria): FilaMemoriaSolicitud {
  const comunes = {
    observacion: textoONulo(f.observacion),
    nivel: textoONulo(f.nivel),
    eje: textoONulo(f.eje),
  }
  if (generador === 'Acero') {
    return {
      tipo: 'Fila',
      ...comunes,
      tramo: null,
      clasificador: null,
      largo: null,
      ancho: null,
      alto: null,
      piezas: leerNumero(f.piezas),
      figura: null,
      parametros: null,
      esquema: textoONulo(f.esquema),
      ref: textoONulo(f.ref),
      longitud: leerNumero(f.longitud),
      barras: leerNumero(f.barras),
    }
  }
  const sinCantidad = f.tipo === 'Subtitulo'
  const conFigura = f.figura !== null && !sinCantidad
  return {
    tipo: f.tipo,
    ...comunes,
    tramo: textoONulo(f.tramo),
    clasificador: textoONulo(f.clasificador),
    largo: sinCantidad || conFigura ? null : leerNumero(f.largo),
    ancho: sinCantidad || conFigura ? null : leerNumero(f.ancho),
    alto: sinCantidad || conFigura ? null : leerNumero(f.alto),
    piezas: sinCantidad ? null : leerNumero(f.piezas),
    figura: conFigura ? f.figura : null,
    parametros: conFigura ? f.parametros : null,
    esquema: null,
    ref: null,
    longitud: null,
    barras: null,
  }
}

function mensajeDe(ex: unknown, respaldo: string): string {
  return ex instanceof Error && ex.message ? ex.message : respaldo
}

/**
 * Generador de cantidades de una actividad (RD-067, R-017). La web solo recoge las medidas; la cantidad,
 * el valor de cada fila y el peso del acero los calcula y devuelve la API al guardar (D-27).
 * Tiene dos tipos de generador (genérico y acero de refuerzo), figuras geométricas y pegado desde Excel.
 */
export function MedidorCantidades({ presupuestoId, codigoItem, descripcion, unidad, onCerrar, onGuardado }: Props) {
  const [generador, setGenerador] = useState<GeneradorMemoria>(generadorPorUnidad(unidad))
  const [observacionGeneral, setObservacionGeneral] = useState('')
  const [filas, setFilas] = useState<Borrador[]>([])
  const [total, setTotal] = useState<number | null>(null)
  // El diálogo se monta al abrirse: arranca cargando y sin error, sin reiniciarlos en el efecto.
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [avisoPegado, setAvisoPegado] = useState<string | null>(null)

  const [figuras, setFiguras] = useState<FiguraGeometrica[]>([])
  const [errorFiguras, setErrorFiguras] = useState<string | null>(null)
  const [acero, setAcero] = useState<TablaAcero | null>(null)
  const [errorAcero, setErrorAcero] = useState<string | null>(null)
  const [filaConFigura, setFilaConFigura] = useState<number | null>(null)

  const refTabla = useRef<HTMLTableElement>(null)
  const focoPendiente = useRef<{ fila: number; columna: string } | null>(null)

  useEffect(() => {
    let vigente = true
    api
      .memoria(presupuestoId, codigoItem)
      .then((memoria) => {
        if (!vigente) return
        setFilas(memoria.filas.length > 0 ? aBorrador(memoria) : [{ ...FILA_VACIA }])
        setTotal(memoria.total)
        setObservacionGeneral(memoria.observacionGeneral ?? '')
        // Con filas guardadas manda el generador guardado; sin filas, la unidad de la actividad.
        if (memoria.filas.length > 0 && memoria.generador) setGenerador(memoria.generador)
      })
      .catch((ex: unknown) => {
        if (vigente) setError(mensajeDe(ex, 'No se pudo cargar la memoria de cantidades.'))
      })
      .finally(() => {
        if (vigente) setCargando(false)
      })
    // Catálogos de apoyo: si fallan, el generador sigue sirviendo para lo que no los necesita.
    api
      .figuras()
      .then((lista) => vigente && setFiguras(lista))
      .catch((ex: unknown) => vigente && setErrorFiguras(mensajeDe(ex, 'No se pudo cargar la lista de figuras.')))
    api
      .acero()
      .then((tabla) => vigente && setAcero(tabla))
      .catch((ex: unknown) => vigente && setErrorAcero(mensajeDe(ex, 'No se pudo cargar la tabla de acero.')))
    return () => {
      vigente = false
    }
  }, [presupuestoId, codigoItem])

  // Tras agregar una fila con Enter, el foco pasa a la misma columna de la fila nueva.
  useEffect(() => {
    const pendiente = focoPendiente.current
    if (!pendiente) return
    focoPendiente.current = null
    refTabla.current?.querySelector<HTMLElement>(`[data-fila="${pendiente.fila}"][data-col="${pendiente.columna}"]`)?.focus()
  }, [filas.length])

  const esAcero = generador === 'Acero'
  const columnas = COLUMNAS_PEGADO[generador]
  const unidadTotal = esAcero ? 'kg' : unidad

  function cambiar<K extends keyof Borrador>(indice: number, campo: K, valor: Borrador[K]) {
    setFilas((actuales) => actuales.map((f, i) => (i === indice ? { ...f, [campo]: valor } : f)))
  }

  function quitar(indice: number) {
    setFilas((actuales) => actuales.filter((_, i) => i !== indice))
  }

  function agregar() {
    setFilas((actuales) => [...actuales, { ...FILA_VACIA }])
  }

  /** Enter y las flechas pasan a la misma columna de otra fila, como en una hoja de cálculo. */
  function alTeclear(evento: KeyboardEvent<HTMLElement>, fila: number, columna: string) {
    const baja = evento.key === 'Enter' || evento.key === 'ArrowDown'
    const sube = evento.key === 'ArrowUp'
    if (!baja && !sube) return
    if (evento.target instanceof HTMLSelectElement) return // las flechas cambian la opción de un selector
    evento.preventDefault()
    const destino = fila + (baja ? 1 : -1)
    if (destino < 0) return
    if (destino >= filas.length) {
      if (evento.key !== 'Enter') return
      focoPendiente.current = { fila: destino, columna }
      agregar()
      return
    }
    refTabla.current?.querySelector<HTMLElement>(`[data-fila="${destino}"][data-col="${columna}"]`)?.focus()
  }

  /** Pegar varias celdas desde Excel agrega una fila por línea en las columnas numéricas. */
  function alPegar(evento: ClipboardEvent<HTMLElement>) {
    const texto = evento.clipboardData.getData('text')
    if (!esPegadoDeTabla(texto)) return // un solo valor se pega normal, en la celda
    evento.preventDefault()
    const nuevas = filasDePegado(texto, generador)
    if (nuevas.length === 0) {
      setAvisoPegado('No se encontraron números en lo pegado.')
      return
    }
    setFilas((actuales) => {
      const ultima = actuales[actuales.length - 1]
      const vacia = ultima && JSON.stringify(ultima) === JSON.stringify(FILA_VACIA)
      const base = vacia ? actuales.slice(0, -1) : actuales
      const agregadas = nuevas.map((celdas) => {
        const fila: Borrador = { ...FILA_VACIA }
        columnas.forEach((campo, k) => {
          fila[campo] = celdas[k] ?? ''
        })
        return fila
      })
      return [...base, ...agregadas]
    })
    setAvisoPegado(`Se agregaron ${nuevas.length} fila${nuevas.length === 1 ? '' : 's'} desde lo pegado.`)
  }

  async function guardar() {
    setGuardando(true)
    setError(null)
    try {
      const guardada = await api.guardarMemoriaCompleta(presupuestoId, codigoItem, {
        generador,
        observacionGeneral: observacionGeneral.trim(),
        filas: filas.map((f) => aSolicitud(f, generador)),
      })
      setTotal(guardada.memoria.total)
      setFilas(aBorrador(guardada.memoria))
      onGuardado(guardada.presupuesto, guardada.memoria.filas.length > 0)
      onCerrar()
    } catch (ex) {
      setError(mensajeDe(ex, 'La API no pudo guardar la memoria.'))
    } finally {
      setGuardando(false)
    }
  }

  function usarFigura(indice: number, figura: string, parametros: Record<string, number>) {
    setFilas((actuales) =>
      actuales.map((f, i) => (i === indice ? { ...f, figura, parametros, largo: '', ancho: '', alto: '' } : f)),
    )
    setFilaConFigura(null)
  }

  function nombreDeFigura(codigo: string): string {
    return figuras.find((f) => f.codigo === codigo)?.nombre ?? codigo
  }

  function pesoMostrado(f: Borrador): number | null {
    // El peso lo devuelve la API; mientras no se guarda, se muestra el de la tabla de acero que ella entrega.
    return f.peso ?? acero?.filas.find((r) => r.ref === f.ref)?.pesoKgPorMetro ?? null
  }

  /** Celda de texto o de número de la tabla de entrada, con navegación por teclado. */
  function celda(i: number, campo: CampoTexto | CampoNumero, etiqueta: string, opciones: { deshabilitada?: boolean; marcador?: string } = {}) {
    const esNumero = campo === 'largo' || campo === 'ancho' || campo === 'alto' || campo === 'piezas' || campo === 'longitud' || campo === 'barras'
    return (
      <input
        aria-label={etiqueta}
        data-fila={i}
        data-col={campo}
        value={filas[i][campo]}
        disabled={opciones.deshabilitada}
        placeholder={opciones.marcador}
        inputMode={esNumero ? 'decimal' : undefined}
        className={esNumero ? 'n' : undefined}
        onChange={(e) => cambiar(i, campo, e.target.value)}
        onKeyDown={(e) => alTeclear(e, i, campo)}
      />
    )
  }

  return (
    <Dialog open onOpenChange={(_, datos) => !datos.open && onCerrar()}>
      <DialogSurface style={{ maxWidth: 1280, width: '96vw' }}>
        <DialogBody>
          <DialogTitle>Generador de cantidades · {codigoItem}</DialogTitle>
          <DialogContent>
            <Text as="p">
              {descripcion} <Text weight="semibold">({unidad})</Text>
            </Text>

            {error && (
              <div role="alert">
                <MessageBar intent="error">
                  <MessageBarBody>{error}</MessageBarBody>
                </MessageBar>
              </div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end', margin: '8px 0' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Text weight="semibold">Tipo de generador</Text>
                <select
                  aria-label="Tipo de generador"
                  value={generador}
                  onChange={(e) => setGenerador(e.target.value as GeneradorMemoria)}
                  disabled={cargando}
                  style={{ height: 32 }}
                >
                  {GENERADORES.map((g) => (
                    <option key={g.valor} value={g.valor}>
                      {g.etiqueta}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 280px' }}>
                <Text weight="semibold">Observación general</Text>
                <Input
                  aria-label="Observación general de la actividad"
                  value={observacionGeneral}
                  onChange={(_, d) => setObservacionGeneral(d.value)}
                  disabled={cargando}
                />
              </label>
            </div>
            <Text size={200} as="p">
              Las filas sin observación heredan la observación general. Al cambiar de tipo de generador, las medidas del otro tipo no se guardan.
            </Text>

            {esAcero && errorAcero && (
              <div role="alert">
                <MessageBar intent="error">
                  <MessageBarBody>{errorAcero}</MessageBarBody>
                </MessageBar>
              </div>
            )}

            {cargando ? (
              <Spinner label="Cargando la memoria…" />
            ) : (
              <div style={{ overflowX: 'auto', marginTop: 8 }} onPaste={alPegar}>
                <table
                  ref={refTabla}
                  className={`g medidor ${esAcero ? 'acero' : 'generico'}`}
                  aria-label={`Memoria de cantidades de ${codigoItem}`}
                >
                  <thead>{esAcero ? <EncabezadoAcero /> : <EncabezadoGenerico />}</thead>
                  <tbody>
                    {filas.map((f, i) => {
                      const n = i + 1
                      const marcador = observacionGeneral.trim() ? observacionGeneral.trim() : undefined
                      return esAcero ? (
                        <tr key={i}>
                          <td>{celda(i, 'observacion', `Observación de la fila ${n}`, { marcador })}</td>
                          <td>{celda(i, 'nivel', `Nivel de la fila ${n}`)}</td>
                          <td>{celda(i, 'eje', `Eje de la fila ${n}`)}</td>
                          <td>{celda(i, 'esquema', `Esquema de la fila ${n}`)}</td>
                          <td>
                            <select
                              aria-label={`Referencia del acero de la fila ${n}`}
                              data-fila={i}
                              data-col="ref"
                              value={f.ref}
                              disabled={!acero}
                              onChange={(e) => cambiar(i, 'ref', e.target.value)}
                              onKeyDown={(e) => alTeclear(e, i, 'ref')}
                            >
                              <option value="">—</option>
                              {(acero?.filas ?? []).map((r) => (
                                <option key={r.ref} value={r.ref}>
                                  {r.ref}
                                </option>
                              ))}
                              {f.ref !== '' && !acero?.filas.some((r) => r.ref === f.ref) && <option value={f.ref}>{f.ref}</option>}
                            </select>
                          </td>
                          <td>{celda(i, 'longitud', `longitud de la fila ${n}`)}</td>
                          <td>{celda(i, 'barras', `barras de la fila ${n}`)}</td>
                          <td className="n solo-lectura" title="Peso kg/m de la tabla de acero (solo lectura)">
                            {pesoMostrado(f) === null ? '—' : pesoKgPorMetro(pesoMostrado(f)!)}
                          </td>
                          <td>{celda(i, 'piezas', `piezas de la fila ${n}`)}</td>
                          <td className="n">{f.valorGuardado === null ? '—' : decimales(f.valorGuardado)}</td>
                          <td>
                            <Button appearance="subtle" aria-label={`Quitar la fila ${n}`} onClick={() => quitar(i)}>
                              ✕
                            </Button>
                          </td>
                        </tr>
                      ) : (
                        <tr key={i}>
                          {(() => {
                            const sinCantidad = f.tipo === 'Subtitulo'
                            const conFigura = f.figura !== null
                            return (
                              <>
                                <td>
                                  <select
                                    aria-label={`Tipo de la fila ${n}`}
                                    data-fila={i}
                                    data-col="tipo"
                                    value={f.tipo}
                                    onChange={(e) => cambiar(i, 'tipo', e.target.value as TipoFilaMemoria)}
                                    onKeyDown={(e) => alTeclear(e, i, 'tipo')}
                                  >
                                    {TIPOS.map((t) => (
                                      <option key={t.valor} value={t.valor}>
                                        {t.etiqueta}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td>{celda(i, 'observacion', `Observación de la fila ${n}`, { marcador })}</td>
                                <td>{celda(i, 'nivel', `Nivel de la fila ${n}`)}</td>
                                <td>{celda(i, 'eje', `Eje de la fila ${n}`)}</td>
                                <td>{celda(i, 'tramo', `Tramo de la fila ${n}`)}</td>
                                <td>{celda(i, 'clasificador', `Clasificador de la fila ${n}`)}</td>
                                {(['largo', 'ancho', 'alto'] as const).map((campo) => (
                                  <td key={campo}>{celda(i, campo, `${campo} de la fila ${n}`, { deshabilitada: sinCantidad || conFigura })}</td>
                                ))}
                                <td>{celda(i, 'piezas', `piezas de la fila ${n}`, { deshabilitada: sinCantidad })}</td>
                                <td>
                                  <div className="figura-celda">
                                    <button
                                      type="button"
                                      className="btn-celda"
                                      disabled={sinCantidad}
                                      aria-label={conFigura ? `Figura de la fila ${n}: ${nombreDeFigura(f.figura!)}` : `Figura de la fila ${n}`}
                                      onClick={() => setFilaConFigura(i)}
                                    >
                                      {conFigura ? nombreDeFigura(f.figura!) : 'Figura…'}
                                    </button>
                                    {conFigura && (
                                      <button
                                        type="button"
                                        className="btn-celda"
                                        aria-label={`Quitar la figura de la fila ${n}`}
                                        onClick={() => cambiar(i, 'figura', null) /* las medidas de la figura se descartan al guardar */}
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </div>
                                </td>
                                <td className="n">{f.valorGuardado === null ? '—' : decimales(f.valorGuardado)}</td>
                                <td>
                                  <Button appearance="subtle" aria-label={`Quitar la fila ${n}`} onClick={() => quitar(i)}>
                                    ✕
                                  </Button>
                                </td>
                              </>
                            )
                          })()}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {avisoPegado && (
              <div role="status">
                <Text size={200}>{avisoPegado}</Text>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, flexWrap: 'wrap', gap: 8 }}>
              <Button appearance="outline" onClick={agregar} disabled={cargando}>
                Agregar fila
              </Button>
              <Text weight="semibold">
                Cantidad del ítem: {total === null ? 'sin calcular' : `${decimales(total)} ${unidadTotal}`}
              </Text>
            </div>
            <Text size={200} as="p">
              Un factor vacío cuenta como 1. Un descuento resta. El valor de cada fila{esAcero ? ', el peso' : ''} y la cantidad se calculan al guardar.
              Puede pegar desde Excel: {columnas.map(etiquetaPegado).join(', ')}.
              {esAcero && acero ? ` Tabla de acero: ${acero.fuente.replace(/\.$/, '')}.` : ''}
            </Text>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onCerrar} disabled={guardando}>
              Cancelar
            </Button>
            <Button appearance="primary" onClick={() => void guardar()} disabled={cargando || guardando}>
              {guardando ? 'Guardando…' : 'Guardar memoria'}
            </Button>
          </DialogActions>

          {filaConFigura !== null && (
            <DialogoFiguras
              figuras={figuras}
              errorFiguras={errorFiguras}
              inicial={
                filas[filaConFigura]?.figura
                  ? { figura: filas[filaConFigura].figura!, parametros: filas[filaConFigura].parametros ?? {} }
                  : null
              }
              onUsar={(figura, parametros) => usarFigura(filaConFigura, figura, parametros)}
              onCerrar={() => setFilaConFigura(null)}
            />
          )}
        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}

const ETIQUETAS_PEGADO: Record<string, string> = {
  largo: 'Largo',
  ancho: 'Ancho',
  alto: 'Alto',
  piezas: 'Piezas',
  longitud: 'Long',
  barras: 'Cant',
}

function etiquetaPegado(campo: string): string {
  return ETIQUETAS_PEGADO[campo] ?? campo
}

function EncabezadoGenerico() {
  return (
    <tr>
      <th style={{ width: 104 }}>Tipo</th>
      <th style={{ width: 190 }}>Observación</th>
      <th style={{ width: 64 }}>Nivel</th>
      <th style={{ width: 64 }}>Eje</th>
      <th style={{ width: 72 }}>Tramo</th>
      <th style={{ width: 96 }}>Clasificador</th>
      <th style={{ width: 76 }}>Largo</th>
      <th style={{ width: 76 }}>Ancho</th>
      <th style={{ width: 76 }}>Alto</th>
      <th style={{ width: 76 }}>Piezas</th>
      <th style={{ width: 150 }}>Figura</th>
      <th style={{ width: 96 }}>Valor</th>
      <th style={{ width: 52 }} />
    </tr>
  )
}

function EncabezadoAcero() {
  return (
    <tr>
      <th style={{ width: 200 }}>Observación</th>
      <th style={{ width: 70 }}>Nivel</th>
      <th style={{ width: 70 }}>Eje</th>
      <th style={{ width: 130 }}>Esquema</th>
      <th style={{ width: 96 }}>Ref</th>
      <th style={{ width: 84 }}>Long</th>
      <th style={{ width: 84 }}>Cant</th>
      <th style={{ width: 110 }}>Peso kg/m</th>
      <th style={{ width: 84 }}>Piezas</th>
      <th style={{ width: 100 }}>Valor</th>
      <th style={{ width: 52 }} />
    </tr>
  )
}
