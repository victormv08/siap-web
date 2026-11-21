import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  MessageBar,
  MessageBarBody,
  Spinner,
  Text,
} from '@fluentui/react-components'
import { api } from '../api/cliente'
import type { ResumenPresupuesto } from '../api/cliente'
import { pesos } from '../formato'

interface Props {
  /** Presupuesto que está abierto ahora, para marcarlo y llevar el foco a él. */
  actualId: string | null
  /** Carga el presupuesto elegido. Si falla, el diálogo muestra el error y sigue abierto. */
  onElegir: (id: string) => Promise<void>
  onCerrar: () => void
}

function mensajeDe(ex: unknown, respaldo: string): string {
  return ex instanceof Error && ex.message ? ex.message : respaldo
}

/**
 * Diálogo «Abrir presupuesto»: consulta la lista de la API al abrirse y deja elegir uno con clic, Enter o
 * las flechas. Solo da formato a los valores que entrega la API; no calcula nada (D-27).
 * La API devuelve los presupuestos del más antiguo al más reciente: el primero es el «Inicial».
 */
export function DialogoAbrir({ actualId, onElegir, onCerrar }: Props) {
  const [lista, setLista] = useState<ResumenPresupuesto[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [abriendo, setAbriendo] = useState<string | null>(null)
  const refLista = useRef<HTMLUListElement>(null)

  useEffect(() => {
    let vigente = true
    api
      .listar()
      .then((resumen) => vigente && setLista(resumen))
      .catch((ex: unknown) => vigente && setError(mensajeDe(ex, 'No se pudo cargar la lista de presupuestos.')))
    return () => {
      vigente = false
    }
  }, [])

  // Al abrir, el foco va al presupuesto actual (o al primero si no hay uno abierto).
  useEffect(() => {
    if (!lista || lista.length === 0) return
    const opciones = Array.from(refLista.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])
    const destino = opciones.find((o) => o.dataset.id === actualId) ?? opciones[0]
    destino?.focus()
  }, [lista, actualId])

  async function elegir(id: string) {
    if (abriendo) return
    setAbriendo(id)
    setError(null)
    try {
      await onElegir(id)
    } catch (ex) {
      setError(mensajeDe(ex, 'No se pudo abrir el presupuesto.'))
    } finally {
      setAbriendo(null)
    }
  }

  function alTeclear(evento: KeyboardEvent<HTMLElement>, id: string) {
    const opciones = Array.from(refLista.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])
    const actual = opciones.indexOf(evento.currentTarget)
    const mover = (destino: number) => {
      evento.preventDefault()
      opciones[Math.max(0, Math.min(opciones.length - 1, destino))]?.focus()
    }
    if (evento.key === 'ArrowDown') mover(actual + 1)
    else if (evento.key === 'ArrowUp') mover(actual - 1)
    else if (evento.key === 'Home') mover(0)
    else if (evento.key === 'End') mover(opciones.length - 1)
    else if (evento.key === 'Enter' || evento.key === ' ') {
      evento.preventDefault()
      void elegir(id)
    }
  }

  const indiceTabulable = Math.max(0, lista?.findIndex((p) => p.id === actualId) ?? 0)

  return (
    <Dialog open onOpenChange={(_, datos) => !datos.open && onCerrar()}>
      <DialogSurface style={{ maxWidth: 640, width: '95vw' }}>
        <DialogBody>
          <DialogTitle>Abrir presupuesto</DialogTitle>
          <DialogContent>
            {error && (
              <div role="alert">
                <MessageBar intent="error">
                  <MessageBarBody>{error}</MessageBarBody>
                </MessageBar>
              </div>
            )}

            {!lista && !error && <Spinner label="Cargando presupuestos…" />}

            {lista && lista.length === 0 && (
              <Text as="p">No hay presupuestos todavía. Use «Nuevo» para crear uno.</Text>
            )}

            {lista && lista.length > 0 && (
              <ul ref={refLista} role="listbox" aria-label="Presupuestos" className="lista-presupuestos">
                {lista.map((p, i) => {
                  const abierto = p.id === actualId
                  return (
                    <li
                      key={p.id}
                      role="option"
                      aria-selected={abierto}
                      data-id={p.id}
                      tabIndex={i === indiceTabulable ? 0 : -1}
                      className={abierto ? 'presupuesto-opcion actual' : 'presupuesto-opcion'}
                      onClick={() => void elegir(p.id)}
                      onKeyDown={(e) => alTeclear(e, p.id)}
                    >
                      <span className="presupuesto-nombre">
                        {p.nombre}
                        {i === 0 && <span className="etiqueta">Inicial</span>}
                        {abierto && <span className="etiqueta memoria">Abierto</span>}
                      </span>
                      <span className="presupuesto-cifras">
                        Costo directo $ {pesos(p.costoDirecto)} · Total $ {pesos(p.total)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
            {abriendo && <Spinner size="tiny" label="Abriendo…" />}
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
