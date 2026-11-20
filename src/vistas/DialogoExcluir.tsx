import { useState } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Textarea,
} from '@fluentui/react-components'

interface Props {
  abierto: boolean
  descripcion: string
  onCancelar: () => void
  onConfirmar: (motivo: string) => Promise<void>
}

/** Excluir un ítem exige un motivo (R-005): el ítem queda visible, con su motivo, y no suma. */
export function DialogoExcluir({ abierto, descripcion, onCancelar, onConfirmar }: Props) {
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const valido = motivo.trim().length > 0

  async function confirmar() {
    if (!valido) return
    setEnviando(true)
    try {
      await onConfirmar(motivo.trim())
      setMotivo('')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialog
      open={abierto}
      onOpenChange={(_, datos) => {
        if (!datos.open) onCancelar()
      }}
    >
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Excluir ítem</DialogTitle>
          <DialogContent>
            <p>
              «{descripcion}» dejará de sumar al presupuesto. Seguirá visible, con su motivo y su cantidad original.
            </p>
            <Field label="Motivo de la exclusión" required>
              <Textarea value={motivo} onChange={(_, d) => setMotivo(d.value)} resize="vertical" />
            </Field>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onCancelar} disabled={enviando}>
              Cancelar
            </Button>
            <Button appearance="primary" onClick={() => void confirmar()} disabled={!valido || enviando}>
              Excluir
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}
