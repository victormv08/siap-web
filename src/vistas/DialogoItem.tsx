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

/** Convierte lo que escribe la persona («12,5» o «12.5») en un número. Es entrada, no cálculo. */
function leerNumero(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.')
  if (limpio === '') return null
  const valor = Number(limpio)
  return Number.isFinite(valor) ? valor : null
}

/**
 * Formulario para agregar un ítem a un capítulo. La actividad sale de la base de actividades (catálogo);
 * la API calcula su precio. La web solo recoge el capítulo, la actividad, la cantidad y la descripción.
 * Se monta al abrirse, así que arranca con los datos de cero.
 */
export function DialogoItem({ presupuesto, capituloInicial, onCerrar, onCreado }: Props) {
  const [capitulosBase, setCapitulosBase] = useState<CapituloCatalogo[]>([])
  const [actividades, setActividades] = useState<ActividadCatalogo[]>([])
  const [capituloDestino, setCapituloDestino] = useState(capituloInicial ?? presupuesto.capitulos[0]?.codigo ?? '')
  const [capituloBase, setCapituloBase] = useState('')
  const [codigoAnalisis, setCodigoAnalisis] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [unidad, setUnidad] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    let vigente = true
    api
      .catalogoCapitulos()
      .then((lista) => {
        if (vigente) setCapitulosBase(lista)
      })
      .catch((ex: unknown) => {
        if (vigente) setError(ex instanceof Error ? ex.message : 'No se pudo cargar la base de actividades.')
      })
    return () => {
      vigente = false
    }
  }, [])

  async function elegirCapituloBase(numero: string) {
    setCapituloBase(numero)
    setActividades([])
    setCodigoAnalisis('')
    if (!numero) return
    try {
      setActividades(await api.catalogoActividades(numero))
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : 'No se pudieron cargar las actividades.')
    }
  }

  function elegirActividad(codigo: string) {
    setCodigoAnalisis(codigo)
    const actividad = actividades.find((a) => a.codigo === codigo)
    if (actividad) {
      setDescripcion(actividad.descripcion)
      setUnidad(actividad.unidad)
    }
  }

  const cantidadNumero = leerNumero(cantidad)
  const valido =
    capituloDestino !== '' &&
    codigoAnalisis !== '' &&
    descripcion.trim() !== '' &&
    cantidadNumero !== null &&
    cantidadNumero >= 0

  async function confirmar() {
    if (!valido || cantidadNumero === null) return
    setEnviando(true)
    setError(null)
    try {
      const actualizado = await api.agregarItem(presupuesto.id, capituloDestino, {
        descripcion: descripcion.trim(),
        unidad: unidad.trim() || null,
        cantidad: cantidadNumero,
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
              {capitulosBase.length === 0 && (
                <MessageBar intent="info">
                  <MessageBarBody>
                    No hay base de actividades cargada. Configure BaseApu__Ruta en la API para elegir una actividad.
                  </MessageBarBody>
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

              <Field label="Capítulo de la base de actividades" required>
                <select
                  aria-label="Capítulo de la base de actividades"
                  value={capituloBase}
                  onChange={(e) => void elegirCapituloBase(e.target.value)}
                >
                  <option value="">Elija un capítulo…</option>
                  {capitulosBase.map((c) => (
                    <option key={c.numero} value={c.numero}>
                      {c.numero} · {c.nombre}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Actividad" required>
                <select
                  aria-label="Actividad"
                  value={codigoAnalisis}
                  disabled={actividades.length === 0}
                  onChange={(e) => elegirActividad(e.target.value)}
                >
                  <option value="">Elija una actividad…</option>
                  {actividades.map((a) => (
                    <option key={a.codigo} value={a.codigo}>
                      {a.codigo} · {a.descripcion}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Descripción" required>
                <Input value={descripcion} onChange={(_, d) => setDescripcion(d.value)} />
              </Field>

              <Field label="Unidad" hint="Si la deja vacía, se toma la de la actividad.">
                <Input value={unidad} onChange={(_, d) => setUnidad(d.value)} />
              </Field>

              <Field label="Cantidad" required>
                <Input value={cantidad} inputMode="decimal" onChange={(_, d) => setCantidad(d.value)} />
              </Field>
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
