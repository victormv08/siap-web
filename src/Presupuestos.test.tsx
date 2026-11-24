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
        url === '/api/presupuestos' && init.method === 'POST' && String(init.body).includes('Casa lote 7')
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
    const post = llamadas.find((l) => l.url === '/api/presupuestos' && (l.cuerpo as { nombre?: string } | undefined)?.nombre === 'Casa lote 7')
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

    expect(llamadas.some((l) => l.metodo === 'POST' && (l.cuerpo as { nombre?: string } | undefined)?.nombre !== 'Presupuesto sin título')).toBe(false)
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
        url === '/api/presupuestos' && init.method === 'POST' && String(init.body).includes('Repetido') ? json({ detail: 'Ya existe un presupuesto con ese nombre.' }, 400) : undefined,
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
    expect(llamadas.some((l) => l.metodo === 'POST' && (l.cuerpo as { nombre?: string } | undefined)?.nombre !== 'Presupuesto sin título')).toBe(false)
  })
})

describe('Presupuesto vacío al entrar', () => {
  beforeEach(() => fijarCsrf(null))
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  const EN_BLANCO = { id: 'P-0009', nombre: 'Presupuesto sin título', costoDirecto: 0, total: 0 }
  const vacio = { ...presupuestoDePrueba(), id: 'P-0009', nombre: 'Presupuesto sin título', capitulos: [], costoDirecto: 0, total: 0 }

  it('si no hay uno en blanco, crea «Presupuesto sin título» y entra con él, vacío', async () => {
    const { llamadas } = instalarApi({
      manejador: (url, init) => {
        if (url === '/api/presupuestos' && init.method === 'POST') return json(vacio, 201)
        if (url === '/api/presupuestos') return json(LISTA)
        return undefined
      },
    })
    render(<App />)

    expect(await screen.findByTitle('Presupuesto sin título')).toBeInTheDocument()
    const posts = llamadas.filter((l) => l.metodo === 'POST')
    expect(posts).toHaveLength(1)
    expect(posts[0].cuerpo).toEqual({ nombre: 'Presupuesto sin título' })
    expect(screen.queryByText('Localización y replanteo')).not.toBeInTheDocument()
  })

  it('si ya quedó uno en blanco de otra visita, lo reutiliza y no crea otro', async () => {
    const { llamadas } = instalarApi({
      manejador: (url) => {
        if (url === '/api/presupuestos') return json([...LISTA, EN_BLANCO])
        if (url === '/api/presupuestos/P-0009') return json(vacio)
        return undefined
      },
    })
    render(<App />)

    expect(await screen.findByTitle('Presupuesto sin título')).toBeInTheDocument()
    expect(llamadas.some((l) => l.metodo === 'POST')).toBe(false)
  })
})

describe('Pie de Innovatek en la aplicación', () => {
  beforeEach(() => fijarCsrf(null))
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('el pie de Innovatek se ve también en la página de presupuestos', async () => {
    instalarApi()
    await abrirApp()

    const pie = screen.getByRole('contentinfo', { name: 'Pie de página' })
    expect(pie).toHaveTextContent('Innovatek S.A.S.')
    expect(pie).toHaveTextContent('Todos los derechos reservados')
  })
})

describe('Deshacer y rehacer', () => {
  beforeEach(() => fijarCsrf(null))
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  const conCambio = { ...presupuestoDePrueba(), puedeDeshacer: true, puedeRehacer: false }
  const deshecho = { ...presupuestoDePrueba(), nombre: 'Obra deshecha', puedeDeshacer: false, puedeRehacer: true }

  it('sin cambios, Deshacer y Rehacer están deshabilitados', async () => {
    instalarApi()
    await abrirApp()

    expect(screen.getByRole('button', { name: /Deshacer/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Rehacer/ })).toBeDisabled()
  })

  it('Deshacer llama a la API y muestra el presupuesto que ella devuelve; luego Rehacer queda habilitado', async () => {
    const { llamadas } = instalarApi({
      presupuesto: conCambio,
      manejador: (url, init) =>
        url === '/api/presupuestos/P-0001/deshacer' && init.method === 'POST' ? json(deshecho) : undefined,
    })
    const usuario = await abrirApp()

    await usuario.click(screen.getByRole('button', { name: /Deshacer/ }))

    expect(await screen.findByTitle('Obra deshecha')).toBeInTheDocument()
    expect(llamadas.some((l) => l.url === '/api/presupuestos/P-0001/deshacer' && l.metodo === 'POST')).toBe(true)
    expect(screen.getByRole('button', { name: /Deshacer/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Rehacer/ })).toBeEnabled()
  })

  it('Ctrl+Z deshace y Ctrl+Y rehace', async () => {
    const { llamadas } = instalarApi({
      presupuesto: conCambio,
      manejador: (url, init) => {
        if (init.method !== 'POST') return undefined
        if (url === '/api/presupuestos/P-0001/deshacer') return json(deshecho)
        if (url === '/api/presupuestos/P-0001/rehacer') return json(conCambio)
        return undefined
      },
    })
    const usuario = await abrirApp()

    await usuario.keyboard('{Control>}z{/Control}')
    await waitFor(() => expect(screen.getByRole('button', { name: /Rehacer/ })).toBeEnabled())
    await usuario.keyboard('{Control>}y{/Control}')
    await waitFor(() => expect(screen.getByRole('button', { name: /Deshacer/ })).toBeEnabled())

    expect(llamadas.map((l) => l.url).filter((u) => u.endsWith('/deshacer') || u.endsWith('/rehacer'))).toEqual([
      '/api/presupuestos/P-0001/deshacer',
      '/api/presupuestos/P-0001/rehacer',
    ])
  })
})

