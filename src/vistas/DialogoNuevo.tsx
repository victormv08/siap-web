import { useEffect, useRef, useState } from 'react'
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

const MAXIMO_NOMBRE = 200

interface Props {
  /** Crea el presupuesto. Si falla, el diálogo muestra el error y sigue abierto. */
  onCrear: (nombre: string) => Promise<void>
  onCerrar: () => void
}

/** Diálogo «Nuevo presupuesto»: pide el nombre (obligatorio, hasta 200 caracteres). Enter crea. */
export function DialogoNuevo({ onCrear, onCerrar }: Props) {
  const [nombre, setNombre] = useState('')
  const [creando, setCreando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const refNombre = useRef<HTMLInputElement>(null)
  const limpio = nombre.trim()
  const valido = limpio.length > 0 && limpio.length <= MAXIMO_NOMBRE

  // Al abrir, el foco va al campo del nombre. Fluent deja el foco en la superficie del diálogo, así que se pide aquí.
  useEffect(() => {
    refNombre.current?.focus()
  }, [])

  async function crear() {
    if (!valido || creando) return
    setCreando(true)
    setError(null)
    try {
      await onCrear(limpio)
    } catch (ex) {
      setError(ex instanceof Error && ex.message ? ex.message : 'No se pudo crear el presupuesto.')
    } finally {
      setCreando(false)
    }
  }

  return (
    <Dialog open onOpenChange={(_, datos) => !datos.open && onCerrar()}>
      <DialogSurface>
        <form
          onSubmit={(evento) => {
            evento.preventDefault()
            void crear()
          }}
        >
          <DialogBody>
            <DialogTitle>Nuevo presupuesto</DialogTitle>
            <DialogContent>
              {error && (
                <div role="alert">
                  <MessageBar intent="error">
                    <MessageBarBody>{error}</MessageBarBody>
                  </MessageBar>
                </div>
              )}
              <Field label="Nombre del presupuesto" required hint={`Hasta ${MAXIMO_NOMBRE} caracteres.`}>
                <Input ref={refNombre} value={nombre} onChange={(_, datos) => setNombre(datos.value)} maxLength={MAXIMO_NOMBRE} />
              </Field>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={onCerrar} disabled={creando}>
                Cancelar
              </Button>
              <Button type="submit" appearance="primary" disabled={!valido || creando}>
                {creando ? 'Creando…' : 'Crear presupuesto'}
              </Button>
            </DialogActions>
          </DialogBody>
        </form>
      </DialogSurface>
    </Dialog>
  )
}
