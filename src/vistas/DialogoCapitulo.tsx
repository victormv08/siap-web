import { useState } from 'react'
import { Button, Dialog, DialogActions, DialogBody, DialogContent, DialogSurface, DialogTitle, Field, Input } from '@fluentui/react-components'

interface Props {
  abierto: boolean
  onCancelar: () => void
  onConfirmar: (nombre: string) => Promise<void>
}

/** Formulario para crear un capítulo al final del presupuesto. El código lo asigna la API. */
export function DialogoCapitulo({ abierto, onCancelar, onConfirmar }: Props) {
  const [nombre, setNombre] = useState('')
  const valido = nombre.trim().length > 0

  function cerrar() {
    setNombre('')
    onCancelar()
  }

  async function confirmar() {
    if (!valido) return
    const limpio = nombre.trim()
    setNombre('')
    await onConfirmar(limpio)
  }

  return (
    <Dialog open={abierto} onOpenChange={(_, datos) => !datos.open && cerrar()}>
      <DialogSurface>
        <form
          onSubmit={(evento) => {
            evento.preventDefault()
            void confirmar()
          }}
        >
          <DialogBody>
            <DialogTitle>Agregar capítulo</DialogTitle>
            <DialogContent>
              <Field label="Nombre del capítulo" required hint="Por ejemplo: PRELIMINARES o CIMENTACIONES.">
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
