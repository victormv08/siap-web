import type { CapituloResultado, ItemResultado, Presupuesto } from '../api/cliente'
import { decimales, pesos } from '../formato'

interface Props {
  presupuesto: Presupuesto
  itemSeleccionado: string | null
  onSeleccionarItem: (codigo: string) => void
  onAbrirMedidor: (codigo: string) => void
  /** Códigos de las actividades cuya cantidad sale de una memoria de cálculo (guardadas en esta sesión). */
  conMemoria?: ReadonlySet<string>
  bloqueado: boolean
}

/** Icono de regla: abre el generador de cantidades. Decorativo; el botón lleva su nombre accesible. */
export function IconoMedir() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <rect x="2.5" y="8" width="19" height="8" rx="1.5" />
      <path d="M6.5 8v3.5M10.5 8v5M14.5 8v3.5M18.5 8v5" />
    </svg>
  )
}

/** Cuadro de costos directos con las columnas y el aspecto de la maqueta. */
export function CostosDirectos({ presupuesto, itemSeleccionado, onSeleccionarItem, onAbrirMedidor, conMemoria, bloqueado }: Props) {
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
            onAbrirMedidor={onAbrirMedidor}
            conMemoria={conMemoria}
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
  onAbrirMedidor: (codigo: string) => void
  conMemoria?: ReadonlySet<string>
  bloqueado: boolean
}

function FilasCapitulo({ indice, capitulo, itemSeleccionado, onSeleccionarItem, onAbrirMedidor, conMemoria, bloqueado }: FilasProps) {
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
          onAbrirMedidor={() => onAbrirMedidor(item.codigo)}
          onSeleccionar={() => onSeleccionarItem(item.codigo)}
          desdeMemoria={item.tieneMemoria === true || (conMemoria?.has(item.codigo) ?? false)}
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
  onAbrirMedidor: () => void
  /** La cantidad viene de una memoria de cálculo (se muestra la etiqueta «memoria»). */
  desdeMemoria: boolean
  bloqueado: boolean
}

function FilaItem({ codigo, item, seleccionado, onSeleccionar, onAbrirMedidor, desdeMemoria, bloqueado }: FilaProps) {
  const valorMostrado = decimales(item.cantidad)

  const clases = [item.excluido ? 'excl' : '', seleccionado ? 'seleccionada' : ''].filter(Boolean).join(' ')

  return (
    <tr className={clases} onClick={onSeleccionar} onDoubleClick={onAbrirMedidor} aria-selected={seleccionado} title="Doble clic: medidor de cantidades">
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
      <td className={desdeMemoria ? 'n con-memoria' : 'n'}>
        {/* La cantidad no se escribe a mano: tocarla abre el generador de cantidades (RD-067). */}
        <input
          aria-label={`Cantidad del ítem ${item.codigo}`}
          value={valorMostrado}
          readOnly
          disabled={bloqueado || item.excluido}
          title="Toque para medir la cantidad en el generador de cantidades"
          style={{ cursor: 'pointer' }}
          onClick={(evento) => {
            evento.stopPropagation()
            onSeleccionar()
            onAbrirMedidor()
          }}
          onDoubleClick={(evento) => evento.stopPropagation()}
          onKeyDown={(evento) => {
            if (evento.key === 'Enter' || evento.key === ' ') {
              evento.preventDefault()
              onSeleccionar()
              onAbrirMedidor()
            }
          }}
        />
        <button
          type="button"
          className="btn-medir"
          aria-label={`Medir cantidades de ${item.descripcion}`}
          title="Generador de cantidades (F6)"
          onClick={(evento) => {
            evento.stopPropagation()
            onAbrirMedidor()
          }}
          onDoubleClick={(evento) => evento.stopPropagation()}
        >
          <IconoMedir />
        </button>
        {desdeMemoria && (
          <span className="etiqueta memoria" title="La cantidad sale de la memoria de cálculo">
            memoria
          </span>
        )}
      </td>
      <td className="n">$ {pesos(item.precioUnitario)}</td>
      <td className="n">{item.excluido ? 'no suma' : `$ ${pesos(item.valorConsiderado)}`}</td>
    </tr>
  )
}
