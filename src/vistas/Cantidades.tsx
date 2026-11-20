import type { Presupuesto } from '../api/cliente'
import { decimales } from '../formato'

interface Props {
  presupuesto: Presupuesto
  onAbrirMedidor: (codigo: string) => void
}

/**
 * Hoja de cantidades: todas las actividades del presupuesto con su cantidad, agrupadas por capítulo.
 * Los datos vienen ya calculados por la API. Doble clic en una actividad abre su medidor de cantidades.
 */
export function Cantidades({ presupuesto, onAbrirMedidor }: Props) {
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
            />
          ))}
        </tbody>
      </table>
      <p style={{ marginTop: 12, opacity: 0.8 }}>
        {totalItems} actividades. Doble clic en una actividad para medir sus cantidades.
      </p>
    </section>
  )
}

interface CapituloProps {
  indice: number
  nombre: string
  items: Presupuesto['capitulos'][number]['items']
  onAbrirMedidor: (codigo: string) => void
}

function CapituloCantidades({ indice, nombre, items, onAbrirMedidor }: CapituloProps) {
  return (
    <>
      <tr className="cap">
        <td>▾ {indice + 1}</td>
        <td colSpan={4}>{nombre}</td>
      </tr>
      {items.map((item, ii) => (
        <tr
          key={item.codigo}
          className={item.excluido ? 'excl' : undefined}
          onDoubleClick={() => onAbrirMedidor(item.codigo)}
          title="Doble clic: medidor de cantidades"
        >
          <td>{`${indice + 1}.${ii + 1}`}</td>
          <td className="desc">{item.descripcion}</td>
          <td>{item.unidad}</td>
          <td className="n">{decimales(item.cantidad)}</td>
          <td>{item.excluido ? (item.motivoExclusion ?? 'Excluido') : 'Considerada'}</td>
        </tr>
      ))}
    </>
  )
}
