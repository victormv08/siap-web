import { useState } from 'react'
import { Button, Dialog, DialogActions, DialogBody, DialogContent, DialogSurface, DialogTitle } from '@fluentui/react-components'

interface Props {
  titulo: string
  mensaje: string
  textoConfirmar: string
  onCancelar: () => void
  onConfirmar: () => Promise<void>
}

/** Pide confirmación antes de una acción que borra datos. Se monta solo mientras está abierto. */
export function DialogoConfirmar({ titulo, mensaje, textoConfirmar, onCancelar, onConfirmar }: Props) {
  const [enviando, setEnviando] = useState(false)

  async function confirmar() {
    setEnviando(true)
    try {
      await onConfirmar()
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialog open onOpenChange={(_, datos) => !datos.open && onCancelar()}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogContent>
            <p>{mensaje}</p>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onCancelar} disabled={enviando}>
              Cancelar
            </Button>
            <Button appearance="primary" onClick={() => void confirmar()} disabled={enviando}>
              {enviando ? 'Eliminando…' : textoConfirmar}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}
