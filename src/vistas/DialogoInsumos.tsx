import { useEffect, useMemo, useState } from 'react'
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
} from '@fluentui/react-components'
import { api } from '../api/cliente'
import type { CambioPrecioInsumo, InsumoPresupuesto, Presupuesto, TipoLinea } from '../api/cliente'
import { decimales } from '../formato'
import { aNumero } from './pegadoFilas'

interface Props {
  presupuesto: Presupuesto
  onCerrar: () => void
  onGuardado: (actualizado: Presupuesto) => void
}

const TIPOS: Record<TipoLinea, string> = {
  Material: 'Material',
  ManoDeObra: 'Mano de obra',
  Equipo: 'Equipo',
  Transporte: 'Transporte',
  Otro: 'Otro',
}

const clave = (i: InsumoPresupuesto) => `${i.tipo}|${i.unidad}|${i.descripcion}`

/**
 * Panel de insumos: los insumos que usan los APU de este presupuesto, con su precio. Cambiar un precio lo aplica a todas
 * las líneas de ese insumo, solo en este presupuesto (el catálogo no cambia). Todos los cambios se guardan juntos como un
 * solo cambio que Deshacer revierte. La web solo captura el precio: el total lo recalcula la API (D-27, D-51).
 */
export function DialogoInsumos({ presupuesto, onCerrar, onGuardado }: Props) {
  const [insumos, setInsumos] = useState<InsumoPresupuesto[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filtro, setFiltro] = useState('')
  /** Texto escrito en cada precio editado, por clave de insumo. Lo que no está aquí no se tocó. */
  const [editados, setEditados] = useState<Record<string, string>>({})
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    let vigente = true
    api
      .insumos(presupuesto.id)
      .then((lista) => {
        if (vigente) setInsumos(lista)
      })
      .catch((ex: unknown) => {
        if (vigente) setError(ex instanceof Error ? ex.message : 'No se pudieron cargar los insumos.')
      })
    return () => {
      vigente = false
    }
  }, [presupuesto.id])

  /** Estado de cada precio escrito: cambio válido, texto inválido, o sin cambio. */
  const revisados = useMemo(() => {
    const cambios: CambioPrecioInsumo[] = []
    const invalidos = new Set<string>()
    for (const i of insumos ?? []) {
      const texto = editados[clave(i)]
      if (texto === undefined) continue
      const precio = aNumero(texto)
      if (precio === null || precio < 0) {
        if (texto.trim() !== '' || i.precio !== null) invalidos.add(clave(i))
        continue
      }
      if (precio !== i.precio) cambios.push({ descripcion: i.descripcion, unidad: i.unidad, tipo: i.tipo, precio })
    }
    return { cambios, invalidos }
  }, [insumos, editados])

  const visibles = (insumos ?? []).filter((i) => i.descripcion.toLowerCase().includes(filtro.trim().toLowerCase()))
  const puedeGuardar = revisados.cambios.length > 0 && revisados.invalidos.size === 0 && !guardando

  async function guardar() {
    if (!puedeGuardar) return
    setGuardando(true)
    setError(null)
    try {
      onGuardado(await api.actualizarPreciosInsumos(presupuesto.id, revisados.cambios))
      onCerrar()
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : 'La API no pudo guardar los precios.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open onOpenChange={(_, datos) => !datos.open && onCerrar()}>
      <DialogSurface style={{ width: '96vw', maxWidth: 900 }}>
        <form
          onSubmit={(evento) => {
            evento.preventDefault()
            void guardar()
          }}
        >
          <DialogBody>
            <DialogTitle>Insumos del presupuesto</DialogTitle>
            <DialogContent style={{ display: 'grid', gap: 12 }}>
              <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 13 }}>
                Cambiar un precio lo aplica a <b>todos los APU de este presupuesto</b> que usan ese insumo. El catálogo no cambia,
                y Deshacer revierte todos los cambios guardados juntos.
              </p>
              <Input
                value={filtro}
                onChange={(_, datos) => setFiltro(datos.value)}
                placeholder="Buscar un insumo"
                aria-label="Buscar un insumo"
                type="search"
              />
              {error && (
                <MessageBar intent="error">
                  <MessageBarBody>{error}</MessageBarBody>
                </MessageBar>
              )}
              {!insumos && !error && <Spinner size="tiny" label="Cargando insumos…" />}
              {insumos && (
                <div style={{ maxHeight: '50vh', overflow: 'auto', border: '1px solid var(--grid)' }}>
                  <table className="g insumos-tabla" aria-label="Insumos del presupuesto" style={{ minWidth: 640 }}>
                    <colgroup>
                      <col />
                      <col style={{ width: 120 }} />
                      <col style={{ width: 80 }} />
                      <col style={{ width: 90 }} />
                      <col style={{ width: 170 }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th scope="col">Insumo</th>
                        <th scope="col">Tipo</th>
                        <th scope="col">Unidad</th>
                        <th scope="col">En APU</th>
                        <th scope="col">Precio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibles.map((i) => {
                        const k = clave(i)
                        const texto = editados[k] ?? (i.precio === null ? '' : decimales(i.precio))
                        const cambiado = revisados.cambios.some((c) => c.descripcion === i.descripcion && c.unidad === i.unidad && c.tipo === i.tipo)
                        const invalido = revisados.invalidos.has(k)
                        return (
                          <tr key={k}>
                            <td title={i.descripcion}>{i.descripcion}</td>
                            <td>{TIPOS[i.tipo]}</td>
                            <td>{i.unidad}</td>
                            <td className="n">{i.analisis}</td>
                            <td className="insumo-td">
                              <input
                                className={cambiado ? 'insumo-precio cambiado' : 'insumo-precio'}
                                value={texto}
                                placeholder={i.variosPrecios ? 'Varios precios' : undefined}
                                aria-label={`Precio de ${i.descripcion} (${TIPOS[i.tipo]}, ${i.unidad})`}
                                aria-invalid={invalido ? true : undefined}
                                title={i.variosPrecios ? 'Este insumo tiene precios distintos en distintos APU. Un precio nuevo los iguala.' : undefined}
                                inputMode="decimal"
                                autoComplete="off"
                                onChange={(evento) => setEditados((previos) => ({ ...previos, [k]: evento.target.value }))}
                              />
                            </td>
                          </tr>
                        )
                      })}
                      {visibles.length === 0 && (
                        <tr>
                          <td colSpan={5}>{insumos.length === 0 ? 'Los APU de este presupuesto no tienen insumos.' : 'Ningún insumo coincide con la búsqueda.'}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
              {revisados.invalidos.size > 0 && (
                <MessageBar intent="warning">
                  <MessageBarBody>
                    {revisados.invalidos.size} {revisados.invalidos.size === 1 ? 'precio no es un número' : 'precios no son números'}: escribe un
                    valor como 28.500 o 28.500,50.
                  </MessageBarBody>
                </MessageBar>
              )}
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={onCerrar}>
                Cancelar
              </Button>
              <Button type="submit" appearance="primary" disabled={!puedeGuardar}>
                {guardando
                  ? 'Guardando…'
                  : revisados.cambios.length > 0
                    ? `Guardar ${revisados.cambios.length} ${revisados.cambios.length === 1 ? 'cambio' : 'cambios'}`
                    : 'Guardar cambios'}
              </Button>
            </DialogActions>
          </DialogBody>
        </form>
      </DialogSurface>
    </Dialog>
  )
}
