import type { ReactNode } from 'react'
import { FluentProvider, Spinner, webLightTheme } from '@fluentui/react-components'
import { useSesion } from './contextoSesion'
import { PantallaEntrada } from './PantallaEntrada'

/** Muestra la aplicación solo si hay sesión; si no, la pantalla de entrada. */
export function GuardianSesion({ children }: { children: ReactNode }) {
  const { estado } = useSesion()

  if (estado === 'cargando') {
    return (
      <FluentProvider theme={webLightTheme}>
        <div style={{ padding: 16 }}>
          <Spinner label="Comprobando la sesión…" />
        </div>
      </FluentProvider>
    )
  }

  return estado === 'con-sesion' ? <>{children}</> : <PantallaEntrada />
}
