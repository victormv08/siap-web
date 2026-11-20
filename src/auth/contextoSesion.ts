import { createContext, useContext } from 'react'
import type { CredencialesEntrada, DatosSesion, EstadoSesion } from './tipos'

export interface ValorSesion {
  estado: EstadoSesion
  /** Datos de la sesión; solo hay cuando `estado` es «con-sesion». */
  datos: DatosSesion | null
  /** Aviso para la pantalla de entrada (por ejemplo, que la sesión terminó). */
  aviso: string | null
  entrar: (credenciales: CredencialesEntrada) => Promise<void>
  salir: () => Promise<void>
}

export const ContextoSesion = createContext<ValorSesion | null>(null)

export function useSesion(): ValorSesion {
  const valor = useContext(ContextoSesion)
  if (!valor) throw new Error('useSesion debe usarse dentro de ProveedorSesion.')
  return valor
}
