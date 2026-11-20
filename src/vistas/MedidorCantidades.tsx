import { useEffect, useState } from 'react'
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
import type { FilaMemoriaSolicitud, MemoriaRespuesta, Presupuesto, TipoFilaMemoria } from '../api/cliente'
import { decimales } from '../formato'

interface Props {
  presupuestoId: string
  codigoItem: string
  descripcion: string
  unidad: string
  onCerrar: () => void
  onGuardado: (presupuesto: Presupuesto) => void
}

/** Fila en edición. Los números se guardan como texto para no perder lo que la persona escribe a medias. */
interface Borrador {
  tipo: TipoFilaMemoria
  observacion: string
  largo: string
  ancho: string
  alto: string
  piezas: string
  valorGuardado: number | null
}

const TIPOS: { valor: TipoFilaMemoria; etiqueta: string }[] = [
  { valor: 'Fila', etiqueta: 'Medida' },
  { valor: 'Descuento', etiqueta: 'Descuento' },
  { valor: 'Subtitulo', etiqueta: 'Subtítulo' },
]

const FILA_VACIA: Borrador = { tipo: 'Fila', observacion: '', largo: '', ancho: '', alto: '', piezas: '', valorGuardado: null }

/** Convierte lo que escribe la persona («12,5» o «12.5») en un número. Es entrada, no cálculo. */
function leerNumero(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.')
  if (limpio === '') return null
  const valor = Number(limpio)
  return Number.isFinite(valor) ? valor : null
}

function aBorrador(memoria: MemoriaRespuesta): Borrador[] {
  return memoria.filas.map((f) => ({
    tipo: f.tipo,
    observacion: f.observacion,
    largo: f.largo === null ? '' : String(f.largo),
    ancho: f.ancho === null ? '' : String(f.ancho),
    alto: f.alto === null ? '' : String(f.alto),
    piezas: f.piezas === null ? '' : String(f.piezas),
    valorGuardado: f.valor,
  }))
}

/**
 * Medidor de cantidades de una actividad (RD-067). La web solo recoge las medidas; la cantidad y el
 * valor de cada fila los calcula la API al guardar. Por eso el total se muestra después de guardar.
 */
export function MedidorCantidades({ presupuestoId, codigoItem, descripcion, unidad, onCerrar, onGuardado }: Props) {
  const [filas, setFilas] = useState<Borrador[]>([])
  const [total, setTotal] = useState<number | null>(null)
  // El diálogo se monta al abrirse: arranca cargando y sin error, sin reiniciarlos en el efecto.
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let vigente = true
    api
      .memoria(presupuestoId, codigoItem)
      .then((memoria) => {
        if (!vigente) return
        setFilas(memoria.filas.length > 0 ? aBorrador(memoria) : [{ ...FILA_VACIA }])
        setTotal(memoria.total)
      })
      .catch((ex: unknown) => {
        if (vigente) setError(ex instanceof Error ? ex.message : 'No se pudo cargar la memoria de cantidades.')
      })
      .finally(() => {
        if (vigente) setCargando(false)
      })
    return () => {
      vigente = false
    }
  }, [presupuestoId, codigoItem])

  function cambiar(indice: number, campo: keyof Borrador, valor: string) {
    setFilas((actuales) => actuales.map((f, i) => (i === indice ? { ...f, [campo]: valor } : f)))
  }

  function quitar(indice: number) {
    setFilas((actuales) => actuales.filter((_, i) => i !== indice))
  }

  function agregar() {
    setFilas((actuales) => [...actuales, { ...FILA_VACIA }])
  }

  async function guardar() {
    setGuardando(true)
    setError(null)
    const solicitud: FilaMemoriaSolicitud[] = filas.map((f) => ({
      tipo: f.tipo,
      observacion: f.observacion.trim() || null,
      largo: leerNumero(f.largo),
      ancho: leerNumero(f.ancho),
      alto: leerNumero(f.alto),
      piezas: leerNumero(f.piezas),
    }))
    try {
      const guardada = await api.guardarMemoria(presupuestoId, codigoItem, solicitud)
      setTotal(guardada.memoria.total)
      setFilas(aBorrador(guardada.memoria))
      onGuardado(guardada.presupuesto)
      onCerrar()
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : 'La API no pudo guardar la memoria.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open onOpenChange={(_, datos) => !datos.open && onCerrar()}>
      <DialogSurface style={{ maxWidth: 960, width: '95vw' }}>
        <DialogBody>
          <DialogTitle>
            Medidor de cantidades · {codigoItem}
          </DialogTitle>
          <DialogContent>
            <Text as="p">
              {descripcion} <Text weight="semibold">({unidad})</Text>
            </Text>

            {error && (
              <MessageBar intent="error">
                <MessageBarBody>{error}</MessageBarBody>
              </MessageBar>
            )}

            {cargando ? (
              <Spinner label="Cargando la memoria…" />
            ) : (
              <table className="g" aria-label={`Memoria de cantidades de ${codigoItem}`} style={{ width: '100%', marginTop: 12 }}>
                <thead>
                  <tr>
                    <th style={{ width: 120 }}>Tipo</th>
                    <th>Observación</th>
                    <th style={{ width: 90 }}>Largo</th>
                    <th style={{ width: 90 }}>Ancho</th>
                    <th style={{ width: 90 }}>Alto</th>
                    <th style={{ width: 90 }}>Piezas</th>
                    <th style={{ width: 110 }}>Valor guardado</th>
                    <th style={{ width: 60 }} />
                  </tr>
                </thead>
                <tbody>
                  {filas.map((f, i) => {
                    const sinCantidad = f.tipo === 'Subtitulo'
                    return (
                      <tr key={i}>
                        <td>
                          <select
                            aria-label={`Tipo de la fila ${i + 1}`}
                            value={f.tipo}
                            onChange={(e) => cambiar(i, 'tipo', e.target.value)}
                          >
                            {TIPOS.map((t) => (
                              <option key={t.valor} value={t.valor}>
                                {t.etiqueta}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <Input
                            aria-label={`Observación de la fila ${i + 1}`}
                            value={f.observacion}
                            onChange={(_, d) => cambiar(i, 'observacion', d.value)}
                            style={{ width: '100%' }}
                          />
                        </td>
                        {(['largo', 'ancho', 'alto', 'piezas'] as const).map((campo) => (
                          <td key={campo}>
                            <Input
                              aria-label={`${campo} de la fila ${i + 1}`}
                              value={f[campo]}
                              disabled={sinCantidad}
                              onChange={(_, d) => cambiar(i, campo, d.value)}
                              inputMode="decimal"
                              style={{ width: '100%' }}
                            />
                          </td>
                        ))}
                        <td className="n">
                          {f.valorGuardado === null ? "—" : decimales(f.valorGuardado)}
                        </td>
                        <td>
                          <Button appearance="subtle" aria-label={`Quitar la fila ${i + 1}`} onClick={() => quitar(i)}>
                            ✕
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <Button appearance="outline" onClick={agregar} disabled={cargando}>
                Agregar fila
              </Button>
              <Text weight="semibold">
                Cantidad del ítem: {total === null ? 'sin calcular' : `${decimales(total)} ${unidad}`}
              </Text>
            </div>
            <Text size={200}>
              Un factor vacío cuenta como 1. Un descuento resta. El valor de cada fila y la cantidad se calculan al guardar.
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
        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}
