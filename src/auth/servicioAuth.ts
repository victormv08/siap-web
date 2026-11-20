import { csrfActual } from './enlace'
import type { CredencialesEntrada, RespuestaSesion } from './tipos'

/**
 * Llamadas de acceso. Van aparte de `api/cliente.ts` a propósito: un 401 en el inicio de sesión
 * significa «credenciales incorrectas», no «la sesión terminó», y no debe disparar el aviso global.
 * Las cookies viajan solas (misma origen); la web nunca ve la cookie de sesión.
 */
export class ErrorDeAcceso extends Error {
  readonly estado: number

  constructor(mensaje: string, estado: number) {
    super(mensaje)
    this.estado = estado
  }
}

async function leerError(respuesta: Response): Promise<string> {
  try {
    const problema = (await respuesta.json()) as { detail?: string; title?: string }
    return problema.detail ?? problema.title ?? `La API respondió ${respuesta.status}.`
  } catch {
    return `La API respondió ${respuesta.status}.`
  }
}

async function pedirAcceso(ruta: string, init: RequestInit): Promise<Response> {
  let respuesta: Response
  try {
    respuesta = await fetch(`/api${ruta}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...init.headers },
    })
  } catch {
    throw new ErrorDeAcceso('No se pudo conectar con el servidor. Revise su conexión e intente de nuevo.', 0)
  }
  return respuesta
}

export const servicioAuth = {
  async entrar(credenciales: CredencialesEntrada): Promise<RespuestaSesion> {
    const respuesta = await pedirAcceso('/auth/login', { method: 'POST', body: JSON.stringify(credenciales) })
    if (!respuesta.ok) throw new ErrorDeAcceso(await leerError(respuesta), respuesta.status)
    return (await respuesta.json()) as RespuestaSesion
  },

  /** Devuelve la sesión vigente, o `null` si no hay (401). */
  async quienSoy(): Promise<RespuestaSesion | null> {
    const respuesta = await pedirAcceso('/auth/me', { method: 'GET' })
    if (respuesta.status === 401) return null
    if (!respuesta.ok) throw new ErrorDeAcceso(await leerError(respuesta), respuesta.status)
    return (await respuesta.json()) as RespuestaSesion
  },

  async salir(): Promise<void> {
    const token = csrfActual()
    await pedirAcceso('/auth/logout', { method: 'POST', headers: token ? { 'X-CSRF-Token': token } : {} })
  },
}
