/**
 * Punto de unión entre el cliente de la API y la sesión. No importa nada del proyecto, para que
 * `api/cliente.ts` y `auth/` no dependan el uno del otro en círculo.
 *
 * El token CSRF vive solo en esta variable de módulo (memoria de JavaScript): nunca en
 * localStorage, sessionStorage ni cookie. Tras recargar la página se recupera con GET /auth/me.
 */
let tokenCsrf: string | null = null
let oyente: (() => void) | null = null

export function csrfActual(): string | null {
  return tokenCsrf
}

export function fijarCsrf(token: string | null): void {
  tokenCsrf = token
}

/** La sesión registra aquí qué hacer cuando la API responde 401 fuera del inicio de sesión. */
export function alTerminarSesion(accion: () => void): () => void {
  oyente = accion
  return () => {
    if (oyente === accion) oyente = null
  }
}

/** Lo llama el cliente de la API ante un 401. Olvida el token y avisa a la sesión. */
export function sesionTerminada(): void {
  tokenCsrf = null
  oyente?.()
}
