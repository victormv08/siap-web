import { useState } from 'react'
import {
  Button,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
  Title3,
  makeStyles,
  tokens,
} from '@fluentui/react-components'
import type { ConfiguracionCierre, LineaCierre, Presupuesto } from '../api/cliente'
import { pesos, porcentaje } from '../formato'

const estilos = makeStyles({
  hoja: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM, padding: tokens.spacingHorizontalL, overflow: 'auto', minHeight: 0 },
  rejilla: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: tokens.spacingHorizontalM, maxWidth: '900px' },
  acciones: { display: 'flex', gap: tokens.spacingHorizontalS, alignItems: 'center' },
  numero: { textAlign: 'right', fontVariantNumeric: 'tabular-nums' },
  total: { fontWeight: tokens.fontWeightSemibold, backgroundColor: tokens.colorNeutralBackground3 },
  nota: { color: tokens.colorNeutralForeground3, maxWidth: '75ch' },
})

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

/** Hoja «Datos generales · AIU e IVA»: los porcentajes del cierre se editan aquí y el total los recalcula la API. */
export function AiuEIva({ presupuesto, onGuardar, bloqueado }: PropsAIU) {
  const e = estilos()
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
    <section className={e.hoja} aria-label="Datos generales, AIU e IVA">
      <Title3 as="h2">AIU e IVA</Title3>
      <Text className={e.nota}>
        Los porcentajes se aplican sobre el costo directo (administración, imprevistos y utilidad) y el IVA sobre la
        utilidad. Cada valor redondeado a pesos lo calcula la API.
      </Text>
      {aviso && (
        <MessageBar intent="warning">
          <MessageBarBody>{aviso}</MessageBarBody>
        </MessageBar>
      )}
      <div className={e.rejilla}>
        <Field label="Administración (%)">
          <Input
            type="text"
            inputMode="decimal"
            value={borrador.administracion}
            disabled={bloqueado || guardando}
            onChange={(_, d) => setBorrador({ ...borrador, administracion: d.value })}
          />
        </Field>
        <Field label="Imprevistos (%)" hint="Vacío: el cierre no tiene esta línea">
          <Input
            type="text"
            inputMode="decimal"
            value={borrador.imprevistos}
            disabled={bloqueado || guardando}
            onChange={(_, d) => setBorrador({ ...borrador, imprevistos: d.value })}
          />
        </Field>
        <Field label="Utilidad (%)">
          <Input
            type="text"
            inputMode="decimal"
            value={borrador.utilidad}
            disabled={bloqueado || guardando}
            onChange={(_, d) => setBorrador({ ...borrador, utilidad: d.value })}
          />
        </Field>
        <Field label="IVA sobre la utilidad (%)">
          <Input
            type="text"
            inputMode="decimal"
            value={borrador.iva}
            disabled={bloqueado || guardando}
            onChange={(_, d) => setBorrador({ ...borrador, iva: d.value })}
          />
        </Field>
      </div>
      <div className={e.acciones}>
        <Button appearance="primary" disabled={bloqueado || guardando} onClick={() => void guardar()}>
          Guardar cierre
        </Button>
        <Button disabled={guardando} onClick={() => setBorrador(aBorrador(presupuesto.configuracion))}>
          Deshacer cambios
        </Button>
      </div>
    </section>
  )
}

/** Hoja «Presupuesto total»: cada línea del cierre con su fórmula, tal como la calcula la API. */
export function PresupuestoTotal({ presupuesto }: { presupuesto: Presupuesto }) {
  const e = estilos()
  return (
    <section className={e.hoja} aria-label="Presupuesto total">
      <Title3 as="h2">Presupuesto total</Title3>
      <Table size="small" aria-label="Líneas del cierre" style={{ maxWidth: '900px' }}>
        <TableHeader>
          <TableRow>
            <TableHeaderCell>Concepto</TableHeaderCell>
            <TableHeaderCell>%</TableHeaderCell>
            <TableHeaderCell>Valor</TableHeaderCell>
            <TableHeaderCell>Cómo se calcula</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {presupuesto.cierre.map((linea: LineaCierre) => {
            const esTotal = linea.concepto === 'Total del presupuesto'
            return (
              <TableRow key={linea.concepto} className={esTotal ? e.total : undefined}>
                <TableCell>{linea.concepto}</TableCell>
                <TableCell className={e.numero}>{porcentaje(linea.porcentaje)}</TableCell>
                <TableCell className={e.numero}>$ {pesos(linea.monto)}</TableCell>
                <TableCell>{linea.formula}</TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </section>
  )
}
