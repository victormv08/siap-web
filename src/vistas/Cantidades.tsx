import type { Presupuesto } from '../api/cliente'
import { CeldaCantidad } from './CeldaCantidad'
import { IconoMedir } from './CostosDirectos'

interface Props {
  presupuesto: Presupuesto
  onAbrirMedidor: (codigo: string) => void
  /** Códigos de las actividades cuya cantidad sale de una memoria de cálculo (guardadas en esta sesión). */
  conMemoria?: ReadonlySet<string>
  /** Guarda una cantidad escrita a mano. */
  onCambiarCantidad?: (codigo: string, cantidad: number) => Promise<void>
}

/**
 * Hoja de cantidades: todas las actividades del presupuesto con su cantidad, agrupadas por capítulo. Aquí se ven y se
 * modifican: se escribe la cantidad en la celda (Enter guarda), o se mide con el botón «Medir» (o doble clic) y se guardan
 * las medidas. Los datos vienen ya calculados por la API.
 */
export function Cantidades({ presupuesto, onAbrirMedidor, conMemoria, onCambiarCantidad }: Props) {
  const totalItems = presupuesto.capitulos.reduce((n, c) => n + c.items.length, 0)

  return (
    <section aria-label="Cantidades de todas las actividades" style={{ padding: 16 }}>
      <table className="g" aria-label="Cantidades por actividad" style={{ width: '100%' }}>
        <thead>
          <tr>
            <th style={{ width: 90 }}>Ítem</th>
            <th>Actividad</th>
            <th style={{ width: 90 }}>Unidad</th>
            <th style={{ width: 140 }} className="n">Cantidad</th>
            <th style={{ width: 120 }}>Estado</th>
            <th style={{ width: 110 }}>Generador</th>
          </tr>
        </thead>
        <tbody>
          {presupuesto.capitulos.map((capitulo, indice) => (
            <CapituloCantidades
              key={capitulo.codigo}
              indice={indice}
              nombre={capitulo.nombre}
              items={capitulo.items}
              onAbrirMedidor={onAbrirMedidor}
              conMemoria={conMemoria}
              onCambiarCantidad={onCambiarCantidad}
            />
          ))}
        </tbody>
      </table>
      <p style={{ marginTop: 12, opacity: 0.8 }}>
        {totalItems} actividades. Escriba la cantidad en la celda y pulse Enter, o pulse «Medir» para abrir el generador y
        guardar las medidas (también: doble clic en la fila, o F6 con una actividad seleccionada). Las que tienen memoria de
        cálculo solo se cambian desde el generador.
      </p>
    </section>
  )
}

interface CapituloProps {
  indice: number
  nombre: string
  items: Presupuesto['capitulos'][number]['items']
  onAbrirMedidor: (codigo: string) => void
  conMemoria?: ReadonlySet<string>
  onCambiarCantidad?: (codigo: string, cantidad: number) => Promise<void>
}

function CapituloCantidades({ indice, nombre, items, onAbrirMedidor, conMemoria, onCambiarCantidad }: CapituloProps) {
  return (
    <>
      <tr className="cap">
        <td>▾ {indice + 1}</td>
        <td colSpan={5}>{nombre}</td>
      </tr>
      {items.map((item, ii) => (
        <tr
          key={item.codigo}
          className={item.excluido ? 'excl' : undefined}
          onDoubleClick={() => onAbrirMedidor(item.codigo)}
          title="Doble clic: generador de cantidades"
        >
          <td>{`${indice + 1}.${ii + 1}`}</td>
          <td className="desc">{item.descripcion}</td>
          <td>{item.unidad}</td>
          <td className="n">
            <CeldaCantidad
              item={item}
              desdeMemoria={item.tieneMemoria === true || (conMemoria?.has(item.codigo) ?? false)}
              onAbrirMedidor={() => onAbrirMedidor(item.codigo)}
              onCambiarCantidad={onCambiarCantidad ? (cantidad) => onCambiarCantidad(item.codigo, cantidad) : undefined}
            />
            {(item.tieneMemoria === true || conMemoria?.has(item.codigo)) && (
              <span className="etiqueta memoria" title="La cantidad sale de la memoria de cálculo">
                memoria
              </span>
            )}
          </td>
          <td>{item.excluido ? (item.motivoExclusion ?? 'Excluido') : 'Considerada'}</td>
          <td>
            <button
              type="button"
              className="btn-celda-medir"
              aria-label={`Medir cantidades de ${item.descripcion}`}
              onClick={() => onAbrirMedidor(item.codigo)}
            >
              <IconoMedir /> Medir
            </button>
          </td>
        </tr>
      ))}
    </>
  )
}
