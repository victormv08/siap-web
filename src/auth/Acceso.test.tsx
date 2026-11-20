import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { api } from '../api/cliente'
import { csrfActual, fijarCsrf } from './enlace'

/**
 * Pruebas de la pantalla de entrada y de la sesión, con la API simulada y datos inventados (D-16).
 * Ninguna contraseña real: las de aquí son de mentira.
 */

const SESION = {
  empresa: { codigo: 'EMP-PRUEBA', nombre: 'Empresa de prueba' },
  usuario: { usuario: 'ana', nombre: 'Ana de prueba' },
  csrfToken: 'token-uno',
}

const EMPRESAS = [
  { codigo: 'EMP-PRUEBA', nombre: 'Empresa de prueba' },
  { codigo: 'EMP-OTRA', nombre: 'Otra empresa de prueba' },
]

function json(cuerpo: unknown, estado = 200): Response {
  return new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } })
}

interface Llamada {
  url: string
  metodo: string
  cabeceras: Record<string, string>
  cuerpo: unknown
}

interface Opciones {
  /** Lo que responde GET /auth/me al abrir la página. */
  conSesion?: boolean
  login?: () => Response
  /** Respuesta de GET /auth/empresas; por defecto, dos empresas. */
  empresas?: () => Response
}

function apiSimulada(opciones: Opciones = {}) {
  const llamadas: Llamada[] = []
  let sesionVigente = opciones.conSesion ?? false
  const falso = vi.fn(async (entrada: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(entrada)
    llamadas.push({
      url,
      metodo: init.method ?? 'GET',
      cabeceras: (init.headers ?? {}) as Record<string, string>,
      cuerpo: init.body ? JSON.parse(String(init.body)) : undefined,
    })
    if (url === '/api/auth/me') return sesionVigente ? json(SESION) : json({ detail: 'Sin sesión.' }, 401)
    if (url === '/api/auth/empresas') return opciones.empresas?.() ?? json(EMPRESAS)
    if (url === '/api/auth/login') {
      const respuesta = opciones.login?.() ?? json(SESION)
      if (respuesta.ok) sesionVigente = true
      return respuesta
    }
    if (url === '/api/auth/logout') {
      sesionVigente = false
      return new Response(null, { status: 204 })
    }
    if (url === '/api/presupuestos') return json([])
    return json({ detail: 'No encontrado' }, 404)
  })
  vi.stubGlobal('fetch', falso)
  return { llamadas, falso, cerrarSesionEnServidor: () => (sesionVigente = false) }
}

type Usuario = ReturnType<typeof userEvent.setup>

/** Espera a que la lista de empresas esté cargada y devuelve el selector. */
async function selectorDeEmpresa() {
  const selector = screen.getByLabelText(/^Empresa/)
  await waitFor(() => expect(selector).toBeEnabled())
  return selector
}

async function llenar(usuario: Usuario, codigo: string, nombre: string, clave: string) {
  if (codigo) await usuario.selectOptions(await selectorDeEmpresa(), codigo)
  if (nombre) await usuario.type(screen.getByLabelText(/^Usuario/), nombre)
  if (clave) await usuario.type(screen.getByLabelText(/^Contraseña/), clave)
}

