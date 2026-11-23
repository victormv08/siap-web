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
import type { CapituloCatalogo } from '../api/cliente'

interface Props {
  abierto: boolean
  onCancelar: () => void
  onConfirmar: (nombre: string) => Promise<void>
}

/** Normaliza texto para buscar sin distinguir mayúsculas ni tildes. */
const normalizar = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/**
 * Formulario para crear un capítulo al final del presupuesto. El código lo asigna la API.
 * Muestra en una tabla buscable todos los capítulos del catálogo; al tocar uno, se copia su nombre.
 */
export function DialogoCapitulo({ abierto, onCancelar, onConfirmar }: Props) {
  const [nombre, setNombre] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [catalogo, setCatalogo] = useState<CapituloCatalogo[]>([])
  const [error, setError] = useState<string | null>(null)
  const valido = nombre.trim().length > 0

  useEffect(() => {
    if (!abierto) return
    let vigente = true
    api
      .catalogoCapitulos()
      .then((capitulos) => {
        if (vigente) setCatalogo(capitulos)
      })
      .catch((ex: unknown) => {
        if (vigente) setError(ex instanceof Error ? ex.message : 'No se pudo cargar el catálogo de capítulos.')
      })
    return () => {
      vigente = false
    }
  }, [abierto])

  const termino = normalizar(busqueda.trim())
  const resultados = termino
    ? catalogo.filter((c) => normalizar(`${c.numero} ${c.nombre}`).includes(termino))
    : catalogo

  function cerrar() {
    setNombre('')
    setBusqueda('')
    onCancelar()
  }

  async function confirmar() {
    if (!valido) return
    const limpio = nombre.trim()
    setNombre('')
    setBusqueda('')
    await onConfirmar(limpio)
  }

  return (
    <Dialog open={abierto} onOpenChange={(_, datos) => !datos.open && cerrar()}>
      <DialogSurface style={{ width: 'min(1100px, 92vw)', maxWidth: 'none' }}>
        <form
          onSubmit={(evento) => {
            evento.preventDefault()
            void confirmar()
          }}
        >
          <DialogBody>
            <DialogTitle>Agregar capítulo</DialogTitle>
            <DialogContent>
              {error && (
                <MessageBar intent="error">
                  <MessageBarBody>{error}</MessageBarBody>
                </MessageBar>
              )}
              <Field label="Buscar en el catálogo de capítulos">
                <Input
                  type="search"
                  placeholder="Buscar por número o nombre…"
                  aria-label="Buscar capítulo"
                  value={busqueda}
                  onChange={(_, datos) => setBusqueda(datos.value)}
                />
              </Field>
              <div className="dialogo-item-resultados">
                <Table size="small" aria-label="Capítulos del catálogo">
                  <TableHeader>
                    <TableRow>
                      <TableHeaderCell>Número</TableHeaderCell>
                      <TableHeaderCell>Nombre</TableHeaderCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resultados.map((c) => (
                      <TableRow
                        key={c.numero}
                        className={nombre === c.nombre ? 'dialogo-item-fila activa' : 'dialogo-item-fila'}
                        onClick={() => setNombre(c.nombre)}
                      >
                        <TableCell>{c.numero}</TableCell>
                        <TableCell>{c.nombre}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {resultados.length === 0 && <div className="dialogo-item-vacio">Sin capítulos que coincidan.</div>}
              </div>
              <Field label="Nombre del capítulo" required hint="Toque un capítulo de la tabla o escriba uno nuevo, por ejemplo: PRELIMINARES o CIMENTACIONES.">
                <Input value={nombre} onChange={(_, datos) => setNombre(datos.value)} autoFocus />
              </Field>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={cerrar}>
                Cancelar
              </Button>
              <Button type="submit" appearance="primary" disabled={!valido}>
                Crear capítulo
              </Button>
            </DialogActions>
          </DialogBody>
        </form>
      </DialogSurface>
    </Dialog>
  )
}
