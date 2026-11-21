import { useEffect, useState } from 'react'
import { MessageBar, MessageBarBody, Spinner, Text } from '@fluentui/react-components'
import { api } from '../api/cliente'
import type { EntradaHistorial, FilaFormulario, ResumenDesagregado, TipoLinea } from '../api/cliente'
import { decimales, pesos } from '../formato'
import { HojaPagina } from './HojaPagina'

/** Nombres de las categorías del resumen, en el orden de la maqueta. */
const ETIQUETAS: Record<TipoLinea, string> = {
  Material: 'Materiales',
  ManoDeObra: 'Mano de obra',
  Equipo: 'Equipo y herramienta',
  Transporte: 'Transporte',
  Otro: 'Otros',
}

interface VistaProps {
  presupuestoId: string
}

/** Carga un recurso de la API al montarse. La vista se remonta al cambiar el presupuesto, así que no hace falta reiniciar estado. */
function useRecurso<T>(id: string, cargar: (id: string) => Promise<T>): { datos: T | null; error: string | null } {
  const [datos, setDatos] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let vigente = true
    cargar(id)
      .then((d) => {
        if (vigente) setDatos(d)
      })
      .catch((ex: unknown) => {
        if (vigente) setError(ex instanceof Error ? ex.message : 'No se pudo cargar la información.')
      })
    return () => {
      vigente = false
    }
  }, [id, cargar])
  return { datos, error }
}

/** Costo directo separado por materiales, mano de obra, equipo, transporte y otros. */
export function ResumenDesagregadoVista({ presupuestoId }: VistaProps) {
  const { datos, error } = useRecurso<ResumenDesagregado>(presupuestoId, api.resumenDesagregado)
  return (
    <HojaPagina
      etiqueta="Resumen desagregado"
      titulo="Resumen desagregado"
      descripcion="El costo directo separado por tipo de insumo, tal como lo calcula la API."
    >
      {error && (
        <MessageBar intent="error">
          <MessageBarBody>{error}</MessageBarBody>
        </MessageBar>
      )}
      {!datos && !error && <Spinner label="Calculando…" />}
      {datos && (
        <>
          <table className="g" aria-label="Costo directo por tipo" style={{ width: '100%', marginTop: 12 }}>
            <thead>
              <tr>
                <th>Tipo</th>
                <th className="n" style={{ width: 160 }}>Monto</th>
                <th className="n" style={{ width: 100 }}>Participación</th>
              </tr>
            </thead>
            <tbody>
              {datos.categorias.map((c) => (
                <tr key={c.tipo}>
                  <td>{ETIQUETAS[c.tipo]}</td>
                  <td className="n">$ {pesos(c.monto)}</td>
                  <td className="n">{decimales(c.porcentaje)} %</td>
                </tr>
              ))}
              <tr className="capsum">
                <td>Total por tipo</td>
                <td className="n">$ {pesos(datos.total)}</td>
                <td className="n">100 %</td>
              </tr>
            </tbody>
          </table>
          <Text as="p" size={200} style={{ marginTop: 12 }}>
            Costo directo del presupuesto: $ {pesos(datos.costoDirecto)}. La diferencia, si la hay, viene del redondeo de
            cada precio unitario.
          </Text>
        </>
      )}
    </HojaPagina>
  )
}

/** Formulario de precios: una fila por ítem, con su análisis, precio unitario y valor. */
export function FormularioPreciosVista({ presupuestoId }: VistaProps) {
  const { datos, error } = useRecurso<FilaFormulario[]>(presupuestoId, api.formulario)
  return (
    <HojaPagina
      etiqueta="Formulario de precios"
      titulo="Formulario de precios"
      descripcion="Una fila por ítem, con su análisis, precio unitario y valor."
      ancha
    >
      {error && (
        <MessageBar intent="error">
          <MessageBarBody>{error}</MessageBarBody>
        </MessageBar>
      )}
      {!datos && !error && <Spinner label="Cargando el formulario…" />}
      {datos && (
        <table className="g" aria-label="Formulario de precios por ítem" style={{ width: '100%', marginTop: 12 }}>
          <thead>
            <tr>
              <th style={{ width: 80 }}>Capítulo</th>
              <th style={{ width: 90 }}>Ítem</th>
              <th style={{ width: 110 }}>Análisis</th>
              <th>Actividad</th>
              <th style={{ width: 70 }}>Unidad</th>
              <th className="n" style={{ width: 110 }}>Cantidad</th>
              <th className="n" style={{ width: 130 }}>Precio unitario</th>
              <th className="n" style={{ width: 130 }}>Valor</th>
            </tr>
          </thead>
          <tbody>
            {datos.map((f) => (
              <tr key={f.item} className={f.excluido ? 'excl' : undefined}>
                <td>{f.capitulo}</td>
                <td>{f.item}</td>
                <td>{f.codigoAnalisis}</td>
                <td className="desc">{f.descripcion}</td>
                <td>{f.unidad}</td>
                <td className="n">{decimales(f.cantidad)}</td>
                <td className="n">$ {pesos(f.precioUnitario)}</td>
                <td className="n">{f.excluido ? 'Excluido' : `$ ${pesos(f.valor)}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </HojaPagina>
  )
}

/** Historial de cambios: quién, cuándo y qué cambió, del más reciente al más antiguo (RD-033). */
export function HistorialVista({ presupuestoId }: VistaProps) {
  const { datos, error } = useRecurso<EntradaHistorial[]>(presupuestoId, api.historial)
  return (
    <HojaPagina
      etiqueta="Historial de cambios"
      titulo="Historial de cambios"
      descripcion="Quién cambió qué, del más reciente al más antiguo."
    >
      {error && (
        <MessageBar intent="error">
          <MessageBarBody>{error}</MessageBarBody>
        </MessageBar>
      )}
      {!datos && !error && <Spinner label="Cargando el historial…" />}
      {datos && datos.length === 0 && <Text as="p">Todavía no hay cambios en este presupuesto.</Text>}
      {datos && datos.length > 0 && (
        <table className="g" aria-label="Cambios del presupuesto" style={{ width: '100%', marginTop: 12 }}>
          <thead>
            <tr>
              <th style={{ width: 170 }}>Cuándo</th>
              <th style={{ width: 200 }}>Quién</th>
              <th style={{ width: 170 }}>Acción</th>
              <th>Detalle</th>
            </tr>
          </thead>
          <tbody>
            {datos.map((h, i) => (
              <tr key={`${h.cuando}-${i}`}>
                <td>{new Date(h.cuando).toLocaleString('es-CO')}</td>
                <td>{h.autor}</td>
                <td>{h.accion}</td>
                <td>{h.detalle}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </HojaPagina>
  )
}
