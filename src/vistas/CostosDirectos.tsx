import { useState } from 'react'
import type { CapituloResultado, ItemResultado, Presupuesto } from '../api/cliente'
import { decimales, pesos } from '../formato'

interface Props {
  presupuesto: Presupuesto
  itemSeleccionado: string | null
  onSeleccionarItem: (codigo: string) => void
  onCambiarCantidad: (item: ItemResultado, cantidad: number) => Promise<void>
  bloqueado: boolean
}

/** Convierte lo que escribe la persona («12,5» o «12.5») en un número. Es entrada, no cálculo. */
function leerCantidad(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.')
  if (limpio === '') return null
  const valor = Number(limpio)
  return Number.isFinite(valor) ? valor : null
}

/** Cuadro de costos directos con las columnas y el aspecto de la maqueta. */
export function CostosDirectos({ presupuesto, itemSeleccionado, onSeleccionarItem, onCambiarCantidad, bloqueado }: Props) {
  return (
    <table className="g" aria-label="Ítems del presupuesto">
      <thead>
        <tr>
          <th style={{ width: 90 }}>Ítem</th>
          <th>Actividad</th>
          <th style={{ width: 90 }}>Unidad</th>
          <th style={{ width: 150 }}>Cantidad</th>
          <th style={{ width: 150 }}>Vr. unitario</th>
          <th style={{ width: 170 }}>Vr. total</th>
        </tr>
      </thead>
      <tbody>
        {presupuesto.capitulos.map((capitulo, indice) => (
          <FilasCapitulo
            key={capitulo.codigo}
            indice={indice}
            capitulo={capitulo}
            itemSeleccionado={itemSeleccionado}
            onSeleccionarItem={onSeleccionarItem}
            onCambiarCantidad={onCambiarCantidad}
            bloqueado={bloqueado}
          />
        ))}
        <tr className="capsum">
          <td />
          <td>TOTAL COSTO DIRECTO</td>
          <td />
          <td />
          <td />
          <td className="n">$ {pesos(presupuesto.costoDirecto)}</td>
        </tr>
      </tbody>
    </table>
  )
}

interface FilasProps {
  indice: number
  capitulo: CapituloResultado
  itemSeleccionado: string | null
  onSeleccionarItem: (codigo: string) => void
  onCambiarCantidad: (item: ItemResultado, cantidad: number) => Promise<void>
  bloqueado: boolean
}

function FilasCapitulo({ indice, capitulo, itemSeleccionado, onSeleccionarItem, onCambiarCantidad, bloqueado }: FilasProps) {
  return (
    <>
      <tr className="cap" id={`capitulo-${capitulo.codigo}`}>
        <td>▾ {indice + 1}</td>
        <td>{capitulo.nombre}</td>
        <td />
        <td />
        <td />
        <td className="n">$ {pesos(capitulo.subtotal)}</td>
      </tr>
      {capitulo.items.map((item, ii) => (
        <FilaItem
          key={item.codigo}
          codigo={`${indice + 1}.${ii + 1}`}
          item={item}
          seleccionado={itemSeleccionado === item.codigo}
          onSeleccionar={() => onSeleccionarItem(item.codigo)}
          onCambiarCantidad={(cantidad) => onCambiarCantidad(item, cantidad)}
          bloqueado={bloqueado}
        />
      ))}
      <tr className="capsum">
        <td />
        <td>Subtotal {indice + 1}. {capitulo.nombre}</td>
        <td />
        <td />
        <td />
        <td className="n">$ {pesos(capitulo.subtotal)}</td>
      </tr>
    </>
  )
}

interface FilaProps {
  codigo: string
  item: ItemResultado
  seleccionado: boolean
  onSeleccionar: () => void
  onCambiarCantidad: (cantidad: number) => Promise<void>
  bloqueado: boolean
}

function FilaItem({ codigo, item, seleccionado, onSeleccionar, onCambiarCantidad, bloqueado }: FilaProps) {
  const [borrador, setBorrador] = useState<string | null>(null)
  const valorMostrado = borrador ?? decimales(item.cantidad)

  async function confirmar() {
    if (borrador === null) return
    const cantidad = leerCantidad(borrador)
    setBorrador(null)
    if (cantidad === null || cantidad === item.cantidad) return
    await onCambiarCantidad(cantidad)
  }

  const clases = [item.excluido ? 'excl' : '', seleccionado ? 'seleccionada' : ''].filter(Boolean).join(' ')

  return (
    <tr className={clases} onClick={onSeleccionar} aria-selected={seleccionado}>
      <td>{codigo}</td>
      <td className="desc">
        {item.descripcion}
        {item.excluido && (
          <span className="etiqueta" title={item.motivoExclusion ?? undefined}>
            excluido
          </span>
        )}
        {item.excluido && item.motivoExclusion && <span className="etiqueta neutra">{item.motivoExclusion}</span>}
      </td>
      <td>{item.unidad}</td>
      <td className="n">
        <input
          aria-label={`Cantidad del ítem ${item.codigo}`}
          value={valorMostrado}
          disabled={bloqueado || item.excluido}
          onClick={(evento) => evento.stopPropagation()}
          onChange={(evento) => setBorrador(evento.target.value)}
          onBlur={() => void confirmar()}
          onKeyDown={(evento) => {
            if (evento.key === 'Enter') void confirmar()
            if (evento.key === 'Escape') setBorrador(null)
          }}
        />
      </td>
      <td className="n">$ {pesos(item.precioUnitario)}</td>
      <td className="n">{item.excluido ? 'no suma' : `$ ${pesos(item.valorConsiderado)}`}</td>
    </tr>
  )
}
