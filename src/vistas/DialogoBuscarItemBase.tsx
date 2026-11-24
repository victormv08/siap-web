import { useEffect, useMemo, useRef, useState } from 'react'
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
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from '@fluentui/react-components'
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

function IconoLupa() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

/**
 * Busca una actividad de la base (el catálogo) por código, descripción, unidad o capítulo. Cada palabra escrita debe estar en
 * alguna parte del texto de la actividad. Las flechas mueven la fila activa y Enter la elige. El precio lo calcula la API;
 * aquí solo se filtra y se elige.
 */
export function DialogoBuscarItemBase({ onCerrar, onElegir }: Props) {
  const [actividades, setActividades] = useState<ActividadCatalogo[] | null>(null)
  const [capitulos, setCapitulos] = useState<CapituloCatalogo[]>([])
  const [error, setError] = useState<string | null>(null)
  const [texto, setTexto] = useState('')
  const [activa, setActiva] = useState(0)
  const listaRef = useRef<HTMLDivElement>(null)

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
      const pajar = normalizar(`${a.codigo} ${a.descripcion} ${a.unidad} ${a.capitulo ?? ''} ${capitulos.find((c) => c.numero === a.capitulo)?.nombre ?? ''}`)
      return palabras.every((p) => pajar.includes(p))
    })
  }, [actividades, capitulos, texto])

  const visibles = coincidencias.slice(0, MAXIMO)
  const indiceActivo = Math.min(activa, Math.max(visibles.length - 1, 0))

  // La fila activa siempre queda a la vista al moverse con las flechas.
  useEffect(() => {
    listaRef.current?.querySelector<HTMLElement>('[data-activa="true"]')?.scrollIntoView?.({ block: 'nearest' })
  }, [indiceActivo, texto])

  function alTeclear(evento: React.KeyboardEvent) {
    if (visibles.length === 0) return
    if (evento.key === 'ArrowDown') {
      evento.preventDefault()
      setActiva(Math.min(indiceActivo + 1, visibles.length - 1))
    } else if (evento.key === 'ArrowUp') {
      evento.preventDefault()
      setActiva(Math.max(indiceActivo - 1, 0))
    } else if (evento.key === 'Enter') {
      evento.preventDefault()
      onElegir(visibles[indiceActivo])
    }
  }

  const resumen =
    coincidencias.length === 0
      ? 'Ninguna actividad coincide. Pruebe con otra palabra.'
      : coincidencias.length > MAXIMO
        ? `Mostrando ${MAXIMO} de ${coincidencias.length} actividades. Escriba más palabras para afinar.`
        : `${coincidencias.length} actividad${coincidencias.length === 1 ? '' : 'es'}`

  return (
    <Dialog open onOpenChange={(_, datos) => !datos.open && onCerrar()}>
      <DialogSurface className="bib-superficie">
        <DialogBody>
          <DialogTitle>Buscar ítem base</DialogTitle>
          <DialogContent className="bib-contenido">
            <p className="bib-ayuda">Elija una actividad de la base para agregarla al presupuesto.</p>
            {error && (
              <MessageBar intent="error">
                <MessageBarBody>{error}</MessageBarBody>
              </MessageBar>
            )}
            <Input
              aria-label="Buscar en la base de actividades"
              placeholder="Código, descripción, unidad o capítulo…"
              size="large"
              contentBefore={<IconoLupa />}
              value={texto}
              onChange={(_, d) => {
                setTexto(d.value)
                setActiva(0)
              }}
              onKeyDown={alTeclear}
              autoFocus
            />
            {actividades === null && !error ? (
              <Spinner label="Cargando la base de actividades…" />
            ) : (
              <>
                <div className="bib-lista" ref={listaRef}>
                  <Table size="small" aria-label="Resultados de la búsqueda" noNativeElements={false}>
                    <TableHeader className="bib-cabecera">
                      <TableRow>
                        <TableHeaderCell style={{ width: 96 }}>Código</TableHeaderCell>
                        <TableHeaderCell>Actividad</TableHeaderCell>
                        <TableHeaderCell style={{ width: 190 }}>Capítulo</TableHeaderCell>
                        <TableHeaderCell style={{ width: 70 }}>Unidad</TableHeaderCell>
                        <TableHeaderCell style={{ width: 130, textAlign: 'right' }}>Vr. unitario</TableHeaderCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visibles.map((a, i) => (
                        <TableRow
                          key={a.codigo}
                          className={i === indiceActivo ? 'bib-fila activa' : 'bib-fila'}
                          data-activa={i === indiceActivo}
                          aria-selected={i === indiceActivo}
                          onClick={() => onElegir(a)}
                          onMouseMove={() => i !== indiceActivo && setActiva(i)}
                        >
                          <TableCell className="bib-codigo">
                            {a.codigo}
                          </TableCell>
                          <TableCell>{a.descripcion}</TableCell>
                          <TableCell className="bib-capitulo">
                            {a.capitulo ? `${a.capitulo} · ${nombreCapitulo(a.capitulo)}` : 'Demostración'}
                          </TableCell>
                          <TableCell>{a.unidad}</TableCell>
                          <TableCell className="bib-valor">
                            $ {pesos(a.precioUnitario)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {visibles.length === 0 && <div className="bib-vacio">Sin actividades que coincidan.</div>}
                </div>
                <p role="status" className="bib-resumen">
                  {resumen}
                </p>
              </>
            )}
          </DialogContent>
          <DialogActions className="bib-acciones">
            <span className="bib-atajos">↑ ↓ moverse · Enter elegir · Esc cerrar</span>
            <Button appearance="secondary" onClick={onCerrar}>
              Cancelar
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}
