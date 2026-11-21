import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { fijarCsrf } from './auth/enlace'
import { instalarApi, json, presupuestoDePrueba } from './test/apiDePrueba'

/** Abrir y crear presupuestos, y verlos nombrados. Datos inventados (D-16). */

const LISTA = [
  { id: 'P-0001', nombre: 'Obra de prueba', costoDirecto: 500000, total: 575000 },
  { id: 'P-0002', nombre: 'Segunda obra', costoDirecto: 1250000, total: 1437500 },
]

function segundoPresupuesto() {
  return { ...presupuestoDePrueba(), id: 'P-0002', nombre: 'Segunda obra' }
}

/** Sobrescribe la lista: la primera consulta (carga inicial) es normal; las siguientes usan `despues`. */
function listaConSegundaRespuesta(despues: () => Response) {
  let consultas = 0
  return (url: string, init: RequestInit) => {
    if (url === '/api/presupuestos' && (init.method ?? 'GET') === 'GET') {
      consultas += 1
      return consultas === 1 ? json(LISTA.slice(0, 1)) : despues()
    }
    if (url === '/api/presupuestos/P-0002') return json(segundoPresupuesto())
    return undefined
  }
}

async function abrirApp() {
  const usuario = userEvent.setup()
  render(<App />)
  await screen.findByRole('table', { name: 'Ítems del presupuesto' })
  return usuario
}

