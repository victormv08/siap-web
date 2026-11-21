import type { Presupuesto } from '../api/cliente'
import { decimales } from '../formato'
import { IconoMedir } from './CostosDirectos'

interface Props {
  presupuesto: Presupuesto
  onAbrirMedidor: (codigo: string) => void
  /** Códigos de las actividades cuya cantidad sale de una memoria de cálculo (guardadas en esta sesión). */
  conMemoria?: ReadonlySet<string>
}

/**
 * Hoja de cantidades: todas las actividades del presupuesto con su cantidad, agrupadas por capítulo.
 * Los datos vienen ya calculados por la API. El botón «Medir» (o doble clic) abre el generador de cantidades.
 */
export function Cantidades({ presupuesto, onAbrirMedidor, conMemoria }: Props) {
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
            />
          ))}
        </tbody>
      </table>
      <p style={{ marginTop: 12, opacity: 0.8 }}>
        {totalItems} actividades. Pulse «Medir» en una actividad para abrir su generador de cantidades (también:
        doble clic en la fila, o seleccione una actividad en Costos directos y pulse F6).
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
}

function CapituloCantidades({ indice, nombre, items, onAbrirMedidor, conMemoria }: CapituloProps) {
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
            {decimales(item.cantidad)}
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