describe('Pantalla de entrada', () => {
  beforeEach(() => fijarCsrf(null))
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('sin sesión muestra el formulario y no la aplicación', async () => {
    apiSimulada()
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Ingresar a SIAP' })).toBeInTheDocument()
    expect(screen.getByLabelText(/^Empresa/)).toBeInTheDocument()
    expect(screen.queryByText('Costos directos')).not.toBeInTheDocument()
  })

  it('muestra el título nuevo y el subtítulo', async () => {
    apiSimulada()
    render(<App />)

    expect(await screen.findByRole('heading', { level: 1, name: 'Ingresar a SIAP' })).toBeInTheDocument()
    expect(screen.getByText('Seleccione su empresa e ingrese sus credenciales')).toBeInTheDocument()
    expect(screen.getByText('Presupuestos de obra, claros y trazables')).toBeInTheDocument()
  })

  it('la ilustración es decorativa: oculta a lectores de pantalla y sin foco', async () => {
    apiSimulada()
    render(<App />)
    await screen.findByRole('heading', { name: 'Ingresar a SIAP' })

    const ilustracion = screen.getByTestId('ilustracion-acceso')

    expect(ilustracion).toHaveAttribute('aria-hidden', 'true')
    expect(ilustracion).toHaveAttribute('role', 'presentation')
    expect(ilustracion).toHaveAttribute('focusable', 'false')
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('tiene un pie de página con Innovatek, el año actual y los derechos, sin enlaces', async () => {
    apiSimulada()
    render(<App />)
    await screen.findByRole('heading', { name: 'Ingresar a SIAP' })

    const pie = screen.getByRole('contentinfo')

    expect(within(pie).getByText('Innovatek S.A.S.')).toBeInTheDocument()
    expect(pie).toHaveTextContent(`© ${new Date().getFullYear()} Innovatek S.A.S.`)
    expect(pie).toHaveTextContent('Todos los derechos reservados')
    expect(pie).toHaveTextContent('SIAP · Sistema Integral de Análisis de Precios')
    expect(within(pie).queryByRole('link')).not.toBeInTheDocument()
  })

  it('el pie es lo último de la pantalla, fuera de la tarjeta de entrada', async () => {
    apiSimulada()
    render(<App />)
    await screen.findByRole('heading', { name: 'Ingresar a SIAP' })

    const pie = screen.getByRole('contentinfo')

    expect(pie.nextElementSibling).toBeNull()
    expect(screen.getByRole('main')).not.toContainElement(pie)
  })

  it('carga las empresas en el selector: nombre a la vista, marcador al inicio, nada elegido', async () => {
    const { llamadas } = apiSimulada()
    render(<App />)
    await screen.findByRole('heading', { name: 'Ingresar a SIAP' })

    const selector = await selectorDeEmpresa()

    expect(llamadas.some((l) => l.url === '/api/auth/empresas' && l.metodo === 'GET')).toBe(true)
    expect(screen.getByRole('option', { name: 'Seleccione la empresa' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Empresa de prueba' })).toHaveValue('EMP-PRUEBA')
    expect(screen.getByRole('option', { name: 'Otra empresa de prueba' })).toHaveValue('EMP-OTRA')
    expect(selector).toHaveValue('')
  })

  it('mientras carga la lista, el selector está deshabilitado y dice «Cargando empresas…»', async () => {
    apiSimulada({ empresas: () => new Response(null, { status: 500 }) })
    let liberar: (r: Response) => void = () => undefined
    vi.stubGlobal(
      'fetch',
      vi.fn(async (entrada: RequestInfo | URL) => {
        const url = String(entrada)
        if (url === '/api/auth/me') return json({ detail: 'Sin sesión.' }, 401)
        return new Promise<Response>((resolver) => {
          liberar = resolver
        })
      }),
    )
    render(<App />)
    await screen.findByRole('heading', { name: 'Ingresar a SIAP' })

    expect(screen.getByLabelText(/^Empresa/)).toBeDisabled()
    expect(screen.getByRole('option', { name: 'Cargando empresas…' })).toBeInTheDocument()

    liberar(json(EMPRESAS))
    await waitFor(() => expect(screen.getByLabelText(/^Empresa/)).toBeEnabled())
  })

  it('con una sola empresa, queda preseleccionada', async () => {
    apiSimulada({ empresas: () => json([EMPRESAS[0]]) })
    render(<App />)
    await screen.findByRole('heading', { name: 'Ingresar a SIAP' })

    const selector = await selectorDeEmpresa()

    await waitFor(() => expect(selector).toHaveValue('EMP-PRUEBA'))
  })

  it('si la lista falla, muestra el aviso de la API y «Reintentar» la vuelve a pedir', async () => {
    let intentos = 0
    const { llamadas } = apiSimulada({
      empresas: () => (++intentos === 1 ? json({ detail: 'Servicio no disponible.' }, 503) : json(EMPRESAS)),
    })
    const usuario = userEvent.setup()
    render(<App />)
    await screen.findByRole('heading', { name: 'Ingresar a SIAP' })

    expect(await screen.findByRole('alert')).toHaveTextContent('Servicio no disponible.')
    expect(screen.getByLabelText(/^Empresa/)).toBeDisabled()

    await usuario.click(screen.getByRole('button', { name: 'Reintentar' }))

    await waitFor(() => expect(screen.getByLabelText(/^Empresa/)).toBeEnabled())
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument()
    expect(llamadas.filter((l) => l.url === '/api/auth/empresas')).toHaveLength(2)
  })

  it('si la lista falla sin detalle, usa el mensaje de respaldo', async () => {
    apiSimulada({ empresas: () => new Response('no es json', { status: 500 }) })
    render(<App />)
    await screen.findByRole('heading', { name: 'Ingresar a SIAP' })

    expect(await screen.findByRole('alert')).toHaveTextContent(/La API respondió 500|No se pudieron cargar las empresas/)
  })

  it('si no hay empresas, lo dice y deja el selector deshabilitado', async () => {
    apiSimulada({ empresas: () => json([]) })
    render(<App />)
    await screen.findByRole('heading', { name: 'Ingresar a SIAP' })

    expect(await screen.findByText('No hay empresas disponibles.')).toBeInTheDocument()
    expect(screen.getByLabelText(/^Empresa/)).toBeDisabled()
  })

  it('la contraseña tiene autocompletado de contraseña actual y se puede mostrar y ocultar', async () => {
    apiSimulada()
    const usuario = userEvent.setup()
    render(<App />)
    const campo = await screen.findByLabelText(/^Contraseña/)

    expect(campo).toHaveAttribute('type', 'password')
    expect(campo).toHaveAttribute('autocomplete', 'current-password')
    expect(screen.getByLabelText(/^Usuario/)).toHaveAttribute('autocomplete', 'username')

    await usuario.click(screen.getByRole('button', { name: 'Mostrar contraseña' }))
    expect(campo).toHaveAttribute('type', 'text')
    await usuario.click(screen.getByRole('button', { name: 'Ocultar contraseña' }))
    expect(campo).toHaveAttribute('type', 'password')
  })

  it('exige empresa, usuario y contraseña, no llama a la API y lleva el foco a la empresa', async () => {
    const { llamadas } = apiSimulada()
    const usuario = userEvent.setup()
    render(<App />)
    await screen.findByRole('heading', { name: 'Ingresar a SIAP' })
    await selectorDeEmpresa()

    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByText('Seleccione la empresa.')).toBeInTheDocument()
    expect(screen.getByText('Escriba su usuario.')).toBeInTheDocument()
    expect(screen.getByText('Escriba su contraseña.')).toBeInTheDocument()
    expect(screen.getByLabelText(/^Empresa/)).toHaveFocus()
    expect(llamadas.some((l) => l.url === '/api/auth/login')).toBe(false)
  })

  it('la empresa es obligatoria aunque usuario y contraseña estén bien', async () => {
    const { llamadas } = apiSimulada()
    const usuario = userEvent.setup()
    render(<App />)
    await screen.findByRole('heading', { name: 'Ingresar a SIAP' })
    await selectorDeEmpresa()

    await llenar(usuario, '', 'ana', 'clave-de-mentira')
    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByText('Seleccione la empresa.')).toBeInTheDocument()
    expect(screen.getByLabelText(/^Empresa/)).toHaveFocus()
    expect(llamadas.some((l) => l.url === '/api/auth/login')).toBe(false)

    await usuario.selectOptions(screen.getByLabelText(/^Empresa/), 'EMP-OTRA')
    expect(screen.queryByText('Seleccione la empresa.')).not.toBeInTheDocument()
  })

  it('pide al menos 6 caracteres de contraseña', async () => {
    const { llamadas } = apiSimulada()
    const usuario = userEvent.setup()
    render(<App />)
    await screen.findByRole('heading', { name: 'Ingresar a SIAP' })

    await llenar(usuario, 'EMP-PRUEBA', 'ana', 'corta')
    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByText('La contraseña tiene al menos 6 caracteres.')).toBeInTheDocument()
    expect(screen.getByLabelText(/^Contraseña/)).toHaveFocus()
    expect(llamadas.some((l) => l.url === '/api/auth/login')).toBe(false)
  })

  it('envía el código de la empresa elegida (no su nombre), entra y muestra empresa y usuario', async () => {
    const { llamadas } = apiSimulada()
    const usuario = userEvent.setup()
    render(<App />)
    await screen.findByRole('heading', { name: 'Ingresar a SIAP' })

    await llenar(usuario, 'EMP-OTRA', ' ana ', 'clave-de-mentira')
    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }))

    await screen.findByText('Empresa de prueba')
    expect(screen.getByText('Ana de prueba')).toBeInTheDocument()
    const login = llamadas.find((l) => l.url === '/api/auth/login')
    expect(login?.metodo).toBe('POST')
    expect(login?.cuerpo).toEqual({ codigo: 'EMP-OTRA', usuario: 'ana', password: 'clave-de-mentira' })
    expect(csrfActual()).toBe('token-uno')
  })

  it('muestra el error de la API, borra la contraseña, deja el foco en ella y conserva la empresa', async () => {
    apiSimulada({ login: () => json({ detail: 'Empresa, usuario o contraseña incorrectos.' }, 401) })
    const usuario = userEvent.setup()
    render(<App />)
    await screen.findByRole('heading', { name: 'Ingresar a SIAP' })

    await llenar(usuario, 'EMP-PRUEBA', 'ana', 'clave-equivocada')
    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }))

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent('Empresa, usuario o contraseña incorrectos.')
    expect(screen.getByLabelText(/^Contraseña/)).toHaveValue('')
    expect(screen.getByLabelText(/^Contraseña/)).toHaveFocus()
    expect(screen.getByLabelText(/^Empresa/)).toHaveValue('EMP-PRUEBA')
  })

  it('muestra el aviso de espera cuando la API limita los intentos (429)', async () => {
    apiSimulada({ login: () => json({ detail: 'Demasiados intentos. Espere 5 minutos.' }, 429) })
    const usuario = userEvent.setup()
    render(<App />)
    await screen.findByRole('heading', { name: 'Ingresar a SIAP' })

    await llenar(usuario, 'EMP-PRUEBA', 'ana', 'clave-de-mentira')
    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Espere 5 minutos')
  })

  it('no queda ningún texto que pida escribir el código de la empresa', async () => {
    apiSimulada()
    render(<App />)
    await screen.findByRole('heading', { name: 'Ingresar a SIAP' })
    await selectorDeEmpresa()

    expect(screen.queryByText(/código/i)).not.toBeInTheDocument()
  })
})

