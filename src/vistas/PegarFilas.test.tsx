import { cleanup, configure, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { fijarCsrf } from '../auth/enlace'
import { instalarApi, json, presupuestoDePrueba } from '../test/apiDePrueba'

/** Pegar filas desde Excel en una rejilla de celdas, con la API simulada. Datos inventados (D-16). */

const URL_FILAS = '/api/presupuestos/P-0001/filas'

// Las esperas (findBy, waitFor) llegan a 8 s: con los demás archivos corriendo en paralelo, el diálogo puede tardar más de 1 s.
configure({ asyncUtilTimeout: 8000 })

async function abrirApp() {
  const usuario = userEvent.setup()
  render(<App />)
  await screen.findByRole('table', { name: 'Ítems del presupuesto' })
  return usuario
}

async function abrirDialogoDesdeElMenu(usuario: ReturnType<typeof userEvent.setup>) {
  await usuario.click(screen.getByRole('button', { name: 'Editar' }))
  await usuario.click(await screen.findByRole('menuitem', { name: /Pegar filas desde Excel/ }))
  return screen.findByRole('dialog')
}

/** Pega texto en una celda, como lo hace Ctrl+V con celdas copiadas de Excel. */
function pegarEn(celda: HTMLElement, texto: string) {
  fireEvent.paste(celda, { clipboardData: { getData: () => texto } })
}

describe('Pegar filas desde Excel', { timeout: 15_000 }, () => {
  beforeEach(() => fijarCsrf(null))
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('la entrada del menú Editar está activa y abre una rejilla de celdas como Excel', async () => {
    instalarApi()
    const usuario = await abrirApp()

    const dialogo = await abrirDialogoDesdeElMenu(usuario)

    expect(within(dialogo).getByRole('heading', { name: 'Pegar filas desde Excel' })).toBeInTheDocument()
    const rejilla = within(dialogo).getByRole('table', { name: 'Filas para importar' })
    for (const columna of ['Capítulo', 'Código', 'Descripción', 'Unidad', 'Cantidad']) {
      expect(within(rejilla).getByRole('columnheader', { name: columna })).toBeInTheDocument()
    }
    expect(within(rejilla).getByLabelText('Código, fila 10')).toBeInTheDocument()
    expect(within(dialogo).getByRole('button', { name: 'Importar filas' })).toBeDisabled()
  })

  it('al pegar desde una celda las filas y columnas de Excel quedan en sus celdas, y se pueden corregir', async () => {
    instalarApi()
    const usuario = await abrirApp()
    const dialogo = await abrirDialogoDesdeElMenu(usuario)

    pegarEn(
      within(dialogo).getByLabelText('Capítulo, fila 1'),
      'Capítulo\tCódigo\tDescripción\tUnidad\tCantidad\nObra nueva\tMOR-01\t\t\t2\nObra nueva\tCON-01\tZapatas\tm3\t3,5',
    )

    expect(within(dialogo).getByLabelText('Capítulo, fila 1')).toHaveValue('Obra nueva') // el encabezado no ocupa fila
    expect(within(dialogo).getByLabelText('Código, fila 1')).toHaveValue('MOR-01')
    expect(within(dialogo).getByLabelText('Cantidad, fila 1')).toHaveValue('2')
    expect(within(dialogo).getByLabelText('Descripción, fila 2')).toHaveValue('Zapatas')
    expect(within(dialogo).getByLabelText('Cantidad, fila 2')).toHaveValue('3,5')
    expect(await within(dialogo).findByText(/2 filas listas para importar/)).toBeInTheDocument()

    await usuario.clear(within(dialogo).getByLabelText('Cantidad, fila 2'))
    await usuario.type(within(dialogo).getByLabelText('Cantidad, fila 2'), '4')
    expect(within(dialogo).getByLabelText('Cantidad, fila 2')).toHaveValue('4')
  })

  it('un pegado de un solo valor dentro de una celda se queda como texto normal', async () => {
    instalarApi()
    const usuario = await abrirApp()
    const dialogo = await abrirDialogoDesdeElMenu(usuario)

    const evento = new Event('paste', { bubbles: true, cancelable: true }) as Event & { clipboardData: unknown }
    evento.clipboardData = { getData: () => 'solo un valor' }
    within(dialogo).getByLabelText('Capítulo, fila 1').dispatchEvent(evento)

    expect(evento.defaultPrevented).toBe(false) // el navegador lo pega normal
  })

  it('envía las filas a la API sin precio y muestra el presupuesto que devuelve', async () => {
    const conLoNuevo = presupuestoDePrueba()
    conLoNuevo.capitulos[0].items[0].descripcion = 'Descripción que devolvió la API'
    const { llamadas } = instalarApi({
      manejador: (url, init) => (url === URL_FILAS && init.method === 'POST' ? json(conLoNuevo) : undefined),
    })
    const usuario = await abrirApp()
    const dialogo = await abrirDialogoDesdeElMenu(usuario)

    pegarEn(within(dialogo).getByLabelText('Capítulo, fila 1'), 'Obra nueva\tMOR-01\t\t\t2\nObra nueva\tCON-01\tZapatas\tm3\t3,5')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Importar filas' }))

    await waitFor(() => expect(llamadas.find((l) => l.url === URL_FILAS)).toBeDefined())
    const cuerpo = llamadas.find((l) => l.url === URL_FILAS)!.cuerpo as { filas: Record<string, unknown>[] }
    expect(cuerpo.filas).toEqual([
      { capitulo: 'Obra nueva', codigoAnalisis: 'MOR-01', descripcion: null, unidad: null, cantidad: 2 },
      { capitulo: 'Obra nueva', codigoAnalisis: 'CON-01', descripcion: 'Zapatas', unidad: 'm3', cantidad: 3.5 },
    ])
    expect(JSON.stringify(cuerpo)).not.toMatch(/precio/i) // la web no manda dinero: lo calcula la API
    expect(await screen.findByText('Descripción que devolvió la API')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('si la API rechaza filas, las muestra con el número de la rejilla, marca la fila y no cierra el diálogo', async () => {
    instalarApi({
      manejador: (url, init) =>
        url === URL_FILAS && init.method === 'POST'
          ? json(
              {
                title: 'Filas con errores',
                detail: 'No se importó ninguna fila: 1 con errores.',
                errores: [{ fila: 2, motivo: 'El código «NO-EXISTE» no existe en el catálogo.' }],
              },
              422,
            )
          : undefined,
    })
    const usuario = await abrirApp()
    const dialogo = await abrirDialogoDesdeElMenu(usuario)

    // La fila 2 de la rejilla queda en blanco: la API recibe 2 filas y su «fila 2» es la 3 de la rejilla.
    pegarEn(within(dialogo).getByLabelText('Capítulo, fila 1'), 'A\tMOR-01\t\t\t1')
    pegarEn(within(dialogo).getByLabelText('Capítulo, fila 3'), 'A\tNO-EXISTE\t\t\t1')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Importar filas' }))

    expect(await within(dialogo).findByText(/Fila 3: El código «NO-EXISTE» no existe en el catálogo\./)).toBeInTheDocument()
    expect(within(dialogo).getByText('No se importó ninguna fila: 1 con errores.')).toBeInTheDocument()
    expect(within(dialogo).getByLabelText('Código, fila 3')).toHaveAttribute('aria-invalid', 'true')
    expect(within(dialogo).getByLabelText('Código, fila 1')).not.toHaveAttribute('aria-invalid')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('una fila que no se puede enviar se marca antes de llamar a la API y bloquea el botón', async () => {
    const { llamadas } = instalarApi()
    const usuario = await abrirApp()
    const dialogo = await abrirDialogoDesdeElMenu(usuario)

    pegarEn(within(dialogo).getByLabelText('Capítulo, fila 1'), 'A\tMOR-01\t\t\tmucho')

    expect(await within(dialogo).findByText(/Fila 1: La cantidad «mucho» no es un número\./)).toBeInTheDocument()
    expect(within(dialogo).getByLabelText('Cantidad, fila 1')).toHaveAttribute('aria-invalid', 'true')
    expect(within(dialogo).getByRole('button', { name: 'Importar filas' })).toBeDisabled()
    expect(llamadas.some((l) => l.url === URL_FILAS)).toBe(false)
  })

  it('Ctrl+V con celdas de Excel sobre la pantalla abre el diálogo con las celdas ya llenas', async () => {
    instalarApi()
    await abrirApp()

    fireEvent.paste(document.body, { clipboardData: { getData: () => 'A\tMOR-01\t\t\t2\nB\tCON-01\t\t\t3' } })

    const dialogo = await screen.findByRole('dialog')
    expect(within(dialogo).getByLabelText('Capítulo, fila 1')).toHaveValue('A')
    expect(within(dialogo).getByLabelText('Código, fila 2')).toHaveValue('CON-01')
  })

  it('un pegado de un solo valor sobre la pantalla no abre nada', async () => {
    instalarApi()
    await abrirApp()

    fireEvent.paste(document.body, { clipboardData: { getData: () => 'solo un valor' } })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
