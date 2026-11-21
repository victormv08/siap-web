import {
  Avatar,
  Menu,
  MenuDivider,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
} from '@fluentui/react-components'

interface Props {
  empresa?: string
  usuario?: string
  tema: 'claro' | 'oscuro'
  onCambiarTema: () => void
  onInicio: () => void
  onSalir: () => void
}

const PENDIENTE_COLABORAR = 'Pendiente de decisión: trabajo colaborativo (hoy hay un usuario por empresa y sin roles)'

function Icono({ children }: { children: React.ReactNode }) {
  return (
    <svg className="icono" viewBox="0 0 24 24" aria-hidden="true">
      {children}
    </svg>
  )
}

/**
 * Barra superior: marca a la izquierda; a la derecha los botones de trabajo
 * colaborativo (todavía sin función: aún no hay decisión ni API), la empresa y el menú de la persona con «Cerrar sesión».
 */
export function BarraSuperior({ empresa, usuario, tema, onCambiarTema, onInicio, onSalir }: Props) {
  return (
    <header className="siap-titulo">
      <button type="button" className="siap-marca" aria-label="Ir al inicio (SIAP)" title="Ir a Costos directos" onClick={onInicio}>
        <span className="siap-logo" aria-hidden="true">S</span>
        <span className="siap-marca-texto">
          <b>SIAP</b>
          <small>Sistema Integral de Análisis de Precios</small>
        </span>
      </button>

      <span className="siap-titulo-doc" />

      <div className="siap-colabora" role="group" aria-label="Trabajo colaborativo">
        <button type="button" className="siap-boton-colabora primario" disabled title={PENDIENTE_COLABORAR}>
          <Icono>
            <path d="M16 11a3 3 0 1 0-3-3M3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 8v4M17 10h4" />
          </Icono>
          Compartir
        </button>
        <button type="button" className="siap-boton-colabora" disabled title={PENDIENTE_COLABORAR}>
          <Icono>
            <path d="M4 5h16v11H9l-5 4z" />
          </Icono>
          Comentarios
        </button>
        <button type="button" className="siap-boton-colabora" disabled title={PENDIENTE_COLABORAR}>
          <Icono>
            <path d="M12 5C6 5 2.5 12 2.5 12S6 19 12 19s9.5-7 9.5-7S18 5 12 5zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
          </Icono>
          Quién está
        </button>
      </div>

      {empresa && <span className="siap-empresa">{empresa}</span>}

      <Menu>
        <MenuTrigger disableButtonEnhancement>
          <button type="button" className="siap-avatar" aria-label={`Menú de usuario: ${usuario ?? ''}`.trim()}>
            <Avatar name={usuario} size={28} color="colorful" aria-hidden="true" />
          </button>
        </MenuTrigger>
        <MenuPopover>
          <MenuList>
            <div className="siap-menu-usuario">
              <b>{usuario}</b>
              <span>{empresa}</span>
            </div>
            <MenuDivider />
            <MenuItem onClick={onCambiarTema}>{tema === 'claro' ? 'Cambiar a tema oscuro' : 'Cambiar a tema claro'}</MenuItem>
            <MenuItem onClick={onSalir}>Cerrar sesión</MenuItem>
          </MenuList>
        </MenuPopover>
      </Menu>
    </header>
  )
}
