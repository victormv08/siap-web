import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ContextoSesion } from './contextoSesion'
import type { ValorSesion } from './contextoSesion'
import { alTerminarSesion, fijarCsrf } from './enlace'
import { servicioAuth } from './servicioAuth'
import type { CredencialesEntrada, DatosSesion, EstadoSesion, RespuestaSesion } from './tipos'

export const AVISO_SESION_TERMINADA = 'Su sesión terminó. Ingrese de nuevo.'

function datosDe(respuesta: RespuestaSesion): DatosSesion {
  return { empresa: respuesta.empresa, usuario: respuesta.usuario }
}

/**
 * Estado de la sesión de toda la aplicación. Al iniciar pregunta a GET /auth/me; no guarda nada en el
 * navegador. La cookie de sesión la maneja el navegador y la web no la ve; el token CSRF queda en memoria.
 */
export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoSesion>('cargando')
  const [datos, setDatos] = useState<DatosSesion | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  useEffect(() => {
    let vigente = true
    servicioAuth
      .quienSoy()
      .then((respuesta) => {
        if (!vigente) return
        if (respuesta) {
          fijarCsrf(respuesta.csrfToken)
          setDatos(datosDe(respuesta))
          setEstado('con-sesion')
        } else {
          setEstado('sin-sesion')
        }
      })
      .catch((ex: unknown) => {
        if (!vigente) return
        setAviso(ex instanceof Error ? ex.message : 'No se pudo comprobar la sesión.')
        setEstado('sin-sesion')
      })
    return () => {
      vigente = false
    }
  }, [])

  // Un 401 fuera del inicio de sesión: la sesión venció o se cerró en el servidor.
  useEffect(
    () =>
      alTerminarSesion(() => {
        setDatos(null)
        setAviso(AVISO_SESION_TERMINADA)
        setEstado('sin-sesion')
      }),
    [],
  )

  const entrar = useCallback(async (credenciales: CredencialesEntrada) => {
    const respuesta = await servicioAuth.entrar(credenciales)
    fijarCsrf(respuesta.csrfToken)
    setDatos(datosDe(respuesta))
    setAviso(null)
    setEstado('con-sesion')
  }, [])

  const salir = useCallback(async () => {
    try {
      await servicioAuth.salir()
    } catch {
      // Aunque el servidor no responda, esta pantalla sale: no queda token en memoria.
    }
    fijarCsrf(null)
    setDatos(null)
    setAviso(null)
    setEstado('sin-sesion')
  }, [])

  const valor = useMemo<ValorSesion>(
    () => ({ estado, datos, aviso, entrar, salir }),
    [estado, datos, aviso, entrar, salir],
  )

  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>
}
