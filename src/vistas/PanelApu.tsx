import { useEffect, useState } from 'react'
import {
  Button,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
  makeStyles,
  tokens,
} from '@fluentui/react-components'
import { api } from '../api/cliente'
import type { AnalisisEditable, Presupuesto, TipoLinea } from '../api/cliente'
import { DialogoEditarApu } from './DialogoEditarApu'
import { decimales, pesos } from '../formato'

const estilos = makeStyles({
  panel: {
    borderTop: `3px double ${tokens.colorNeutralStroke1}`,
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '40%',
    minHeight: '150px',
    overflow: 'auto',
  },
  cabecera: { display: 'flex', gap: tokens.spacingHorizontalM, alignItems: 'baseline', padding: tokens.spacingVerticalXS, backgroundColor: tokens.colorNeutralBackground3 },
  numero: { textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' },
  pie: { marginLeft: 'auto', fontWeight: tokens.fontWeightSemibold },
})

const TIPOS: Record<TipoLinea, string> = {
  Material: 'Material',
  ManoDeObra: 'Mano de obra',
  Equipo: 'Equipo',
  Transporte: 'Transporte',
  Otro: 'Otro',
}

interface Props {
  presupuestoId: string
  codigoAnalisis: string
  codigoItem: string
  onGuardado: (presupuesto: Presupuesto) => void
  /** En la hoja APU el análisis ocupa todo el espacio, sin el tope del panel inferior. */
  completo?: boolean
}

/** Análisis de precio unitario del ítem, tal como lo ve este presupuesto. Se puede editar aquí mismo. */
export function PanelApu({ presupuestoId, codigoAnalisis, codigoItem, onGuardado, completo = false }: Props) {
  const e = estilos()
  const [analisis, setAnalisis] = useState<AnalisisEditable | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editando, setEditando] = useState(false)

  // El panel se remonta por clave (codigoAnalisis) al cambiar de ítem: aquí solo se escribe tras la respuesta.
  useEffect(() => {
    let vigente = true
    api
      .analisisDelPresupuesto(presupuestoId, codigoAnalisis)
      .then((respuesta) => {
        if (vigente) setAnalisis(respuesta)
      })
      .catch((ex: unknown) => {
        if (vigente) setError(ex instanceof Error ? ex.message : 'No se pudo cargar el análisis.')
      })
    return () => {
      vigente = false
    }
  }, [presupuestoId, codigoAnalisis])

  return (
    <section className={e.panel} style={completo ? { maxHeight: 'none', borderTop: 'none' } : undefined} aria-label={`Análisis de precio del ítem ${codigoItem}`}>
      <div className={e.cabecera}>
        <Text weight="semibold">APU {codigoAnalisis}</Text>
        {analisis && <Text>{analisis.descripcion} · por {analisis.unidad}</Text>}
        {analisis && <Text className={e.pie}>Costo directo $ {pesos(analisis.costoDirecto)}</Text>}
        <Button size="small" appearance="outline" onClick={() => setEditando(true)}>
          Editar APU
        </Button>
      </div>
      {error && <Text role="alert">{error}</Text>}
      {!analisis && !error && <Spinner size="tiny" label="Cargando análisis…" />}
      {analisis && (
        <Table size="small" aria-label={`Insumos del análisis ${codigoAnalisis}`}>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>Insumo</TableHeaderCell>
              <TableHeaderCell>Tipo</TableHeaderCell>
              <TableHeaderCell>Cantidad</TableHeaderCell>
              <TableHeaderCell>Precio</TableHeaderCell>
              <TableHeaderCell>Parcial</TableHeaderCell>
              <TableHeaderCell>Cómo se calcula</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {analisis.parciales.map((p, indice) => (
              <TableRow key={`${p.descripcion}-${indice}`}>
                <TableCell>{p.descripcion}</TableCell>
                <TableCell>{p.tipo ? TIPOS[p.tipo] : 'Subanálisis'}</TableCell>
                <TableCell className={e.numero}>{decimales(p.cantidad)}</TableCell>
                <TableCell className={e.numero}>$ {decimales(p.precio)}</TableCell>
                <TableCell className={e.numero}>$ {decimales(p.parcial)}</TableCell>
                <TableCell>{p.formula}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {editando && (
        <DialogoEditarApu
          presupuestoId={presupuestoId}
          codigoAnalisis={codigoAnalisis}
          onCerrar={() => setEditando(false)}
          onGuardado={onGuardado}
        />
      )}
    </section>
  )
}
