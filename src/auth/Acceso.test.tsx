import { cleanup, render, screen, waitFor } from '@testing-library/react'
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

function json(cuerpo: unknown, estado = 200): Response {
  return new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } })
}

interface Llamada {
  url: string
  metodo: string
  cabeceras: Record<string, string>
  cuerpo: unknown
}

/** `conSesion`: lo que responde GET /auth/me al abrir la página. */
function apiSimulada(opciones: { conSesion?: boolean; login?: () => Response } = {}) {
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

async function llenar(usuario: ReturnType<typeof userEvent.setup>, codigo: string, nombre: string, clave: string) {
  if (codigo) await usuario.type(screen.getByLabelText(/Código de empresa/), codigo)
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

    expect(await screen.findByRole('heading', { name: 'Ingresar' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Código de empresa/)).toBeInTheDocument()
    expect(screen.queryByText('Costos directos')).not.toBeInTheDocument()
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

  it('exige los tres campos, no llama a la API y lleva el foco al primero con error', async () => {
    const { llamadas } = apiSimulada()
    const usuario = userEvent.setup()
    render(<App />)
    await screen.findByRole('heading', { name: 'Ingresar' })

    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByText('Escriba el código de la empresa.')).toBeInTheDocument()
    expect(screen.getByText('Escriba su usuario.')).toBeInTheDocument()
    expect(screen.getByText('Escriba su contraseña.')).toBeInTheDocument()
    expect(screen.getByLabelText(/Código de empresa/)).toHaveFocus()
    expect(llamadas.some((l) => l.url === '/api/auth/login')).toBe(false)
  })

  it('pide al menos 6 caracteres de contraseña', async () => {
    const { llamadas } = apiSimulada()
    const usuario = userEvent.setup()
    render(<App />)
    await screen.findByRole('heading', { name: 'Ingresar' })

    await llenar(usuario, 'EMP-PRUEBA', 'ana', 'corta')
    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByText('La contraseña tiene al menos 6 caracteres.')).toBeInTheDocument()
    expect(screen.getByLabelText(/^Contraseña/)).toHaveFocus()
    expect(llamadas.some((l) => l.url === '/api/auth/login')).toBe(false)
  })

  it('envía el código en mayúsculas y sin espacios, entra y muestra empresa y usuario', async () => {
    const { llamadas } = apiSimulada()
    const usuario = userEvent.setup()
    render(<App />)
    await screen.findByRole('heading', { name: 'Ingresar' })

    await llenar(usuario, '  emp-prueba ', ' ana ', 'clave-de-mentira')
    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }))

    await screen.findByText('Empresa de prueba')
    expect(screen.getByText('Ana de prueba')).toBeInTheDocument()
    const login = llamadas.find((l) => l.url === '/api/auth/login')
    expect(login?.metodo).toBe('POST')
    expect(login?.cuerpo).toEqual({ codigo: 'EMP-PRUEBA', usuario: 'ana', password: 'clave-de-mentira' })
    expect(csrfActual()).toBe('token-uno')
  })

  it('muestra el error de la API, borra la contraseña y deja el foco en ella', async () => {
    apiSimulada({ login: () => json({ detail: 'Empresa, usuario o contraseña incorrectos.' }, 401) })
    const usuario = userEvent.setup()
    render(<App />)
    await screen.findByRole('heading', { name: 'Ingresar' })

    await llenar(usuario, 'EMP-PRUEBA', 'ana', 'clave-equivocada')
    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }))

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent('Empresa, usuario o contraseña incorrectos.')
    expect(screen.getByLabelText(/^Contraseña/)).toHaveValue('')
    expect(screen.getByLabelText(/^Contraseña/)).toHaveFocus()
    expect(screen.getByLabelText(/Código de empresa/)).toHaveValue('EMP-PRUEBA')
  })

  it('muestra el aviso de espera cuando la API limita los intentos (429)', async () => {
    apiSimulada({ login: () => json({ detail: 'Demasiados intentos. Espere 5 minutos.' }, 429) })
    const usuario = userEvent.setup()
    render(<App />)
    await screen.findByRole('heading', { name: 'Ingresar' })

    await llenar(usuario, 'EMP-PRUEBA', 'ana', 'clave-de-mentira')
    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Espere 5 minutos')
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
    expect(screen.queryByRole('heading', { name: 'Ingresar' })).not.toBeInTheDocument()
    expect(csrfActual()).toBe('token-uno')
  })

  it('Salir cierra la sesión con el token CSRF y vuelve a la pantalla de entrada', async () => {
    const { llamadas } = apiSimulada({ conSesion: true })
    const usuario = userEvent.setup()
    render(<App />)
    await screen.findByText('Empresa de prueba')

    await usuario.click(screen.getByRole('button', { name: 'Salir' }))

    expect(await screen.findByRole('heading', { name: 'Ingresar' })).toBeInTheDocument()
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
    vi.stubGlobal('fetch', vi.fn(async () => json({ detail: 'Sin sesión.' }, 401)))
    await expect(api.listar()).rejects.toThrow()

    expect(await screen.findByRole('alert')).toHaveTextContent('Su sesión terminó. Ingrese de nuevo.')
    expect(screen.getByRole('heading', { name: 'Ingresar' })).toBeInTheDocument()
    expect(csrfActual()).toBeNull()
  })

  it('un 401 en el inicio de sesión NO muestra el aviso de sesión terminada', async () => {
    apiSimulada({ login: () => json({ detail: 'Empresa, usuario o contraseña incorrectos.' }, 401) })
    const usuario = userEvent.setup()
    render(<App />)
    await screen.findByRole('heading', { name: 'Ingresar' })

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
