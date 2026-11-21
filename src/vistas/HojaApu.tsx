import { Field, Select, Text } from '@fluentui/react-components'
import type { Presupuesto } from '../api/cliente'
import { HojaPagina } from './HojaPagina'
import { PanelApu } from './PanelApu'

interface Props {
  presupuesto: Presupuesto
  itemSeleccionado: string | null
  onElegirItem: (codigo: string) => void
  onGuardado: (presupuesto: Presupuesto) => void
}

/** Hoja APU: el análisis de precio unitario del ítem elegido, con su edición. Los valores los calcula la API. */
export function HojaApu({ presupuesto, itemSeleccionado, onElegirItem, onGuardado }: Props) {
  const items = presupuesto.capitulos.flatMap((c) => c.items)
  const item = items.find((i) => i.codigo === itemSeleccionado) ?? items[0] ?? null

  return (
    <HojaPagina etiqueta="APU" titulo="APU (análisis de precios unitarios)" descripcion="Elige un ítem para ver o editar los insumos de su análisis." ancha>
      {item ? (
        <>
          <Field label="Ítem">
            <Select value={item.codigo} onChange={(_, d) => onElegirItem(d.value)} aria-label="Ítem del análisis">
              {presupuesto.capitulos.map((c) => (
                <optgroup key={c.codigo} label={`${c.codigo} · ${c.nombre}`}>
                  {c.items.map((i) => (
                    <option key={i.codigo} value={i.codigo}>
                      {i.codigo} · {i.descripcion}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </Field>
          <PanelApu
            key={`${item.codigoAnalisis}-${presupuesto.id}-${presupuesto.total}`}
            presupuestoId={presupuesto.id}
            codigoAnalisis={item.codigoAnalisis}
            codigoItem={item.codigo}
            onGuardado={onGuardado}
            completo
          />
        </>
      ) : (
        <Text>Este presupuesto aún no tiene ítems. Agrega uno en Costos directos.</Text>
      )}
    </HojaPagina>
  )
}
