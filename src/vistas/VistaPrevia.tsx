import { useState } from 'react'
import type { Presupuesto } from '../api/cliente'
import { decimales, pesos, porcentaje } from '../formato'
import { HojaPagina } from './HojaPagina'

interface Props {
  presupuesto: Presupuesto
  empresa?: string
}

/**
 * Vista previa del presupuesto completo, como saldría impreso: capítulos con sus ítems y subtotales, el costo
 * directo y debajo el cierre (administración, imprevistos, utilidad, IVA sobre la utilidad) hasta el total.
 * Todos los valores los entrega la API; aquí solo se les da formato (D-27). Los ítems excluidos se muestran
 * marcados y sin valor, porque no suman.
 */
export function VistaPrevia({ presupuesto, empresa }: Props) {
  const hayItems = presupuesto.capitulos.some((c) => c.items.length > 0)
  // La fecha se toma una sola vez al abrir la vista (no cambia en cada dibujado).
  const [fecha] = useState(() => new Intl.DateTimeFormat('es-CO', { dateStyle: 'long' }).format(new Date()))

  return (
    <HojaPagina
      etiqueta="Vista previa del presupuesto"
      titulo="Vista previa del presupuesto"
      descripcion="Así se ve el presupuesto completo con el AIU incluido. Los valores los calcula la API."
    >
      <div className="vp-acciones">
        <button type="button" className="vp-imprimir" onClick={() => window.print()}>
          Imprimir
        </button>
      </div>

      <article className="vp-documento" aria-label="Documento del presupuesto">
        <header className="vp-cabecera">
          <h3 className="vp-nombre">{presupuesto.nombre}</h3>
          <p className="vp-meta">
            {empresa ? `${empresa} · ` : ''}
            {fecha}
          </p>
        </header>

        {!hayItems && <p className="vp-vacio">Este presupuesto todavía no tiene ítems. Agrega capítulos e ítems en Costos directos.</p>}

        <table className="vp-tabla" aria-label="Capítulos e ítems del presupuesto">
          <colgroup>
            <col style={{ width: '8%' }} />
            <col />
            <col style={{ width: '8%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '16%' }} />
          </colgroup>
          <thead>
            <tr>
              <th scope="col">Ítem</th>
              <th scope="col">Descripción</th>
              <th scope="col">Und.</th>
              <th scope="col" className="n">Cantidad</th>
              <th scope="col" className="n">Vr. unitario</th>
              <th scope="col" className="n">Vr. total</th>
            </tr>
          </thead>
          {presupuesto.capitulos.map((c) => (
            <tbody key={c.codigo}>
              <tr className="vp-capitulo">
                <td>{c.codigo}</td>
                <td colSpan={5}>{c.nombre}</td>
              </tr>
              {c.items.map((i) => (
                <tr key={i.codigo} className={i.excluido ? 'vp-excluido' : undefined}>
                  <td>{i.codigo}</td>
                  <td>
                    {i.descripcion}
                    {i.excluido && <span className="etiqueta"> excluido</span>}
                  </td>
                  <td>{i.unidad}</td>
                  <td className="n">{decimales(i.cantidad)}</td>
                  <td className="n">$ {pesos(i.precioUnitario)}</td>
                  <td className="n">{i.excluido ? '—' : `$ ${pesos(i.valorConsiderado)}`}</td>
                </tr>
              ))}
              <tr className="vp-subtotal">
                <td colSpan={5}>Subtotal {c.codigo}. {c.nombre}</td>
                <td className="n">$ {pesos(c.subtotal)}</td>
              </tr>
            </tbody>
          ))}
        </table>

        <table className="vp-tabla vp-cierre" aria-label="Costo directo, AIU e IVA">
          <colgroup>
            <col />
            <col style={{ width: '12%' }} />
            <col style={{ width: '16%' }} />
          </colgroup>
          <thead>
            <tr>
              <th scope="col">Concepto</th>
              <th scope="col" className="n">%</th>
              <th scope="col" className="n">Valor</th>
            </tr>
          </thead>
          <tbody>
            {presupuesto.cierre.map((linea) => (
              <tr key={linea.concepto} className={linea.concepto === 'Total del presupuesto' ? 'vp-total' : undefined}>
                <td>{linea.concepto}</td>
                <td className="n">{porcentaje(linea.porcentaje)}</td>
                <td className="n">$ {pesos(linea.monto)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </HojaPagina>
  )
}
