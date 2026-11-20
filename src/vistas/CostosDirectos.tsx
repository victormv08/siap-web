import { useState } from 'react'
import {
  Badge,
  Button,
  Input,
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
import type { CapituloResultado, ItemResultado, Presupuesto } from '../api/cliente'
import { decimales, pesos } from '../formato'

const estilos = makeStyles({
  contenedor: { overflow: 'auto', minHeight: 0, flex: 1, backgroundColor: tokens.colorNeutralBackground1 },
  tabla: { minWidth: '760px' },
  numero: { textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' },
  capitulo: { backgroundColor: tokens.colorPaletteYellowBackground2, fontWeight: tokens.fontWeightSemibold },
  subtotal: { backgroundColor: tokens.colorNeutralBackground3, fontWeight: tokens.fontWeightSemibold },
  excluido: { color: tokens.colorNeutralForeground3, fontStyle: 'italic' },
  seleccionado: { backgroundColor: tokens.colorBrandBackground2 },
  entrada: { width: '110px', textAlign: 'right' },
  acciones: { display: 'flex', gap: tokens.spacingHorizontalXS, alignItems: 'center' },
})

interface Props {
  presupuesto: Presupuesto
  itemSeleccionado: string | null
  onSeleccionarItem: (codigo: string) => void
  onCambiarCantidad: (item: ItemResultado, cantidad: number) => Promise<void>
  onExcluir: (item: ItemResultado) => void
  onIncluir: (item: ItemResultado) => Promise<void>
  bloqueado: boolean
}

/** Convierte lo que escribe la persona («12,5» o «12.5») en un número. Es entrada, no cálculo. */
function leerCantidad(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.')
  if (limpio === '') return null
  const valor = Number(limpio)
  return Number.isFinite(valor) ? valor : null
}

export function CostosDirectos({
  presupuesto,
  itemSeleccionado,
  onSeleccionarItem,
  onCambiarCantidad,
  onExcluir,
  onIncluir,
  bloqueado,
}: Props) {
  const e = estilos()
  return (
    <div className={e.contenedor} role="region" aria-label="Cuadro de costos directos">
      <Table size="small" className={e.tabla} aria-label="Ítems del presupuesto">
        <TableHeader>
          <TableRow>
            <TableHeaderCell>Ítem</TableHeaderCell>
            <TableHeaderCell>Actividad</TableHeaderCell>
            <TableHeaderCell>Unidad</TableHeaderCell>
            <TableHeaderCell>Cantidad</TableHeaderCell>
            <TableHeaderCell>Vr. unitario</TableHeaderCell>
            <TableHeaderCell>Vr. total</TableHeaderCell>
            <TableHeaderCell>Estado</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {presupuesto.capitulos.map((capitulo) => (
            <FilasCapitulo
              key={capitulo.codigo}
              capitulo={capitulo}
              itemSeleccionado={itemSeleccionado}
              onSeleccionarItem={onSeleccionarItem}
              onCambiarCantidad={onCambiarCantidad}
              onExcluir={onExcluir}
              onIncluir={onIncluir}
              bloqueado={bloqueado}
            />
          ))}
          <TableRow className={e.subtotal}>
            <TableCell colSpan={5}>Total costo directo</TableCell>
            <TableCell className={e.numero}>$ {pesos(presupuesto.costoDirecto)}</TableCell>
            <TableCell />
          </TableRow>
        </TableBody>
      </Table>
    </div>
  )
}

interface FilasProps {
  capitulo: CapituloResultado
  itemSeleccionado: string | null
  onSeleccionarItem: (codigo: string) => void
  onCambiarCantidad: (item: ItemResultado, cantidad: number) => Promise<void>
  onExcluir: (item: ItemResultado) => void
  onIncluir: (item: ItemResultado) => Promise<void>
  bloqueado: boolean
}

function FilasCapitulo({
  capitulo,
  itemSeleccionado,
  onSeleccionarItem,
  onCambiarCantidad,
  onExcluir,
  onIncluir,
  bloqueado,
}: FilasProps) {
  const e = estilos()
  return (
    <>
      <TableRow className={e.capitulo} id={`capitulo-${capitulo.codigo}`}>
        <TableCell>{capitulo.codigo}</TableCell>
        <TableCell colSpan={4}>{capitulo.nombre}</TableCell>
        <TableCell className={e.numero}>Subtotal</TableCell>
        <TableCell className={e.numero}>$ {pesos(capitulo.subtotal)}</TableCell>
      </TableRow>
      {capitulo.items.map((item) => (
        <FilaItem
          key={item.codigo}
          item={item}
          seleccionado={itemSeleccionado === item.codigo}
          onSeleccionar={() => onSeleccionarItem(item.codigo)}
          onCambiarCantidad={(cantidad) => onCambiarCantidad(item, cantidad)}
          onExcluir={() => onExcluir(item)}
          onIncluir={() => onIncluir(item)}
          bloqueado={bloqueado}
        />
      ))}
    </>
  )
}

interface FilaProps {
  item: ItemResultado
  seleccionado: boolean
  onSeleccionar: () => void
  onCambiarCantidad: (cantidad: number) => Promise<void>
  onExcluir: () => void
  onIncluir: () => Promise<void>
  bloqueado: boolean
}

function FilaItem({ item, seleccionado, onSeleccionar, onCambiarCantidad, onExcluir, onIncluir, bloqueado }: FilaProps) {
  const e = estilos()
  const [borrador, setBorrador] = useState<string | null>(null)
  const valorMostrado = borrador ?? decimales(item.cantidad)

  async function confirmar() {
    if (borrador === null) return
    const cantidad = leerCantidad(borrador)
    setBorrador(null)
    if (cantidad === null || cantidad === item.cantidad) return
    await onCambiarCantidad(cantidad)
  }

  return (
    <TableRow
      className={[item.excluido ? e.excluido : '', seleccionado ? e.seleccionado : ''].join(' ')}
      onClick={onSeleccionar}
      aria-selected={seleccionado}
    >
      <TableCell>{item.codigo}</TableCell>
      <TableCell>{item.descripcion}</TableCell>
      <TableCell>{item.unidad}</TableCell>
      <TableCell className={e.numero}>
        <Input
          size="small"
          className={e.entrada}
          aria-label={`Cantidad del ítem ${item.codigo}`}
          value={valorMostrado}
          disabled={bloqueado || item.excluido}
          onChange={(_, datos) => setBorrador(datos.value)}
          onBlur={() => void confirmar()}
          onKeyDown={(evento) => {
            if (evento.key === 'Enter') void confirmar()
            if (evento.key === 'Escape') setBorrador(null)
          }}
        />
      </TableCell>
      <TableCell className={e.numero}>$ {pesos(item.precioUnitario)}</TableCell>
      <TableCell className={e.numero}>{item.excluido ? 'no suma' : `$ ${pesos(item.valorConsiderado)}`}</TableCell>
      <TableCell>
        <div className={e.acciones}>
          {item.excluido ? (
            <>
              <Badge appearance="outline" color="warning">Excluido</Badge>
              <Text size={200} title={item.motivoExclusion ?? undefined}>
                {item.motivoExclusion}
              </Text>
              <Button
                size="small"
                appearance="subtle"
                disabled={bloqueado}
                onClick={(evento) => {
                  evento.stopPropagation()
                  void onIncluir()
                }}
              >
                Incluir
              </Button>
            </>
          ) : (
            <Button
              size="small"
              appearance="subtle"
              disabled={bloqueado}
              onClick={(evento) => {
                evento.stopPropagation()
                onExcluir()
              }}
            >
              Excluir
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}
