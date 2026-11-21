import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Presupuesto } from '../api/cliente'
import { presupuestoDePrueba } from '../test/apiDePrueba'
import { AiuEIva, PresupuestoTotal } from './Cierre'

/** Hojas «AIU e IVA» y «Presupuesto total». Datos inventados (D-16). */

function conCierre(): Presupuesto {
  return {
    ...presupuestoDePrueba(),
    cierre: [
      { concepto: 'Costos directos', porcentaje: null, monto: 500000, formula: 'Suma de subtotales' },
      { concepto: 'Administración', porcentaje: 15, monto: 75000, formula: '15 % de 500.000' },
      { concepto: 'Utilidad', porcentaje: 5, monto: 25000, formula: '5 % de 500.000' },
      { concepto: 'IVA sobre la utilidad', porcentaje: 19, monto: 4750, formula: '19 % de 25.000' },
      { concepto: 'Total del presupuesto', porcentaje: null, monto: 604750, formula: 'Suma' },
    ],
  }
}

describe('Hoja AIU e IVA', () => {
  afterEach(cleanup)

  it('muestra los 4 campos con su ayuda y el título de cada tarjeta', () => {
    render(<AiuEIva presupuesto={conCierre()} onGuardar={vi.fn()} bloqueado={false} />)

    expect(screen.getByRole('heading', { level: 2, name: 'AIU e IVA' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Porcentajes del cierre' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Cierre actual' })).toBeInTheDocument()
    for (const nombre of [/Administración/, /Imprevistos/, /Utilidad/, /IVA sobre la utilidad/]) {
      expect(screen.getByRole('textbox', { name: nombre })).toBeInTheDocument()
    }
    // Todos los campos reservan su fila de ayuda: ninguno queda más alto que otro.
    expect(screen.getByRole('textbox', { name: /Imprevistos/ })).toHaveAccessibleDescription('Vacío: sin esta línea')
    expect(screen.getByRole('textbox', { name: /Administración/ })).toHaveAccessibleDescription('Sobre el costo directo')
  })

  it('«Cierre actual» muestra las líneas que devolvió la API, sin calcular nada', () => {
    render(<AiuEIva presupuesto={conCierre()} onGuardar={vi.fn()} bloqueado={false} />)

    const tabla = screen.getByRole('table', { name: 'Cierre actual' })

    expect(within(tabla).getByText('$ 75.000')).toBeInTheDocument()
    expect(within(tabla).getByText('$ 4.750')).toBeInTheDocument()
    expect(within(tabla).getByText('Total del presupuesto').closest('tr')).toHaveClass('total')
    expect(screen.getByText(/Se actualiza al guardar/)).toBeInTheDocument()
  })

  it('guarda los porcentajes escritos; Imprevistos vacío se envía como null', async () => {
    const guardar = vi.fn().mockResolvedValue(undefined)
    render(<AiuEIva presupuesto={conCierre()} onGuardar={guardar} bloqueado={false} />)
    const usuario = userEvent.setup()

    await usuario.clear(screen.getByRole('textbox', { name: /Utilidad/ }))
    await usuario.type(screen.getByRole('textbox', { name: /Utilidad/ }), '7,5')
    await usuario.click(screen.getByRole('button', { name: 'Guardar cierre' }))

    expect(guardar).toHaveBeenCalledWith({
      porcentajeAdministracion: 15,
      porcentajeImprevistos: null,
      porcentajeUtilidad: 7.5,
      porcentajeIvaSobreUtilidad: 19,
    })
  })

  it('rechaza porcentajes fuera de 0 a 100 con un aviso y no guarda', async () => {
    const guardar = vi.fn()
    render(<AiuEIva presupuesto={conCierre()} onGuardar={guardar} bloqueado={false} />)
    const usuario = userEvent.setup()

    await usuario.clear(screen.getByRole('textbox', { name: /Administración/ }))
    await usuario.type(screen.getByRole('textbox', { name: /Administración/ }), '150')
    await usuario.click(screen.getByRole('button', { name: 'Guardar cierre' }))

    expect(screen.getByRole('alert')).toHaveTextContent(/entre 0 y 100/)
    expect(guardar).not.toHaveBeenCalled()
  })

  it('«Deshacer cambios» vuelve a lo que tiene el presupuesto', async () => {
    render(<AiuEIva presupuesto={conCierre()} onGuardar={vi.fn()} bloqueado={false} />)
    const usuario = userEvent.setup()
    const administracion = screen.getByRole('textbox', { name: /Administración/ })

    await usuario.clear(administracion)
    await usuario.type(administracion, '40')
    await usuario.click(screen.getByRole('button', { name: 'Deshacer cambios' }))

    expect(administracion).toHaveValue('15')
  })
})

describe('Hoja Presupuesto total', () => {
  afterEach(cleanup)

  it('usa la misma página que AIU: título y descripción', () => {
    render(<PresupuestoTotal presupuesto={conCierre()} />)

    expect(screen.getByRole('heading', { level: 2, name: 'Presupuesto total' })).toBeInTheDocument()
    expect(screen.getByText(/Cada línea del cierre con su fórmula/)).toBeInTheDocument()
  })

  it('la tabla tiene anchos fijos y los encabezados numéricos van alineados como sus valores', () => {
    render(<PresupuestoTotal presupuesto={conCierre()} />)
    const tabla = screen.getByRole('table', { name: 'Líneas del cierre' })

    expect(tabla.querySelectorAll('col')).toHaveLength(4)
    expect(within(tabla).getByRole('columnheader', { name: '%' })).toHaveClass('n')
    expect(within(tabla).getByRole('columnheader', { name: 'Valor' })).toHaveClass('n')
    expect(within(tabla).getByRole('columnheader', { name: 'Cómo se calcula' })).not.toHaveClass('n')
    expect(within(tabla).getByText('$ 75.000')).toHaveClass('n')
  })

  it('la fila del total tiene más peso y la fórmula va en gris', () => {
    render(<PresupuestoTotal presupuesto={conCierre()} />)
    const tabla = screen.getByRole('table', { name: 'Líneas del cierre' })

    expect(within(tabla).getByText('Total del presupuesto').closest('tr')).toHaveClass('total')
    expect(within(tabla).getByText('15 % de 500.000')).toHaveClass('formula')
  })
})
