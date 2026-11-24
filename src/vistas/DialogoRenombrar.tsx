import { useState } from 'react'
import { Button, Dialog, DialogActions, DialogBody, DialogContent, DialogSurface, DialogTitle, Field, Input } from '@fluentui/react-components'

interface Props {
  titulo: string
  etiqueta: string
  valorInicial: string
  onCancelar: () => void
  onConfirmar: (nombre: string) => Promise<void>
}

/** Cambia el nombre de un presupuesto o de un capítulo. Se monta solo mientras está abierto, así siempre parte del nombre actual. */
export function DialogoRenombrar({ titulo, etiqueta, valorInicial, onCancelar, onConfirmar }: Props) {
  const [nombre, setNombre] = useState(valorInicial)
  const [enviando, setEnviando] = useState(false)
  const valido = nombre.trim().length > 0 && nombre.trim() !== valorInicial

  async function confirmar() {
    if (!valido) return
    setEnviando(true)
    try {
      await onConfirmar(nombre.trim())
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialog open onOpenChange={(_, datos) => !datos.open && onCancelar()}>
      <DialogSurface>
        <form
          onSubmit={(evento) => {
            evento.preventDefault()
            void confirmar()
          }}
        >
          <DialogBody>
            <DialogTitle>{titulo}</DialogTitle>
            <DialogContent>
              <Field label={etiqueta} required>
                <Input value={nombre} onChange={(_, datos) => setNombre(datos.value)} autoFocus />
              </Field>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={onCancelar} disabled={enviando}>
                Cancelar
              </Button>
              <Button type="submit" appearance="primary" disabled={!valido || enviando}>
                {enviando ? 'Guardando…' : 'Guardar'}
              </Button>
            </DialogActions>
          </DialogBody>
        </form>
      </DialogSurface>
    </Dialog>
  )
}