describe('Barra superior', () => {
  beforeEach(() => fijarCsrf(null))
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('los botones de colaborar están, desactivados y explican por qué', async () => {
    instalarApi()
    await abrirApp()

    const grupo = screen.getByRole('group', { name: 'Trabajo colaborativo' })
    for (const nombre of ['Compartir', 'Comentarios', 'Quién está']) {
      const boton = within(grupo).getByRole('button', { name: nombre })
      expect(boton).toBeDisabled()
      expect(boton).toHaveAttribute('title', expect.stringContaining('Pendiente de decisión'))
    }
  })

  it('el menú de la persona muestra su nombre y empresa y ofrece «Cerrar sesión»', async () => {
    instalarApi()
    const usuario = await abrirApp()

    await usuario.click(screen.getByRole('button', { name: /Menú de usuario/ }))

    expect(await screen.findByRole('menuitem', { name: 'Cerrar sesión' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /tema oscuro/ })).toBeInTheDocument()
  })
})

describe('Vista previa del presupuesto', () => {
  beforeEach(() => fijarCsrf(null))
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('muestra capítulos, ítems, costo directo y el cierre con el AIU, tal como los devuelve la API', async () => {
    instalarApi()
    const usuario = await abrirApp()

    await usuario.click(screen.getByRole('button', { name: 'Vista previa' }))

    const doc = await screen.findByRole('article', { name: 'Documento del presupuesto' })
    expect(within(doc).getByText('Obra de prueba')).toBeInTheDocument()
    const items = within(doc).getByRole('table', { name: 'Capítulos e ítems del presupuesto' })
    expect(within(items).getByText('Localización y replanteo')).toBeInTheDocument()
    expect(within(items).getByText('Subtotal 1. Preliminares')).toBeInTheDocument()
    const cierre = within(doc).getByRole('table', { name: 'Costo directo, AIU e IVA' })
    for (const linea of presupuestoDePrueba().cierre) {
      expect(within(cierre).getByText(linea.concepto)).toBeInTheDocument()
    }
    expect(within(cierre).getByText('Total del presupuesto')).toBeInTheDocument()
  })
})

