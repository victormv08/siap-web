import { useEffect, useState } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  Spinner,
} from '@fluentui/react-components'
import { api } from '../api/cliente'
import type { AnalisisEditable, LineaAnalisis, LineaAnalisisSolicitud, Presupuesto, TipoLinea } from '../api/cliente'

interface Props {
  presupuestoId: string
  codigoAnalisis: string
  onCerrar: () => void
  onGuardado: (presupuesto: Presupuesto) => void
}

/** Línea en edición. Los números van como texto para no perder lo que la persona escribe a medias. */
interface Borrador {
  tipo: 'Insumo' | 'Subanalisis'
  descripcion: string
  unidad: string
  tipoLinea: TipoLinea
  codigoAnalisis: string
  cantidad: string
  precio: string
}

const TIPOS_COSTO: { valor: TipoLinea; etiqueta: string }[] = [
  { valor: 'Material', etiqueta: 'Material' },
  { valor: 'ManoDeObra', etiqueta: 'Mano de obra' },
  { valor: 'Equipo', etiqueta: 'Equipo' },
  { valor: 'Transporte', etiqueta: 'Transporte' },
  { valor: 'Otro', etiqueta: 'Otro' },
]

const LINEA_NUEVA: Borrador = {
  tipo: 'Insumo',
  descripcion: '',
  unidad: '',
  tipoLinea: 'Material',
  codigoAnalisis: '',
  cantidad: '',
  precio: '',
}

/** Convierte lo que escribe la persona («12,5» o «12.5») en un número. Es entrada, no cálculo. */
function leerNumero(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.')
  if (limpio === '') return null
  const valor = Number(limpio)
  return Number.isFinite(valor) ? valor : null
}

function aBorrador(l: LineaAnalisis): Borrador {
  return {
    tipo: l.tipo,
    descripcion: l.descripcion,
    unidad: l.unidad,
    tipoLinea: l.tipoLinea ?? 'Otro',
    codigoAnalisis: l.codigoAnalisis ?? '',
    cantidad: String(l.cantidad),
    precio: l.precio === null ? '' : String(l.precio),
  }
}

/**
 * Edita el análisis de precio de un ítem dentro de este presupuesto. El cambio no toca el catálogo
 * ni los presupuestos ya guardados: la API guarda la copia en este presupuesto. Los valores los calcula la API.
 */
