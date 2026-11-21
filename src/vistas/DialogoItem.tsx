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
} from '@fluentui/react-components'
import { api } from '../api/cliente'
import type { ActividadCatalogo, CapituloCatalogo, Presupuesto } from '../api/cliente'

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

  // Las actividades se agrupan por capítulo de la base cuando la actividad lo trae.
  const grupos = new Map<string, ActividadCatalogo[]>()
  for (const a of actividades) {
    const clave = a.capitulo ?? ''
    grupos.set(clave, [...(grupos.get(clave) ?? []), a])
  }
  const nombreGrupo = (clave: string) =>
    clave === '' ? 'Actividades de demostración' : `${clave} · ${capitulosBase.find((c) => c.numero === clave)?.nombre ?? ''}`

  return (
    <Dialog open onOpenChange={(_, datos) => !datos.open && onCerrar()}>
      <DialogSurface>
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
                <select aria-label="Actividad" value={codigoAnalisis} onChange={(e) => elegirActividad(e.target.value)}>
                  <option value="">Elija una actividad…</option>
                  {[...grupos.entries()].map(([clave, lista]) => (
                    <optgroup key={clave} label={nombreGrupo(clave)}>
                      {lista.map((a) => (
                        <option key={a.codigo} value={a.codigo}>
                          {a.codigo} · {a.descripcion}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
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
