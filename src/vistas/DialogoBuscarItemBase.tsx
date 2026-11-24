import { useEffect, useMemo, useState } from 'react'
import { Button, Dialog, DialogActions, DialogBody, DialogContent, DialogSurface, DialogTitle, Input, MessageBar, MessageBarBody, Spinner } from '@fluentui/react-components'
import { api } from '../api/cliente'
import type { ActividadCatalogo, CapituloCatalogo } from '../api/cliente'
import { pesos } from '../formato'

interface Props {
  onCerrar: () => void
  /** La actividad elegida: la app abre «Agregar ítem» con ella ya puesta. */
  onElegir: (actividad: ActividadCatalogo) => void
}

/** Máximo de resultados que se dibujan a la vez; si hay más se pide afinar la búsqueda. */
const MAXIMO = 100

/** Minúsculas y sin tildes, para que «cimentacion» encuentre «Cimentación». */
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/**
 * Busca una actividad de la base (el catálogo) por código, descripción, unidad o capítulo. Cada palabra escrita debe estar en
 * alguna parte del texto de la actividad. El precio lo calcula la API; aquí solo se filtra y se elige.
 */
export function DialogoBuscarItemBase({ onCerrar, onElegir }: Props) {
  const [actividades, setActividades] = useState<ActividadCatalogo[] | null>(null)
  const [capitulos, setCapitulos] = useState<CapituloCatalogo[]>([])
  const [error, setError] = useState<string | null>(null)
  const [texto, setTexto] = useState('')

  useEffect(() => {
    let vigente = true
    Promise.all([api.catalogoActividades(), api.catalogoCapitulos()])
      .then(([lista, caps]) => {
        if (!vigente) return
        setActividades(lista)
        setCapitulos(caps)
      })
      .catch((ex: unknown) => {
        if (vigente) setError(ex instanceof Error ? ex.message : 'No se pudo cargar la base de actividades.')
      })
    return () => {
      vigente = false
    }
  }, [])

  const nombreCapitulo = (numero: string) => capitulos.find((c) => c.numero === numero)?.nombre ?? ''

  const coincidencias = useMemo(() => {
    if (!actividades) return []
    const palabras = normalizar(texto).split(/\s+/).filter(Boolean)
    if (palabras.length === 0) return actividades
    return actividades.filter((a) => {
      const pajar = normalizar(`${a.codigo} ${a.descripcion} ${a.unidad} ${a.capitulo ?? ''} ${nombreCapitulo(a.capitulo ?? '')}`)
      return palabras.every((p) => pajar.includes(p))
    })
    // nombreCapitulo depende de `capitulos`, que ya está en las dependencias por la lista de actividades.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actividades, capitulos, texto])

  const visibles = coincidencias.slice(0, MAXIMO)

  return (
    <Dialog open onOpenChange={(_, datos) => !datos.open && onCerrar()}>
      <DialogSurface style={{ maxWidth: 760, width: '100%' }}>
        <DialogBody>
          <DialogTitle>Buscar ítem base</DialogTitle>
          <DialogContent style={{ display: 'grid', gap: 12 }}>
            {error && (
              <MessageBar intent="error">
                <MessageBarBody>{error}</MessageBarBody>
              </MessageBar>
            )}
            <Input
              aria-label="Buscar en la base de actividades"
              placeholder="Escriba código, descripción, unidad o capítulo…"
              value={texto}
              onChange={(_, d) => setTexto(d.value)}
              onKeyDown={(evento) => {
                if (evento.key === 'Enter' && visibles.length > 0) {
                  evento.preventDefault()
                  onElegir(visibles[0])
                }
              }}
              autoFocus
            />
            {actividades === null && !error ? (
              <Spinner label="Cargando la base de actividades…" />
            ) : (
              <>
                <div style={{ maxHeight: 360, overflow: 'auto' }}>
                  <table className="g" aria-label="Resultados de la búsqueda" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ width: 90 }}>Código</th>
                        <th>Actividad</th>
                        <th style={{ width: 70 }}>Unidad</th>
                        <th style={{ width: 120 }} className="n">
                          Vr. unitario
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibles.map((a) => (
                        <tr key={a.codigo} className="fila-resultado" style={{ cursor: 'pointer' }} onClick={() => onElegir(a)}>
                          <td>
                            <button type="button" className="enlace-fila" aria-label={`Elegir ${a.codigo} · ${a.descripcion}`} onClick={() => onElegir(a)}>
                              {a.codigo}
                            </button>
                          </td>
                          <td className="desc">{a.descripcion}</td>
                          <td>{a.unidad}</td>
                          <td className="n">$ {pesos(a.precioUnitario)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p role="status" style={{ margin: 0, fontSize: 12 }}>
                  {coincidencias.length === 0
                    ? 'Ninguna actividad coincide. Pruebe con otra palabra.'
                    : coincidencias.length > MAXIMO
                      ? `Mostrando ${MAXIMO} de ${coincidencias.length}. Escriba más palabras para afinar.`
                      : `${coincidencias.length} actividad${coincidencias.length === 1 ? '' : 'es'}. Pulse Enter para elegir la primera.`}
                </p>
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onCerrar}>
              Cancelar
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}
