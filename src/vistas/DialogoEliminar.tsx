import { useState } from 'react'
import { Button, Dialog, DialogActions, DialogBody, DialogContent, DialogSurface, DialogTitle } from '@fluentui/react-components'

interface Props {
  abierto: boolean
  descripcion: string
  onCancelar: () => void
  onConfirmar: () => Promise<void>
}

/** Confirma la eliminación de un ítem. Se puede deshacer, pero se pregunta igual: borra también su memoria de cantidades. */
export function DialogoEliminar({ abierto, descripcion, onCancelar, onConfirmar }: Props) {
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
    <Dialog open={abierto} onOpenChange={(_, datos) => !datos.open && onCancelar()}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Eliminar ítem</DialogTitle>
          <DialogContent>
            <p>
              «{descripcion}» se quitará del presupuesto junto con su memoria de cantidades. Puede recuperarlo con Deshacer.
            </p>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onCancelar} disabled={enviando}>
              Cancelar
            </Button>
            <Button appearance="primary" onClick={() => void confirmar()} disabled={enviando}>
              {enviando ? 'Eliminando…' : 'Eliminar'}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}
