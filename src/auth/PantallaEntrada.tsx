import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import {
  Button,
  Field,
  FluentProvider,
  Input,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  Select,
  mergeClasses,
  Spinner,
  Text,
  Title2,
  Title3,
  makeStyles,
  tokens,
  webDarkTheme,
  webLightTheme,
} from '@fluentui/react-components'
import { useSesion } from './contextoSesion'
import { servicioAuth } from './servicioAuth'
import type { Empresa } from './tipos'
import { IlustracionAcceso } from './IlustracionAcceso'
import { infoInnovatek, textoDerechos } from './infoInnovatek'
import { IconoCandado, IconoEmpresa, IconoOjo, IconoPersona } from './IconosAcceso'

// Colores de marca de SIAP (los mismos de la barra de título de la aplicación).
// Texto dorado sobre este azul: contraste 6,9:1 (mínimo 4,5:1 de WCAG 2.2 AA).
const MARINO = '#0f2240'
const MARINO_CLARO = '#183463'
const DORADO = '#c8a84d'
const TEXTO_SOBRE_MARINO = '#e9eef6'
const TEXTO_TENUE_SOBRE_MARINO = '#b9c3d4'

const ANCHO_DOS_COLUMNAS = '900px'

const estilos = makeStyles({
  // Esta pantalla hace su propio desplazamiento: el <body> de la aplicación tiene overflow oculto.
  pagina: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    color: tokens.colorNeutralForeground1,
    backgroundColor: tokens.colorNeutralBackground2,
    backgroundImage: `radial-gradient(ellipse at 12% 18%, ${tokens.colorBrandBackground2} 0%, transparent 52%), linear-gradient(160deg, ${tokens.colorNeutralBackground2} 0%, ${tokens.colorNeutralBackground3} 100%)`,
  },
  barra: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    height: '48px',
    boxSizing: 'border-box',
    padding: `0 ${tokens.spacingHorizontalXL}`,
    backgroundColor: MARINO,
    borderBottom: `3px solid ${DORADO}`,
  },
  marca: {
    color: DORADO,
    fontWeight: tokens.fontWeightBold,
    fontSize: tokens.fontSizeBase500,
    lineHeight: tokens.lineHeightBase500,
    letterSpacing: '0.1em',
  },
  barraTexto: {
    marginLeft: tokens.spacingHorizontalM,
    color: TEXTO_SOBRE_MARINO,
    fontSize: tokens.fontSizeBase200,
    display: 'none',
    '@media (min-width: 600px)': { display: 'inline' },
  },
  contenido: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr)',
    alignItems: 'center',
    justifyItems: 'center',
    gap: tokens.spacingHorizontalXXXL,
    boxSizing: 'border-box',
    width: '100%',
    maxWidth: '1180px',
    margin: '0 auto',
    padding: `${tokens.spacingVerticalXXL} ${tokens.spacingHorizontalL}`,
    [`@media (min-width: ${ANCHO_DOS_COLUMNAS})`]: {
      gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
      padding: `${tokens.spacingVerticalXXXL} ${tokens.spacingHorizontalXXXL}`,
    },
  },
  // Columna izquierda: solo desde 900 px. Por debajo se oculta entera (la marca ya está en la barra).
  izquierda: {
    display: 'none',
    flexDirection: 'column',
    alignItems: 'center',
    gap: tokens.spacingVerticalL,
    textAlign: 'center',
    width: '100%',
    [`@media (min-width: ${ANCHO_DOS_COLUMNAS})`]: { display: 'flex' },
  },
  nombre: { color: tokens.colorNeutralForeground1 },
  apoyo: { color: tokens.colorNeutralForeground2 },
  tarjeta: {
    width: '100%',
    maxWidth: '460px',
    boxSizing: 'border-box',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: '16px',
    boxShadow: tokens.shadow28,
    padding: `${tokens.spacingVerticalXXXL} ${tokens.spacingHorizontalXXXL}`,
    '@media (max-width: 480px)': { padding: `${tokens.spacingVerticalXXL} ${tokens.spacingHorizontalXL}` },
  },
  formulario: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM },
  cabecera: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXXS },
  subtitulo: { color: tokens.colorNeutralForeground2 },
  // Campos con relleno suave y sin borde duro; al enfocar, borde con el color de marca (azul en tema claro,
  // dorado en el oscuro: así se distingue del fondo en los dos).
  campo: {
    minHeight: '44px',
    borderRadius: '10px',
    border: '1px solid transparent',
    ':focus-within': { border: 'none', outline: 'var(--siap-foco) solid 2px', outlineOffset: '0' },
  },
  contenedorSelect: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    width: '100%',
  },
  // El selector ocupa todo el ancho, igual que los otros campos.
  selectAncho: { width: '100%', flexGrow: 1 },
  iconoSelect: {
    position: 'absolute',
    left: tokens.spacingHorizontalM,
    display: 'flex',
    pointerEvents: 'none',
    color: tokens.colorNeutralForeground3,
    zIndex: 1,
  },
  select: { paddingLeft: '40px' },
  icono: { color: tokens.colorNeutralForeground3, display: 'flex' },
  boton: {
    marginTop: tokens.spacingVerticalS,
    minHeight: '48px',
    borderRadius: '10px',
    fontWeight: tokens.fontWeightSemibold,
    backgroundColor: MARINO,
    color: DORADO,
    border: `1px solid ${DORADO}`,
    ':hover': { backgroundColor: MARINO_CLARO, color: DORADO, border: `1px solid ${DORADO}` },
    ':hover:active': { backgroundColor: MARINO, color: DORADO, border: `1px solid ${DORADO}` },
  },
  pie: { color: tokens.colorNeutralForeground3, textAlign: 'center', marginTop: tokens.spacingVerticalXS },
  // Pie de página: franja de marca (no depende del tema) que hace pareja con la barra superior.
  // Siempre al borde inferior: la raíz es una columna y el <main> crece. Apilado y centrado por debajo de 600 px.
  piePagina: {
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: tokens.spacingVerticalXXS,
    boxSizing: 'border-box',
    width: '100%',
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalXL}`,
    backgroundColor: MARINO,
    borderTop: `3px solid ${DORADO}`,
    textAlign: 'center',
    fontSize: tokens.fontSizeBase200,
    lineHeight: tokens.lineHeightBase200,
    '@media (min-width: 600px)': {
      flexDirection: 'row',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      columnGap: tokens.spacingHorizontalXL,
      textAlign: 'left',
    },
  },
  piePaginaNombre: { color: DORADO, fontWeight: tokens.fontWeightBold },
  piePaginaDerechos: { color: TEXTO_SOBRE_MARINO, overflowWrap: 'anywhere' },
  // Más tenue que el resto, pero con contraste de 8,8:1 sobre el azul marino (mínimo 4,5:1).
  piePaginaProducto: { color: TEXTO_TENUE_SOBRE_MARINO, overflowWrap: 'anywhere' },
})

interface Errores {
  empresa?: string
  usuario?: string
  password?: string
}

type CargaEmpresas =
  | { estado: 'cargando' }
  | { estado: 'lista'; empresas: Empresa[] }
  | { estado: 'error'; mensaje: string }

const MINIMO_CONTRASENA = 6

function validar(codigo: string, usuario: string, password: string): Errores {
  const errores: Errores = {}
  if (!codigo) errores.empresa = 'Seleccione la empresa.'
  if (!usuario) errores.usuario = 'Escriba su usuario.'
  if (!password) errores.password = 'Escriba su contraseña.'
  else if (password.length < MINIMO_CONTRASENA) {
    errores.password = `La contraseña tiene al menos ${MINIMO_CONTRASENA} caracteres.`
  }
  return errores
}

/**
 * El modo claro es el predeterminado (decisión de Ana Carolina, 2026-11-20): la pantalla no sigue la preferencia
 * del sistema. Si más adelante hay un selector de tema, se engancha aquí; los estilos oscuros ya están listos.
 */
function useTemaOscuro(): boolean {
  return false
}

/**
 * Pantalla de entrada: empresa (de una lista), usuario y contraseña. La lista de empresas es pública y
 * solo trae nombre y código; el código es lo que se envía. La contraseña nunca se guarda ni se muestra en avisos.
 * Diseño de dos columnas desde 900 px: ilustración a la izquierda y tarjeta a la derecha.
 */
export function PantallaEntrada() {
  const e = estilos()
  const oscuro = useTemaOscuro()
  const { entrar, aviso } = useSesion()
  const [carga, setCarga] = useState<CargaEmpresas>({ estado: 'cargando' })
  const [codigo, setCodigo] = useState('')
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [verPassword, setVerPassword] = useState(false)
  const [errores, setErrores] = useState<Errores>({})
  const [enviando, setEnviando] = useState(false)
  const [errorApi, setErrorApi] = useState<string | null>(null)

  const refEmpresa = useRef<HTMLSelectElement>(null)
  const refUsuario = useRef<HTMLInputElement>(null)
  const refPassword = useRef<HTMLInputElement>(null)

  // El estado inicial ya es «cargando»; el reintento lo vuelve a poner desde el botón, no desde el efecto.
  const pedirEmpresas = useCallback(() => {
    return servicioAuth
      .empresas()
      .then((empresas) => {
        setCarga({ estado: 'lista', empresas })
        // Con una sola empresa no hay nada que elegir: queda seleccionada.
        if (empresas.length === 1) setCodigo(empresas[0].codigo)
      })
      .catch((ex: unknown) => {
        setCarga({
          estado: 'error',
          mensaje: ex instanceof Error && ex.message ? ex.message : 'No se pudieron cargar las empresas.',
        })
      })
  }, [])

  useEffect(() => {
    void pedirEmpresas()
  }, [pedirEmpresas])

  function reintentar() {
    setCarga({ estado: 'cargando' })
    void pedirEmpresas()
  }

  const empresas = carga.estado === 'lista' ? carga.empresas : []
  const mensaje = errorApi ?? aviso

  // Los errores de campo se calculan solo al enviar y se quitan al corregir ese campo.
  // Así, borrar la contraseña tras un fallo de la API no la marca como «obligatoria».
  function corregir(campo: keyof Errores) {
    setErrores((previos) => (previos[campo] ? { ...previos, [campo]: undefined } : previos))
  }

  async function alEnviar(evento: FormEvent) {
    evento.preventDefault()
    if (enviando) return
    setErrorApi(null)

    const nombreUsuario = usuario.trim()
    const fallos = validar(codigo, nombreUsuario, password)
    setErrores(fallos)
    if (fallos.empresa) return void refEmpresa.current?.focus()
    if (fallos.usuario) return void refUsuario.current?.focus()
    if (fallos.password) return void refPassword.current?.focus()

    setEnviando(true)
    try {
      await entrar({ codigo, usuario: nombreUsuario, password })
    } catch (ex) {
      setErrorApi(ex instanceof Error ? ex.message : 'No se pudo ingresar. Intente de nuevo.')
      setPassword('')
      setVerPassword(false)
      refPassword.current?.focus()
    } finally {
      setEnviando(false)
    }
  }

  return (
    <FluentProvider theme={oscuro ? webDarkTheme : webLightTheme} style={{ height: '100vh' }}>
      <div
        className={e.pagina}
        style={{ ['--siap-foco' as string]: oscuro ? DORADO : MARINO }}
      >
        <header className={e.barra}>
          <span className={e.marca}>SIAP</span>
          <span className={e.barraTexto}>Sistema Integral de Análisis de Precios</span>
        </header>

        <main className={e.contenido}>
          <aside className={e.izquierda}>
            <IlustracionAcceso />
            <Title3 as="p" className={e.nombre}>
              Sistema Integral de Análisis de Precios
            </Title3>
            <Text className={e.apoyo}>Presupuestos de obra, claros y trazables</Text>
          </aside>

          <section className={e.tarjeta} aria-labelledby="titulo-entrada">
            <form className={e.formulario} onSubmit={(ev) => void alEnviar(ev)} noValidate aria-busy={enviando}>
              <div className={e.cabecera}>
                <Title2 as="h1" id="titulo-entrada">
                  Ingresar a SIAP
                </Title2>
                <Text className={e.subtitulo}>Seleccione su empresa e ingrese sus credenciales</Text>
              </div>

              {mensaje ? (
                <div role="alert">
                  <MessageBar intent={errorApi ? 'error' : 'warning'}>
                    <MessageBarBody>{mensaje}</MessageBarBody>
                  </MessageBar>
                </div>
              ) : null}

              {carga.estado === 'error' ? (
                <div role="alert">
                  <MessageBar intent="error">
                    <MessageBarBody>{carga.mensaje}</MessageBarBody>
                    <MessageBarActions>
                      <Button type="button" size="small" onClick={reintentar}>
                        Reintentar
                      </Button>
                    </MessageBarActions>
                  </MessageBar>
                </div>
              ) : null}

              {carga.estado === 'lista' && empresas.length === 0 ? (
                <div role="alert">
                  <MessageBar intent="warning">
                    <MessageBarBody>No hay empresas disponibles.</MessageBarBody>
                  </MessageBar>
                </div>
              ) : null}

              <Field
                label="Empresa"
                required
                validationState={errores.empresa ? 'error' : 'none'}
                validationMessage={errores.empresa}
              >
                {(propiedades) => (
                  <div className={e.contenedorSelect}>
                    <span className={e.iconoSelect} aria-hidden="true">
                      <IconoEmpresa />
                    </span>
                    <Select
                      {...propiedades}
                      ref={refEmpresa}
                      appearance="filled-darker"
                      className={mergeClasses(e.campo, e.selectAncho)}
                      select={{ className: e.select }}
                      value={codigo}
                      disabled={carga.estado !== 'lista' || empresas.length === 0}
                      onChange={(_, d) => {
                        setCodigo(d.value)
                        corregir('empresa')
                      }}
                    >
                      <option value="">
                        {carga.estado === 'cargando' ? 'Cargando empresas…' : 'Seleccione la empresa'}
                      </option>
                      {empresas.map((empresa) => (
                        <option key={empresa.codigo} value={empresa.codigo}>
                          {empresa.nombre}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}
              </Field>

              <Field
                label="Usuario"
                required
                validationState={errores.usuario ? 'error' : 'none'}
                validationMessage={errores.usuario}
              >
                <Input
                  ref={refUsuario}
                  appearance="filled-darker"
                  className={e.campo}
                  contentBefore={
                    <span className={e.icono}>
                      <IconoPersona />
                    </span>
                  }
                  value={usuario}
                  onChange={(_, d) => {
                    setUsuario(d.value)
                    corregir('usuario')
                  }}
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                />
              </Field>

              <Field
                label="Contraseña"
                required
                validationState={errores.password ? 'error' : 'none'}
                validationMessage={errores.password}
              >
                <Input
                  ref={refPassword}
                  appearance="filled-darker"
                  className={e.campo}
                  type={verPassword ? 'text' : 'password'}
                  contentBefore={
                    <span className={e.icono}>
                      <IconoCandado />
                    </span>
                  }
                  value={password}
                  onChange={(_, d) => {
                    setPassword(d.value)
                    corregir('password')
                  }}
                  autoComplete="current-password"
                  contentAfter={
                    <Button
                      type="button"
                      appearance="transparent"
                      size="small"
                      icon={<IconoOjo tachado={verPassword} />}
                      aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      aria-pressed={verPassword}
                      onClick={() => setVerPassword((v) => !v)}
                    />
                  }
                />
              </Field>

              <Button
                className={e.boton}
                type="submit"
                appearance="primary"
                size="large"
                disabledFocusable={enviando}
                icon={enviando ? <Spinner size="tiny" appearance="inverted" /> : undefined}
              >
                {enviando ? 'Ingresando…' : 'Ingresar'}
              </Button>

              <Text size={200} className={e.pie}>
                ¿No recuerda su usuario o contraseña? Pídalos al administrador de su empresa.
              </Text>
            </form>
          </section>
        </main>

        <footer className={e.piePagina}>
          <strong className={e.piePaginaNombre}>{infoInnovatek.nombre}</strong>
          <span className={e.piePaginaDerechos}>{textoDerechos()}</span>
          <span className={e.piePaginaProducto}>{infoInnovatek.producto}</span>
        </footer>
      </div>
    </FluentProvider>
  )
}
