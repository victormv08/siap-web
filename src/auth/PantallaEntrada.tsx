import { useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import {
  Button,
  Field,
  FluentProvider,
  Input,
  MessageBar,
  MessageBarBody,
  Spinner,
  Subtitle2,
  Text,
  Title2,
  makeStyles,
  tokens,
  webDarkTheme,
} from '@fluentui/react-components'
import { useSesion } from './contextoSesion'

const estilos = makeStyles({
  fondo: {
    minHeight: '100vh',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacingVerticalXXL,
    backgroundColor: tokens.colorNeutralBackground2,
    overflowY: 'auto',
  },
  tarjeta: {
    width: '100%',
    maxWidth: '420px',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusXLarge,
    boxShadow: tokens.shadow16,
    overflow: 'hidden',
  },
  encabezado: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS,
    padding: `${tokens.spacingVerticalL} ${tokens.spacingHorizontalXXL}`,
    backgroundColor: '#0f2240',
    borderBottom: '3px solid #c8a84d',
  },
  marca: {
    color: '#c8a84d',
    fontWeight: tokens.fontWeightBold,
    letterSpacing: '0.08em',
    fontSize: tokens.fontSizeHero700,
    lineHeight: tokens.lineHeightHero700,
  },
  programa: { color: '#e9eef6' },
  cuerpo: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    padding: tokens.spacingHorizontalXXL,
  },
  boton: { marginTop: tokens.spacingVerticalS, minHeight: '40px' },
  pie: { color: tokens.colorNeutralForeground3, textAlign: 'center' },
})

interface Errores {
  codigo?: string
  usuario?: string
  password?: string
}

const MINIMO_CONTRASENA = 6

function validar(codigo: string, usuario: string, password: string): Errores {
  const errores: Errores = {}
  if (!codigo) errores.codigo = 'Escriba el código de la empresa.'
  if (!usuario) errores.usuario = 'Escriba su usuario.'
  if (!password) errores.password = 'Escriba su contraseña.'
  else if (password.length < MINIMO_CONTRASENA) {
    errores.password = `La contraseña tiene al menos ${MINIMO_CONTRASENA} caracteres.`
  }
  return errores
}

function IconoOjo({ tachado }: { tachado: boolean }): ReactNode {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {tachado ? <path d="M4 4l16 16" /> : null}
    </svg>
  )
}

/**
 * Pantalla de entrada: código de empresa, usuario y contraseña. El código se escribe; no hay lista de
 * empresas, para no revelar quiénes son clientes. La contraseña nunca se guarda ni se muestra en avisos.
 */
export function PantallaEntrada() {
  const e = estilos()
  const { entrar, aviso } = useSesion()
  const [codigo, setCodigo] = useState('')
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [verPassword, setVerPassword] = useState(false)
  const [errores, setErrores] = useState<Errores>({})
  const [enviando, setEnviando] = useState(false)
  const [errorApi, setErrorApi] = useState<string | null>(null)

  const refCodigo = useRef<HTMLInputElement>(null)
  const refUsuario = useRef<HTMLInputElement>(null)
  const refPassword = useRef<HTMLInputElement>(null)

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

    const limpio = { codigo: codigo.trim(), usuario: usuario.trim() }
    const fallos = validar(limpio.codigo, limpio.usuario, password)
    setErrores(fallos)
    if (fallos.codigo) return void refCodigo.current?.focus()
    if (fallos.usuario) return void refUsuario.current?.focus()
    if (fallos.password) return void refPassword.current?.focus()

    setEnviando(true)
    try {
      await entrar({ ...limpio, password })
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
    <FluentProvider theme={webDarkTheme} style={{ minHeight: '100vh' }}>
      <main className={e.fondo}>
        <section className={e.tarjeta} aria-labelledby="titulo-entrada">
          <header className={e.encabezado}>
            <span className={e.marca} aria-hidden="true">
              SIAP
            </span>
            <Subtitle2 className={e.programa}>Sistema Integral de Análisis de Precios</Subtitle2>
          </header>

          <form className={e.cuerpo} onSubmit={(ev) => void alEnviar(ev)} noValidate aria-busy={enviando}>
            <Title2 as="h1" id="titulo-entrada">
              Ingresar
            </Title2>

            {mensaje ? (
              <div role="alert">
                <MessageBar intent={errorApi ? 'error' : 'warning'}>
                  <MessageBarBody>{mensaje}</MessageBarBody>
                </MessageBar>
              </div>
            ) : null}

            <Field
              label="Código de empresa"
              required
              hint="El código que le dio su empresa."
              validationState={errores.codigo ? 'error' : 'none'}
              validationMessage={errores.codigo}
            >
              <Input
                ref={refCodigo}
                value={codigo}
                onChange={(_, d) => {
                  setCodigo(d.value.toUpperCase())
                  corregir('codigo')
                }}
                autoComplete="organization"
                autoCapitalize="characters"
                spellCheck={false}
                autoFocus
              />
            </Field>

            <Field
              label="Usuario"
              required
              validationState={errores.usuario ? 'error' : 'none'}
              validationMessage={errores.usuario}
            >
              <Input
                ref={refUsuario}
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
                type={verPassword ? 'text' : 'password'}
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
              icon={enviando ? <Spinner size="tiny" /> : undefined}
            >
              {enviando ? 'Ingresando…' : 'Ingresar'}
            </Button>

            <Text size={200} className={e.pie}>
              ¿No recuerda el código o la contraseña? Pídalos al administrador de su empresa.
            </Text>
          </form>
        </section>
      </main>
    </FluentProvider>
  )
}
