import { useEffect, useState } from 'react'
import {
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
import type { Analisis, TipoLinea } from '../api/cliente'
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
  codigoAnalisis: string
  codigoItem: string
}

/** Análisis de precio unitario del ítem seleccionado. Solo lectura: el análisis lo entrega la API. */
export function PanelApu({ codigoAnalisis, codigoItem }: Props) {
  const e = estilos()
  const [analisis, setAnalisis] = useState<Analisis | null>(null)
  const [error, setError] = useState<string | null>(null)

  // El panel se remonta por clave (codigoAnalisis) al cambiar de ítem: aquí solo se escribe tras la respuesta.
  useEffect(() => {
    let vigente = true
    api
      .analisis(codigoAnalisis)
      .then((respuesta) => {
        if (vigente) setAnalisis(respuesta)
      })
      .catch((ex: unknown) => {
        if (vigente) setError(ex instanceof Error ? ex.message : 'No se pudo cargar el análisis.')
      })
    return () => {
      vigente = false
    }
  }, [codigoAnalisis])

  return (
    <section className={e.panel} aria-label={`Análisis de precio del ítem ${codigoItem}`}>
      <div className={e.cabecera}>
        <Text weight="semibold">APU {codigoAnalisis}</Text>
        {analisis && <Text>{analisis.descripcion} · por {analisis.unidad}</Text>}
        {analisis && <Text className={e.pie}>Costo directo $ {pesos(analisis.costoDirecto)}</Text>}
      </div>
      {error && <Text role="alert">{error}</Text>}
      {!analisis && !error && <Spinner size="tiny" label="Cargando análisis…" />}
      {analisis && (
        <Table size="small" aria-label={`Insumos del análisis ${codigoAnalisis}`}>
          <TableHeader>
            <TableHeaderCell>Insumo</TableHeaderCell>
            <TableHeaderCell>Tipo</TableHeaderCell>
            <TableHeaderCell>Cantidad</TableHeaderCell>
            <TableHeaderCell>Precio</TableHeaderCell>
            <TableHeaderCell>Parcial</TableHeaderCell>
            <TableHeaderCell>Cómo se calcula</TableHeaderCell>
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
    </section>
  )
}