export function DialogoEditarApu({ presupuestoId, codigoAnalisis, onCerrar, onGuardado }: Props) {
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [descripcion, setDescripcion] = useState('')
  const [unidad, setUnidad] = useState('')
  const [lineas, setLineas] = useState<Borrador[]>([])
  const [costo, setCosto] = useState<number | null>(null)

  useEffect(() => {
    let vigente = true
    api
      .analisisDelPresupuesto(presupuestoId, codigoAnalisis)
      .then((a: AnalisisEditable) => {
        if (!vigente) return
        setDescripcion(a.descripcion)
        setUnidad(a.unidad)
        setLineas(a.lineas.map(aBorrador))
        setCosto(a.costoDirecto)
      })
      .catch((ex: unknown) => {
        if (vigente) setError(ex instanceof Error ? ex.message : 'No se pudo cargar el análisis.')
      })
      .finally(() => {
        if (vigente) setCargando(false)
      })
    return () => {
      vigente = false
    }
  }, [presupuestoId, codigoAnalisis])

  function cambiar(indice: number, cambio: Partial<Borrador>) {
    setLineas((actuales) => actuales.map((l, i) => (i === indice ? { ...l, ...cambio } : l)))
  }

  function convertir(l: Borrador): LineaAnalisisSolicitud {
    const insumo = l.tipo === 'Insumo'
    return {
      tipo: l.tipo,
      descripcion: l.descripcion.trim() || null,
      unidad: insumo ? l.unidad.trim() || null : null,
      tipoLinea: insumo ? l.tipoLinea : null,
      codigoAnalisis: insumo ? null : l.codigoAnalisis.trim() || null,
      cantidad: leerNumero(l.cantidad) ?? 0,
      precio: insumo ? (leerNumero(l.precio) ?? 0) : 0,
    }
  }

  async function guardar() {
    setGuardando(true)
    setError(null)
    try {
      const actualizado = await api.editarAnalisis(presupuestoId, codigoAnalisis, {
        descripcion: descripcion.trim(),
        unidad: unidad.trim(),
        lineas: lineas.map(convertir),
      })
      onGuardado(actualizado)
      onCerrar()
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : 'La API no pudo guardar el análisis.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open onOpenChange={(_, datos) => !datos.open && onCerrar()}>
      <DialogSurface style={{ maxWidth: 980, width: '95vw' }}>
        <DialogBody>
          <DialogTitle>Editar análisis de precio · {codigoAnalisis}</DialogTitle>
          <DialogContent>
            {error && (
              <MessageBar intent="error">
                <MessageBarBody>{error}</MessageBarBody>
              </MessageBar>
            )}
            {cargando ? (
              <Spinner label="Cargando el análisis…" />
            ) : (
              <>
                <Field label="Descripción" required>
                  <Input value={descripcion} onChange={(_, d) => setDescripcion(d.value)} />
                </Field>
                <Field label="Unidad" required>
                  <Input value={unidad} onChange={(_, d) => setUnidad(d.value)} />
                </Field>

                <table className="g" aria-label="Líneas del análisis" style={{ width: '100%', marginTop: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 120 }}>Tipo</th>
                      <th>Descripción</th>
                      <th style={{ width: 80 }}>Unidad</th>
                      <th style={{ width: 130 }}>Costo</th>
                      <th style={{ width: 90 }}>Cantidad</th>
                      <th style={{ width: 110 }}>Precio</th>
                      <th style={{ width: 60 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {lineas.map((l, i) => (
                      <tr key={i}>
                        <td>
                          <select aria-label={`Tipo de la línea ${i + 1}`} value={l.tipo} onChange={(e) => cambiar(i, { tipo: e.target.value as Borrador['tipo'] })}>
                            <option value="Insumo">Insumo</option>
                            <option value="Subanalisis">Subanálisis</option>
                          </select>
                        </td>
                        <td>
                          {l.tipo === 'Insumo' ? (
                            <Input aria-label={`Descripción de la línea ${i + 1}`} value={l.descripcion} onChange={(_, d) => cambiar(i, { descripcion: d.value })} />
                          ) : (
                            <Input aria-label={`Código del subanálisis de la línea ${i + 1}`} value={l.codigoAnalisis} placeholder="Código del análisis" onChange={(_, d) => cambiar(i, { codigoAnalisis: d.value })} />
                          )}
                        </td>
                        <td>
                          <Input aria-label={`Unidad de la línea ${i + 1}`} value={l.unidad} disabled={l.tipo !== 'Insumo'} onChange={(_, d) => cambiar(i, { unidad: d.value })} />
                        </td>
                        <td>
                          <select aria-label={`Costo de la línea ${i + 1}`} value={l.tipoLinea} disabled={l.tipo !== 'Insumo'} onChange={(e) => cambiar(i, { tipoLinea: e.target.value as TipoLinea })}>
                            {TIPOS_COSTO.map((t) => (
                              <option key={t.valor} value={t.valor}>
                                {t.etiqueta}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <Input aria-label={`Cantidad de la línea ${i + 1}`} value={l.cantidad} inputMode="decimal" onChange={(_, d) => cambiar(i, { cantidad: d.value })} />
                        </td>
                        <td>
                          <Input aria-label={`Precio de la línea ${i + 1}`} value={l.precio} inputMode="decimal" disabled={l.tipo !== 'Insumo'} onChange={(_, d) => cambiar(i, { precio: d.value })} />
                        </td>
                        <td>
                          <Button appearance="subtle" aria-label={`Quitar la línea ${i + 1}`} onClick={() => setLineas((a) => a.filter((_, k) => k !== i))}>
                            ✕
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                  <Button appearance="outline" onClick={() => setLineas((a) => [...a, { ...LINEA_NUEVA }])}>
                    Agregar línea
                  </Button>
                  <span>Costo directo guardado: {costo === null ? 'sin calcular' : costo.toLocaleString('es-CO')}</span>
                </div>
                <p style={{ fontSize: 12, marginTop: 8 }}>
                  Los cambios aplican solo a este presupuesto. El costo se recalcula al guardar.
                </p>
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onCerrar} disabled={guardando}>
              Cancelar
            </Button>
            <Button appearance="primary" onClick={() => void guardar()} disabled={cargando || guardando || lineas.length === 0 || descripcion.trim() === '' || unidad.trim() === ''}>
              {guardando ? 'Guardando…' : 'Guardar análisis'}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}