describe('Insertar y eliminar desde los menús y la barra', () => {
  beforeEach(() => fijarCsrf(null))
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('Editar > Insertar ítem e Insertar capítulo abren sus diálogos', async () => {
    instalarApi()
    const usuario = await abrirApp()

    await usuario.click(screen.getByRole('button', { name: 'Editar' }))
    await usuario.click(await screen.findByRole('menuitem', { name: /Insertar capítulo/ }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('Eliminar pide confirmación, llama a DELETE y muestra el presupuesto que devuelve la API', async () => {
    const sinItem = presupuestoDePrueba()
    sinItem.capitulos[0].items = sinItem.capitulos[0].items.slice(1)
    const { llamadas } = instalarApi({
      manejador: (url, init) =>
        url === '/api/presupuestos/P-0001/items/1.01' && init.method === 'DELETE' ? json({ ...sinItem, puedeDeshacer: true }) : undefined,
    })
    const usuario = await abrirApp()
    expect(screen.getByRole('button', { name: 'Eliminar' })).toBeDisabled()

    await usuario.click(screen.getByText('Localización y replanteo'))
    await usuario.click(screen.getByRole('button', { name: 'Eliminar' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Eliminar ítem' })
    await usuario.click(within(dialogo).getByRole('button', { name: 'Eliminar' }))

    await waitFor(() => expect(screen.queryByText('Localización y replanteo')).not.toBeInTheDocument())
    expect(llamadas.some((l) => l.url === '/api/presupuestos/P-0001/items/1.01' && l.metodo === 'DELETE')).toBe(true)
    expect(screen.getByRole('button', { name: /Deshacer/ })).toBeEnabled()
  })
})

describe('Agregar ítem', () => {
  beforeEach(() => fijarCsrf(null))
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('una sola lista de actividades; la cantidad es opcional y, si se deja vacía, se manda en 0 para medirla después', async () => {
    const conNuevo = presupuestoDePrueba()
    conNuevo.capitulos[0].items = [
      ...conNuevo.capitulos[0].items,
      { ...conNuevo.capitulos[0].items[0], codigo: '1.03', descripcion: 'Muro nuevo', cantidad: 0, valorConsiderado: 0, valorCalculado: 0 },
    ]
    const { llamadas } = instalarApi({
      manejador: (url, init) => {
        if (url === '/api/catalogo/capitulos') return json([])
        if (url === '/api/catalogo/actividades')
          return json([{ codigo: 'MAM-01', capitulo: '', descripcion: 'Mampostería en bloque', unidad: 'm2', precioUnitario: 133305 }])
        if (url === '/api/presupuestos/P-0001/capitulos/1/items' && init.method === 'POST') return json(conNuevo)
        return undefined
      },
    })
    const usuario = await abrirApp()

    await usuario.click(screen.getByRole('button', { name: 'Ítem' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Agregar ítem' })

    expect(within(dialogo).queryByLabelText('Capítulo de la base de actividades')).not.toBeInTheDocument()
    expect(within(dialogo).getByLabelText('Cantidad')).toHaveValue('')
    await waitFor(() => expect(within(dialogo).getByRole('option', { name: /MAM-01/ })).toBeInTheDocument())
    await usuario.selectOptions(within(dialogo).getByLabelText('Actividad'), 'MAM-01')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Agregar ítem' }))

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Agregar ítem' })).not.toBeInTheDocument())
    expect(screen.queryByRole('dialog', { name: /Generador de cantidades/ })).not.toBeInTheDocument()
    const post = llamadas.find((l) => l.url === '/api/presupuestos/P-0001/capitulos/1/items')
    expect(post?.cuerpo).toMatchObject({ codigoAnalisis: 'MAM-01', cantidad: 0 })
  })

  it('si se escribe la cantidad al agregar el ítem, se manda tal cual (acepta coma decimal) y no abre el generador', async () => {
    const conNuevo = presupuestoDePrueba()
    conNuevo.capitulos[0].items = [
      ...conNuevo.capitulos[0].items,
      { ...conNuevo.capitulos[0].items[0], codigo: '1.03', descripcion: 'Muro nuevo', cantidad: 0, valorConsiderado: 0, valorCalculado: 0 },
    ]
    const { llamadas } = instalarApi({
      manejador: (url, init) => {
        if (url === '/api/catalogo/capitulos') return json([])
        if (url === '/api/catalogo/actividades')
          return json([{ codigo: 'MAM-01', capitulo: '', descripcion: 'Mampostería en bloque', unidad: 'm2', precioUnitario: 133305 }])
        if (url === '/api/presupuestos/P-0001/capitulos/1/items' && init.method === 'POST') return json(conNuevo)
        return undefined
      },
    })
    const usuario = await abrirApp()

    await usuario.click(screen.getByRole('button', { name: 'Ítem' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Agregar ítem' })

    await waitFor(() => expect(within(dialogo).getByRole('option', { name: /MAM-01/ })).toBeInTheDocument())
    await usuario.selectOptions(within(dialogo).getByLabelText('Actividad'), 'MAM-01')
    await usuario.type(within(dialogo).getByLabelText('Cantidad'), '12,5')
    await usuario.click(within(dialogo).getByRole('button', { name: 'Agregar ítem' }))

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Agregar ítem' })).not.toBeInTheDocument())
    expect(screen.queryByRole('dialog', { name: /Generador de cantidades/ })).not.toBeInTheDocument()
    const post = llamadas.find((l) => l.url === '/api/presupuestos/P-0001/capitulos/1/items')
    expect(post?.cuerpo).toMatchObject({ codigoAnalisis: 'MAM-01', cantidad: 12.5 })
  })
})
