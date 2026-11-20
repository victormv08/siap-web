/** Forma de las respuestas de /auth/login y /auth/me (contrato con siap-api). */
export interface Empresa {
  codigo: string
  nombre: string
}

export interface UsuarioSesion {
  usuario: string
  nombre: string
}

export interface RespuestaSesion {
  empresa: Empresa
  usuario: UsuarioSesion
  csrfToken: string
}

/** Lo que la web sabe de la sesión. El token CSRF no está aquí: vive en `enlace.ts`, solo en memoria. */
export interface DatosSesion {
  empresa: Empresa
  usuario: UsuarioSesion
}

export type EstadoSesion = 'cargando' | 'sin-sesion' | 'con-sesion'

export interface CredencialesEntrada {
  codigo: string
  usuario: string
  password: string
}
