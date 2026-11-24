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
  Radio,
  RadioGroup,
  Select,
} from '@fluentui/react-components'
import { api } from '../api/cliente'
import type { ActividadCatalogo, CapituloCatalogo, Presupuesto } from '../api/cliente'
import { aNumero } from './pegadoFilas'
import { IconoMedir } from './CostosDirectos'
import { unidadesConActual } from './unidades'

interface Props {
  presupuesto: Presupuesto
  capituloInicial: string | null
  onCerrar: () => void
  /** Tras crear el ítem. Con «Medir», trae el código del ítem nuevo para abrir su generador de cantidades. */
  onCreado: (presupuesto: Presupuesto, medir?: { codigoItem: string }) => void
}

/**
 * Formulario para agregar un ítem a un capítulo. La actividad sale del catálogo y la API calcula su precio, o se crea una
 * actividad nueva que solo existe en este presupuesto: nace sin insumos (precio $ 0) y se completa con «Editar APU».
 * La cantidad es opcional: se puede escribir aquí o después en la tabla, o dejarla en 0 y medirla con el generador de cantidades.
 * Se monta al abrirse, así que arranca con los datos de cero.
 */
export function DialogoItem({ presupuesto, capituloInicial, onCerrar, onCreado }: Props) {
  const [capitulosBase, setCapitulosBase] = useState<CapituloCatalogo[]>([])
  const [actividades, setActividades] = useState<ActividadCatalogo[]>([])
  const [capituloDestino, setCapituloDestino] = useState(capituloInicial ?? presupuesto.capitulos[0]?.codigo ?? '')
  const [modo, setModo] = useState<'catalogo' | 'nueva'>('catalogo')
  const [codigoAnalisis, setCodigoAnalisis] = useState('')
  const [codigoNuevo, setCodigoNuevo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [cantidadTexto, setCantidadTexto] = useState('')
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

  // Vacía = 0 (se medirá después). Si la escribió, debe ser un número que no sea negativo.
  const cantidad = cantidadTexto.trim() === '' ? 0 : aNumero(cantidadTexto)
  const cantidadValida = cantidad !== null && cantidad >= 0

  // Por qué no se puede agregar todavía (para decirlo en pantalla en vez de dejar los botones apagados sin explicación).
  const motivoNoValido =
    presupuesto.capitulos.length === 0
      ? 'Este presupuesto no tiene capítulos. Cierre este cuadro y cree uno con «Capítulo».'
      : modo === 'catalogo' && codigoAnalisis === ''
        ? 'Elija una actividad del catálogo para poder agregar o medir.'
        : descripcion.trim() === ''
          ? 'Escriba la descripción del ítem.'
          : unidad === ''
            ? 'Elija la unidad de la lista.'
            : !cantidadValida
              ? 'La cantidad debe ser un número que no sea negativo.'
              : null

  const valido =
    cantidadValida &&
    capituloDestino !== '' &&
    descripcion.trim() !== '' &&
    (modo === 'catalogo' ? codigoAnalisis !== '' : true) &&
    unidad !== ''

  async function confirmar(medir = false) {
    if (!valido) return
    setEnviando(true)
    setError(null)
    try {
      const actualizado = await api.agregarItem(
        presupuesto.id,
        capituloDestino,
        modo === 'catalogo'
          ? { descripcion: descripcion.trim(), unidad, cantidad: cantidad ?? 0, codigoAnalisis }
          : {
              descripcion: descripcion.trim(),
              unidad,
              cantidad: cantidad ?? 0,
              codigoAnalisis: '',
              nuevaActividad: { codigo: codigoNuevo.trim() || null, descripcion: descripcion.trim(), unidad },
            },
      )
      // El ítem nuevo es el único código que antes no estaba: con «Medir» se abre su generador de cantidades.
      const antes = new Set(presupuesto.capitulos.flatMap((c) => c.items.map((i) => i.codigo)))
      const nuevo = actualizado.capitulos.flatMap((c) => c.items).find((i) => !antes.has(i.codigo))
      onCreado(actualizado, medir && nuevo ? { codigoItem: nuevo.codigo } : undefined)
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
      <DialogSurface className="dlg-item">
        <form
          onSubmit={(evento) => {
            evento.preventDefault()
            void confirmar()
          }}
        >
          <DialogBody>
            <DialogTitle>Agregar ítem</DialogTitle>
            <DialogContent className="dlg-form">
              {error && (
                <MessageBar intent="error">
                  <MessageBarBody>{error}</MessageBarBody>
                </MessageBar>
              )}

              <Field label="Capítulo del presupuesto" required>
                <Select aria-label="Capítulo del presupuesto" value={capituloDestino} onChange={(_, d) => setCapituloDestino(d.value)}>
                  {presupuesto.capitulos.map((c) => (
                    <option key={c.codigo} value={c.codigo}>
                      {c.codigo} · {c.nombre}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Origen de la actividad">
                <RadioGroup layout="horizontal" value={modo} onChange={(_, d) => setModo(d.value === 'nueva' ? 'nueva' : 'catalogo')}>
                  <Radio value="catalogo" label="Del catálogo" />
                  <Radio value="nueva" label="Actividad nueva" />
                </RadioGroup>
              </Field>

              {modo === 'catalogo' ? (
                <Field label="Actividad" required>
                  <Select aria-label="Actividad" value={codigoAnalisis} onChange={(_, d) => elegirActividad(d.value)}>
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
                  </Select>
                </Field>
              ) : (
                <>
                  <Field
                    label="Código de la actividad nueva"
                    hint="Opcional: si lo deja vacío se asigna uno (NUEVA-01, NUEVA-02…). Letras, números, punto, guion y guion bajo."
                  >
                    <Input aria-label="Código de la actividad nueva" value={codigoNuevo} onChange={(_, d) => setCodigoNuevo(d.value)} />
                  </Field>
                  <MessageBar intent="warning">
                    <MessageBarBody>
                      La actividad nueva nace <b>sin insumos</b>, con precio $ 0, y solo existe en este presupuesto. Seleccione el ítem y use
                      «Editar APU» para agregarle sus insumos.
                    </MessageBarBody>
                  </MessageBar>
                </>
              )}

              <Field label="Descripción" required>
                <Input value={descripcion} onChange={(_, d) => setDescripcion(d.value)} />
              </Field>

              <div className="dlg-dos-columnas">
                <Field label="Unidad" required hint={modo === 'catalogo' ? 'Se propone la de la actividad.' : 'Por ejemplo m2, m3, kg, und.'}>
                  <Select aria-label="Unidad" value={unidad} onChange={(_, d) => setUnidad(d.value)}>
                    <option value="">Elija una unidad…</option>
                    {unidadesConActual(unidad).map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field
                  label="Cantidad (opcional)"
                  validationState={cantidadValida ? 'none' : 'error'}
                  validationMessage={cantidadValida ? undefined : 'Escriba un número que no sea negativo.'}
                  hint="Escríbala o mídala con el botón."
                >
                  <Input
                    aria-label="Cantidad"
                    inputMode="decimal"
                    placeholder="0"
                    value={cantidadTexto}
                    onChange={(_, d) => setCantidadTexto(d.value)}
                    contentAfter={
                      <Button
                        type="button"
                        size="small"
                        appearance="subtle"
                        icon={<IconoMedir />}
                        aria-label="Medir cantidad"
                        disabled={!valido || enviando}
                        title={motivoNoValido ?? 'Agrega el ítem y abre el generador de cantidades para medirlo y guardar las medidas'}
                        onClick={() => void confirmar(true)}
                      >
                        Medir
                      </Button>
                    }
                  />
                </Field>
              </div>

              {motivoNoValido && (
                <div role="status" className="dlg-aviso">
                  {motivoNoValido}
                </div>
              )}
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
