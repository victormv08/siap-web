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
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from '@fluentui/react-components'
import { api } from '../api/cliente'
import type { ActividadCatalogo, CapituloCatalogo, Presupuesto } from '../api/cliente'
import { pesos } from '../formato'

interface Props {
  presupuesto: Presupuesto
  capituloInicial: string | null
  onCerrar: () => void
  onCreado: (presupuesto: Presupuesto) => void
}

/**
 * Formulario para agregar un ítem a un capítulo. La actividad sale del catálogo y la API calcula su precio.
 * La cantidad no se escribe aquí: el ítem nace con cantidad 0 y se mide tocando su cantidad en la tabla, que abre el generador (RD-067).
 * Se monta al abrirse, así que arranca con los datos de cero.
 */
export function DialogoItem({ presupuesto, capituloInicial, onCerrar, onCreado }: Props) {
  const [capitulosBase, setCapitulosBase] = useState<CapituloCatalogo[]>([])
  const [actividades, setActividades] = useState<ActividadCatalogo[]>([])
  const [capituloDestino, setCapituloDestino] = useState(capituloInicial ?? presupuesto.capitulos[0]?.codigo ?? '')
  const [codigoAnalisis, setCodigoAnalisis] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [unidad, setUnidad] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    let vigente = true
    Promise.all([api.catalogoCapitulos(), api.catalogoActividades()])
      .then(([capitulos, todas]) => {
        if (!vigente) return
        setCapitulosBase(capitulos)
        setActividades(todas)
      })
      .catch((ex: unknown) => {
        if (vigente) setError(ex instanceof Error ? ex.message : 'No se pudo cargar el catálogo de actividades.')
      })
    return () => {
      vigente = false
    }
  }, [])

  function elegirActividad(codigo: string) {
    setCodigoAnalisis(codigo)
    const actividad = actividades.find((a) => a.codigo === codigo)
    if (actividad) {
      setDescripcion(actividad.descripcion)
      setUnidad(actividad.unidad)
    }
  }

  const valido = capituloDestino !== '' && codigoAnalisis !== '' && descripcion.trim() !== ''

  async function confirmar() {
    if (!valido) return
    setEnviando(true)
    setError(null)
    try {
      const actualizado = await api.agregarItem(presupuesto.id, capituloDestino, {
        descripcion: descripcion.trim(),
        unidad: unidad.trim() || null,
        cantidad: 0,
        codigoAnalisis,
      })
      onCreado(actualizado)
      onCerrar()
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : 'La API no pudo agregar el ítem.')
    } finally {
      setEnviando(false)
    }
  }

  // Búsqueda sin distinguir mayúsculas ni tildes, sobre código y descripción.
  const normalizar = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const termino = normalizar(busqueda.trim())
  const resultados = termino
    ? actividades.filter((a) => normalizar(`${a.codigo} ${a.descripcion}`).includes(termino))
    : actividades
  const nombreGrupo = (clave: string) =>
    clave === '' ? 'Actividades de demostración' : `${clave} · ${capitulosBase.find((c) => c.numero === clave)?.nombre ?? ''}`

  return (
    <Dialog open onOpenChange={(_, datos) => !datos.open && onCerrar()}>
      <DialogSurface style={{ width: 'min(1100px, 92vw)', maxWidth: 'none' }}>
        <form
          onSubmit={(evento) => {
            evento.preventDefault()
            void confirmar()
          }}
        >
          <DialogBody>
            <DialogTitle>Agregar ítem</DialogTitle>
            <DialogContent>
              {error && (
                <MessageBar intent="error">
                  <MessageBarBody>{error}</MessageBarBody>
                </MessageBar>
              )}
              <Field label="Capítulo del presupuesto" required>
                <select
                  aria-label="Capítulo del presupuesto"
                  value={capituloDestino}
                  onChange={(e) => setCapituloDestino(e.target.value)}
                >
                  {presupuesto.capitulos.map((c) => (
                    <option key={c.codigo} value={c.codigo}>
                      {c.codigo} · {c.nombre}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Actividad" required>
                <Input
                  type="search"
                  placeholder="Buscar por código o descripción…"
                  aria-label="Buscar actividad"
                  value={busqueda}
                  onChange={(_, d) => setBusqueda(d.value)}
                />
                <div className="dialogo-item-resultados">
                  <Table size="small" aria-label="Actividades del catálogo">
                    <TableHeader>
                      <TableRow>
                        <TableHeaderCell>Código</TableHeaderCell>
                        <TableHeaderCell>Descripción</TableHeaderCell>
                        <TableHeaderCell>Unidad</TableHeaderCell>
                        <TableHeaderCell>Capítulo</TableHeaderCell>
                        <TableHeaderCell>Vr. unitario</TableHeaderCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resultados.map((a) => (
                        <TableRow
                          key={a.codigo}
                          aria-selected={a.codigo === codigoAnalisis}
                          className={a.codigo === codigoAnalisis ? 'dialogo-item-fila activa' : 'dialogo-item-fila'}
                          onClick={() => elegirActividad(a.codigo)}
                        >
                          <TableCell>{a.codigo}</TableCell>
                          <TableCell>{a.descripcion}</TableCell>
                          <TableCell>{a.unidad}</TableCell>
                          <TableCell>{nombreGrupo(a.capitulo ?? '')}</TableCell>
                          <TableCell className="dialogo-item-numero">$ {pesos(a.precioUnitario)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {resultados.length === 0 && <div className="dialogo-item-vacio">Sin actividades que coincidan.</div>}
                </div>
              </Field>

              <Field label="Descripción" required>
                <Input value={descripcion} onChange={(_, d) => setDescripcion(d.value)} />
              </Field>

              <Field label="Unidad" hint="Si la deja vacía, se toma la de la actividad.">
                <Input value={unidad} onChange={(_, d) => setUnidad(d.value)} />
              </Field>

              <MessageBar intent="info">
                <MessageBarBody>La cantidad se define después: toque la cantidad del ítem en la tabla para abrir el generador de cantidades.</MessageBarBody>
              </MessageBar>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={onCerrar} disabled={enviando}>
                Cancelar
              </Button>
              <Button type="submit" appearance="primary" disabled={!valido || enviando}>
                {enviando ? 'Agregando…' : 'Agregar ítem'}
              </Button>
            </DialogActions>
          </DialogBody>
        </form>
      </DialogSurface>
    </Dialog>
  )
}
