import { useRef, useState } from 'react'
import type { ItemResultado } from '../api/cliente'
import { decimales } from '../formato'
import { aNumero } from './pegadoFilas'

interface Props {
  item: ItemResultado
  /** La cantidad sale de una memoria de cálculo: no se escribe a mano, tocarla abre el generador. */
  desdeMemoria: boolean
  bloqueado?: boolean
  onSeleccionar?: () => void
  onAbrirMedidor: () => void
  /** Guarda una cantidad escrita a mano. Sin esta función, la celda es de solo lectura. */
  onCambiarCantidad?: (cantidad: number) => Promise<void>
}

/**
 * La cantidad de un ítem, en cualquier tabla. Dos formas de ponerla: escribirla aquí (Enter guarda, Escape cancela) o medirla
 * en el generador y guardar las medidas. Con memoria de cálculo la cantidad es el total de las medidas, así que es de solo
 * lectura y tocarla abre el generador.
 */
export function CeldaCantidad({ item, desdeMemoria, bloqueado = false, onSeleccionar, onAbrirMedidor, onCambiarCantidad }: Props) {
  const valorMostrado = decimales(item.cantidad)
  // Mientras la persona escribe, la celda guarda su borrador; null = se muestra el valor guardado.
  const [borrador, setBorrador] = useState<string | null>(null)
  // Escape cancela: el blur que viene después no debe guardar el borrador.
  const cancelado = useRef(false)
  const editable = !desdeMemoria && onCambiarCantidad !== undefined

  async function confirmar() {
    if (cancelado.current) {
      cancelado.current = false
      setBorrador(null)
      return
    }
    if (borrador === null || !onCambiarCantidad) return
    const texto = borrador
    setBorrador(null)
    const numero = aNumero(texto)
    if (numero === null || numero < 0 || numero === item.cantidad) return
    await onCambiarCantidad(numero)
  }

  if (editable) {
    return (
      <input
        aria-label={`Cantidad del ítem ${item.codigo}`}
        inputMode="decimal"
        value={borrador ?? valorMostrado}
        disabled={bloqueado || item.excluido}
        title="Escriba la cantidad, o use la regla para medirla en el generador"
        onClick={(evento) => evento.stopPropagation()}
        onDoubleClick={(evento) => evento.stopPropagation()}
        onFocus={(evento) => {
          onSeleccionar?.()
          evento.currentTarget.select()
        }}
        onChange={(evento) => setBorrador(evento.target.value)}
        onBlur={() => void confirmar()}
        onKeyDown={(evento) => {
          if (evento.key === 'Enter') {
            evento.preventDefault()
            evento.currentTarget.blur()
          } else if (evento.key === 'Escape') {
            cancelado.current = true
            evento.currentTarget.blur()
          }
        }}
      />
    )
  }

  return (
    <input
      aria-label={`Cantidad del ítem ${item.codigo}`}
      value={valorMostrado}
      readOnly
      disabled={bloqueado || item.excluido}
      title="La cantidad sale de la memoria de cálculo: toque para abrir el generador y cambiar las medidas"
      style={{ cursor: 'pointer' }}
      onClick={(evento) => {
        evento.stopPropagation()
        onSeleccionar?.()
        onAbrirMedidor()
      }}
      onDoubleClick={(evento) => evento.stopPropagation()}
      onKeyDown={(evento) => {
        if (evento.key === 'Enter' || evento.key === ' ') {
          evento.preventDefault()
          onSeleccionar?.()
          onAbrirMedidor()
        }
      }}
    />
  )
}
