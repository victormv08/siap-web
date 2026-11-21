import { useState } from 'react'
import { Button, Field, Input, MessageBar, MessageBarBody } from '@fluentui/react-components'
import type { ConfiguracionCierre, LineaCierre, Presupuesto } from '../api/cliente'
import { pesos, porcentaje } from '../formato'
import { HojaPagina } from './HojaPagina'

interface BorradorCierre {
  administracion: string
  imprevistos: string
  utilidad: string
  iva: string
}

function aBorrador(c: ConfiguracionCierre): BorradorCierre {
  return {
    administracion: String(c.porcentajeAdministracion),
    imprevistos: c.porcentajeImprevistos === null ? '' : String(c.porcentajeImprevistos),
    utilidad: String(c.porcentajeUtilidad),
    iva: String(c.porcentajeIvaSobreUtilidad),
  }
}

/** Lee un porcentaje obligatorio escrito por la persona. Devuelve null si no es válido (entre 0 y 100). */
function leerObligatorio(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.')
  if (limpio === '') return null
  const valor = Number(limpio)
  if (!Number.isFinite(valor) || valor < 0 || valor > 100) return null
  return valor
}

/** Imprevistos es opcional: vacío es «sin línea». Devuelve undefined si lo escrito no es válido. */
function leerImprevistos(texto: string): number | null | undefined {
  if (texto.trim() === '') return null
  return leerObligatorio(texto) ?? undefined
}

interface PropsAIU {
  presupuesto: Presupuesto
  onGuardar: (cierre: ConfiguracionCierre) => Promise<void>
  bloqueado: boolean
}

type ClaveCampo = keyof BorradorCierre

const CAMPOS: { clave: ClaveCampo; etiqueta: string; ayuda: string }[] = [
  { clave: 'administracion', etiqueta: 'Administración (%)', ayuda: 'Sobre el costo directo' },
  { clave: 'imprevistos', etiqueta: 'Imprevistos (%)', ayuda: 'Vacío: sin esta línea' },
  { clave: 'utilidad', etiqueta: 'Utilidad (%)', ayuda: 'Sobre el costo directo' },
  { clave: 'iva', etiqueta: 'IVA sobre la utilidad (%)', ayuda: 'Se aplica a la utilidad' },
]

/** Hoja «Datos generales · AIU e IVA»: los porcentajes del cierre se editan aquí y el total los recalcula la API. */
export function AiuEIva({ presupuesto, onGuardar, bloqueado }: PropsAIU) {
  const [borrador, setBorrador] = useState<BorradorCierre>(() => aBorrador(presupuesto.configuracion))
  const [aviso, setAviso] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  async function guardar() {
    const administracion = leerObligatorio(borrador.administracion)
    const imprevistos = leerImprevistos(borrador.imprevistos)
    const utilidad = leerObligatorio(borrador.utilidad)
    const iva = leerObligatorio(borrador.iva)
    if (administracion === null || imprevistos === undefined || utilidad === null || iva === null) {
      setAviso('Cada porcentaje debe ser un número entre 0 y 100. Imprevistos puede quedar vacío.')
      return
    }
    setAviso(null)
    setGuardando(true)
    try {
      await onGuardar({
        porcentajeAdministracion: administracion,
        porcentajeImprevistos: imprevistos,
        porcentajeUtilidad: utilidad,
        porcentajeIvaSobreUtilidad: iva,
      })
    } catch (error) {
      setAviso(error instanceof Error ? error.message : 'No se pudo guardar el cierre.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <HojaPagina
      etiqueta="Datos generales, AIU e IVA"
      titulo="AIU e IVA"
      descripcion="Los porcentajes se aplican sobre el costo directo; el IVA, sobre la utilidad."
    >
      {aviso && (
        <div role="alert">
          <MessageBar intent="warning">
            <MessageBarBody>{aviso}</MessageBarBody>
          </MessageBar>
        </div>
      )}

      <div className="hoja-columnas">
        <section className="tarjeta-hoja" aria-labelledby="titulo-porcentajes">
          <h3 id="titulo-porcentajes">Porcentajes del cierre</h3>
          <div className="aiu-rejilla">
            {CAMPOS.map((campo) => (
              <div key={campo.clave} className="aiu-celda">
                <Field label={campo.etiqueta} hint={campo.ayuda}>
                  <Input
                    className="aiu-campo"
                    type="text"
                    inputMode="decimal"
                    value={borrador[campo.clave]}
                    disabled={bloqueado || guardando}
                    contentAfter={<span aria-hidden="true">%</span>}
                    onChange={(_, d) => setBorrador({ ...borrador, [campo.clave]: d.value })}
                  />
                </Field>
              </div>
            ))}
          </div>
          <div className="tarjeta-pie">
            <Button disabled={guardando} onClick={() => setBorrador(aBorrador(presupuesto.configuracion))}>
              Deshacer cambios
            </Button>
            <Button appearance="primary" disabled={bloqueado || guardando} onClick={() => void guardar()}>
              Guardar cierre
            </Button>
          </div>
        </section>

        <section className="tarjeta-hoja" aria-labelledby="titulo-cierre-actual">
          <h3 id="titulo-cierre-actual">Cierre actual</h3>
          <p className="tarjeta-nota">Lo que devolvió la API. Se actualiza al guardar.</p>
          <table className="cierre-resumen" aria-label="Cierre actual">
            <thead>
              <tr>
                <th scope="col">Concepto</th>
                <th scope="col" className="n">
                  %
                </th>
                <th scope="col" className="n">
                  Valor
                </th>
              </tr>
            </thead>
            <tbody>
              {presupuesto.cierre.map((linea: LineaCierre) => (
                <tr key={linea.concepto} className={linea.concepto === 'Total del presupuesto' ? 'total' : undefined}>
                  <td>{linea.concepto}</td>
                  <td className="n">{porcentaje(linea.porcentaje)}</td>
                  <td className="n">$ {pesos(linea.monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </HojaPagina>
  )
}

/** Hoja «Presupuesto total»: cada línea del cierre con su fórmula, tal como la calcula la API. */
export function PresupuestoTotal({ presupuesto }: { presupuesto: Presupuesto }) {
  return (
    <HojaPagina
      etiqueta="Presupuesto total"
      titulo="Presupuesto total"
      descripcion="Cada línea del cierre con su fórmula, tal como la calcula la API."
    >
      <div className="tabla-envoltura">
        <table className="tabla-total" aria-label="Líneas del cierre">
          <colgroup>
            <col style={{ width: '28%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '18%' }} />
            <col style={{ width: '44%' }} />
          </colgroup>
          <thead>
            <tr>
              <th scope="col">Concepto</th>
              <th scope="col" className="n">
                %
              </th>
              <th scope="col" className="n">
                Valor
              </th>
              <th scope="col">Cómo se calcula</th>
            </tr>
          </thead>
          <tbody>
            {presupuesto.cierre.map((linea: LineaCierre) => (
              <tr key={linea.concepto} className={linea.concepto === 'Total del presupuesto' ? 'total' : undefined}>
                <td>{linea.concepto}</td>
                <td className="n">{porcentaje(linea.porcentaje)}</td>
                <td className="n">$ {pesos(linea.monto)}</td>
                <td className="formula">{linea.formula}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </HojaPagina>
  )
}