describe('Sesión', () => {
  beforeEach(() => fijarCsrf(null))
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('al recargar con una sesión vigente entra directo y recupera el token con /auth/me', async () => {
    apiSimulada({ conSesion: true })
    render(<App />)

    await screen.findByText('Empresa de prueba')
    expect(screen.queryByRole('heading', { name: 'Ingresar a SIAP' })).not.toBeInTheDocument()
    expect(csrfActual()).toBe('token-uno')
  })

  it('Salir cierra la sesión con el token CSRF y vuelve a la pantalla de entrada', async () => {
    const { llamadas } = apiSimulada({ conSesion: true })
    const usuario = userEvent.setup()
    render(<App />)
    await screen.findByText('Empresa de prueba')

    await usuario.click(screen.getByRole('button', { name: 'Salir' }))

    expect(await screen.findByRole('heading', { name: 'Ingresar a SIAP' })).toBeInTheDocument()
    const salida = llamadas.find((l) => l.url === '/api/auth/logout')
    expect(salida?.metodo).toBe('POST')
    expect(salida?.cabeceras['X-CSRF-Token']).toBe('token-uno')
    expect(csrfActual()).toBeNull()
  })

  it('un 401 de la API vuelve a la pantalla de entrada con el aviso de sesión terminada', async () => {
    const { cerrarSesionEnServidor } = apiSimulada({ conSesion: true })
    render(<App />)
    await screen.findByText('Empresa de prueba')

    cerrarSesionEnServidor()
    vi.stubGlobal(
      'fetch',
      vi.fn(async (entrada: RequestInfo | URL) =>
        String(entrada) === '/api/auth/empresas' ? json(EMPRESAS) : json({ detail: 'Sin sesión.' }, 401),
      ),
    )
    await expect(api.listar()).rejects.toThrow()

    expect(await screen.findByRole('alert')).toHaveTextContent('Su sesión terminó. Ingrese de nuevo.')
    expect(screen.getByRole('heading', { name: 'Ingresar a SIAP' })).toBeInTheDocument()
    expect(csrfActual()).toBeNull()
  })

  it('un 401 en el inicio de sesión NO muestra el aviso de sesión terminada', async () => {
    apiSimulada({ login: () => json({ detail: 'Empresa, usuario o contraseña incorrectos.' }, 401) })
    const usuario = userEvent.setup()
    render(<App />)
    await screen.findByRole('heading', { name: 'Ingresar a SIAP' })

    await llenar(usuario, 'EMP-PRUEBA', 'ana', 'clave-equivocada')
    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('incorrectos'))
    expect(screen.queryByText('Su sesión terminó. Ingrese de nuevo.')).not.toBeInTheDocument()
  })
})

describe('Token CSRF en el cliente de la API', () => {
  beforeEach(() => fijarCsrf('token-uno'))
  afterEach(() => {
    fijarCsrf(null)
    vi.unstubAllGlobals()
  })

  it('lo manda en un PUT y no en un GET', async () => {
    const falso = vi.fn(async () => json({}))
    vi.stubGlobal('fetch', falso)

    await api.listar()
    await api.actualizarItem('P-0001', '1.01', { cantidad: 1, excluido: false, motivoExclusion: null })

    const [get, put] = falso.mock.calls as unknown as [string, RequestInit][]
    expect((get[1].headers as Record<string, string>)['X-CSRF-Token']).toBeUndefined()
    expect((put[1].headers as Record<string, string>)['X-CSRF-Token']).toBe('token-uno')
  })
})