describe('Abrir presupuesto', () => {
  beforeEach(() => fijarCsrf(null))
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('lista los presupuestos, marca el abierto y el inicial, y abre otro con un clic', async () => {
    const { llamadas } = instalarApi({ manejador: listaConSegundaRespuesta(() => json(LISTA)) })
    const usuario = await abrirApp()
    await usuario.click(screen.getByText('Localización y replanteo')) // selección que debe limpiarse

    await usuario.click(screen.getByRole('button', { name: 'Abrir' }))

    const dialogo = await screen.findByRole('dialog', { name: 'Abrir presupuesto' })
    const lista = await within(dialogo).findByRole('listbox', { name: 'Presupuestos' })
    const opciones = within(lista).getAllByRole('option')
    expect(opciones).toHaveLength(2)
    expect(opciones[0]).toHaveTextContent('Obra de prueba')
    expect(opciones[0]).toHaveTextContent('Inicial')
    expect(opciones[0]).toHaveTextContent('Abierto')
    expect(opciones[0]).toHaveAttribute('aria-selected', 'true')
    expect(opciones[1]).toHaveTextContent('Segunda obra')
    expect(opciones[1]).toHaveTextContent('Costo directo $ 1.250.000 · Total $ 1.437.500')
    expect(opciones[1]).not.toHaveTextContent('Inicial')

    await usuario.click(opciones[1])

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(llamadas.some((l) => l.url === '/api/presupuestos/P-0002' && l.metodo === 'GET')).toBe(true)
    expect(screen.getByText('Segunda obra')).toBeInTheDocument() // nombre en el panel
    expect(screen.getByText('Se abrió «Segunda obra».')).toBeInTheDocument()
    expect(screen.getByText('Localización y replanteo').closest('tr')).not.toHaveClass('seleccionada')
    expect(screen.getByRole('table', { name: 'Ítems del presupuesto' })).toBeInTheDocument()
  })

  it('el foco abre en el presupuesto actual; con flechas y Enter se abre otro', async () => {
    instalarApi({ manejador: listaConSegundaRespuesta(() => json(LISTA)) })
    const usuario = await abrirApp()
    await usuario.click(screen.getByRole('button', { name: 'Abrir' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Abrir presupuesto' })
    const lista = await within(dialogo).findByRole('listbox', { name: 'Presupuestos' })
    const [primera, segunda] = within(lista).getAllByRole('option')

    await waitFor(() => expect(primera).toHaveFocus())
    await usuario.keyboard('{ArrowDown}')
    expect(segunda).toHaveFocus()
    await usuario.keyboard('{ArrowUp}')
    expect(primera).toHaveFocus()
    await usuario.keyboard('{ArrowDown}{Enter}')

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByText('Se abrió «Segunda obra».')).toBeInTheDocument()
  })

  it('también se abre desde el menú Archivo', async () => {
    instalarApi({ manejador: listaConSegundaRespuesta(() => json(LISTA)) })
    const usuario = await abrirApp()

    await usuario.click(screen.getByRole('button', { name: 'Archivo' }))
    await usuario.click(await screen.findByRole('menuitem', { name: /Abrir presupuesto/ }))

    expect(await screen.findByRole('dialog', { name: 'Abrir presupuesto' })).toBeInTheDocument()
  })

  it('con la lista vacía lo dice', async () => {
    instalarApi({ manejador: listaConSegundaRespuesta(() => json([])) })
    const usuario = await abrirApp()

    await usuario.click(screen.getByRole('button', { name: 'Abrir' }))

    const dialogo = await screen.findByRole('dialog', { name: 'Abrir presupuesto' })
    expect(await within(dialogo).findByText(/No hay presupuestos todavía/)).toBeInTheDocument()
    expect(within(dialogo).queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('si la API falla, muestra su detalle en un aviso', async () => {
    instalarApi({ manejador: listaConSegundaRespuesta(() => json({ detail: 'La base de datos no responde.' }, 503)) })
    const usuario = await abrirApp()

    await usuario.click(screen.getByRole('button', { name: 'Abrir' }))

    const dialogo = await screen.findByRole('dialog', { name: 'Abrir presupuesto' })
    expect(await within(dialogo).findByRole('alert')).toHaveTextContent('La base de datos no responde.')
  })

  it('si falla al abrir el elegido, el error se ve en el diálogo y nada cambia', async () => {
    const lista = listaConSegundaRespuesta(() => json(LISTA)) // una sola vez: lleva la cuenta de las consultas
    instalarApi({
      manejador: (url, init) =>
        url === '/api/presupuestos/P-0002' ? json({ detail: 'No se pudo leer ese presupuesto.' }, 500) : lista(url, init),
    })
    const usuario = await abrirApp()
    await usuario.click(screen.getByRole('button', { name: 'Abrir' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Abrir presupuesto' })

    await usuario.click(await within(dialogo).findByRole('option', { name: /Segunda obra/ }))

    expect(await within(dialogo).findByRole('alert')).toHaveTextContent('No se pudo leer ese presupuesto.')
    expect(screen.getByRole('dialog', { name: 'Abrir presupuesto' })).toBeInTheDocument()
  })

  it('Escape y Cancelar cierran sin cambiar nada', async () => {
    const { llamadas } = instalarApi({ manejador: listaConSegundaRespuesta(() => json(LISTA)) })
    const usuario = await abrirApp()

    await usuario.click(screen.getByRole('button', { name: 'Abrir' }))
    await screen.findByRole('dialog', { name: 'Abrir presupuesto' })
    await usuario.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    await usuario.click(screen.getByRole('button', { name: 'Abrir' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Abrir presupuesto' })
    await usuario.click(within(dialogo).getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    expect(llamadas.some((l) => l.url === '/api/presupuestos/P-0002')).toBe(false)
    expect(screen.queryByText(/Se abrió/)).not.toBeInTheDocument()
  })
})

describe('Nombre del presupuesto abierto', () => {
  beforeEach(() => fijarCsrf(null))
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('se ve en el panel de capítulos y en el título de la pestaña', async () => {
    instalarApi()
    await abrirApp()

    expect(screen.getByText('Obra de prueba')).toBeInTheDocument()
    expect(screen.getByTitle('Obra de prueba')).toHaveClass('nombre-presupuesto')
    // El título se fija en un efecto de React: puede llegar un instante después de que aparezca la tabla.
    await waitFor(() => expect(document.title).toBe('SIAP · Obra de prueba'))
  })

  it('al abrir otro presupuesto cambia el título de la pestaña', async () => {
    instalarApi({ manejador: listaConSegundaRespuesta(() => json(LISTA)) })
    const usuario = await abrirApp()
    await usuario.click(screen.getByRole('button', { name: 'Abrir' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Abrir presupuesto' })

    await usuario.click(await within(dialogo).findByRole('option', { name: /Segunda obra/ }))

    await waitFor(() => expect(document.title).toBe('SIAP · Segunda obra'))
  })
})

describe('Nuevo presupuesto', () => {
  beforeEach(() => fijarCsrf(null))
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('pide el nombre, envía POST con ese nombre y avisa cómo volver a otro', async () => {
    const { llamadas } = instalarApi({
      manejador: (url, init) =>
        url === '/api/presupuestos' && init.method === 'POST'
          ? json({ ...presupuestoDePrueba(), id: 'P-0003', nombre: 'Casa lote 7', capitulos: [] }, 201)
          : undefined,
    })
    const usuario = await abrirApp()

    await usuario.click(screen.getByRole('button', { name: 'Nuevo' }))

    const dialogo = await screen.findByRole('dialog', { name: 'Nuevo presupuesto' })
    const campo = within(dialogo).getByLabelText(/Nombre del presupuesto/)
    await waitFor(() => expect(campo).toHaveFocus())
    await usuario.type(campo, 'Casa lote 7{Enter}')

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const post = llamadas.find((l) => l.url === '/api/presupuestos' && l.metodo === 'POST')
    expect(post?.cuerpo).toEqual({ nombre: 'Casa lote 7' })
    expect(screen.getByText('Se creó «Casa lote 7». Use «Abrir» para volver a otro presupuesto.')).toBeInTheDocument()
    expect(screen.queryByText(/Aún no hay una forma de agregar capítulos/)).not.toBeInTheDocument()
    expect(screen.getByTitle('Casa lote 7')).toBeInTheDocument()
  })

  it('el nombre es obligatorio: sin él no se puede crear', async () => {
    const { llamadas } = instalarApi()
    const usuario = await abrirApp()
    await usuario.click(screen.getByRole('button', { name: 'Nuevo' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Nuevo presupuesto' })

    expect(within(dialogo).getByRole('button', { name: 'Crear presupuesto' })).toBeDisabled()
    await usuario.type(within(dialogo).getByLabelText(/Nombre del presupuesto/), '   {Enter}')

    expect(llamadas.some((l) => l.metodo === 'POST')).toBe(false)
    expect(screen.getByRole('dialog', { name: 'Nuevo presupuesto' })).toBeInTheDocument()
  })

  it('el nombre admite hasta 200 caracteres', async () => {
    instalarApi()
    const usuario = await abrirApp()
    await usuario.click(screen.getByRole('button', { name: 'Nuevo' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Nuevo presupuesto' })

    expect(within(dialogo).getByLabelText(/Nombre del presupuesto/)).toHaveAttribute('maxlength', '200')
  })

  it('si la API rechaza el nombre, el error se ve en el diálogo y sigue abierto', async () => {
    instalarApi({
      manejador: (url, init) =>
        url === '/api/presupuestos' && init.method === 'POST' ? json({ detail: 'Ya existe un presupuesto con ese nombre.' }, 400) : undefined,
    })
    const usuario = await abrirApp()
    await usuario.click(screen.getByRole('button', { name: 'Nuevo' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Nuevo presupuesto' })

    await usuario.type(within(dialogo).getByLabelText(/Nombre del presupuesto/), 'Repetido{Enter}')

    expect(await within(dialogo).findByRole('alert')).toHaveTextContent('Ya existe un presupuesto con ese nombre.')
    expect(screen.getByRole('dialog', { name: 'Nuevo presupuesto' })).toBeInTheDocument()
  })

  it('Escape cancela sin crear nada', async () => {
    const { llamadas } = instalarApi()
    const usuario = await abrirApp()
    await usuario.click(screen.getByRole('button', { name: 'Nuevo' }))
    await screen.findByRole('dialog', { name: 'Nuevo presupuesto' })

    await usuario.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(llamadas.some((l) => l.metodo === 'POST')).toBe(false)
  })
})
