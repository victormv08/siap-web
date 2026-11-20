import {
  Body1,
  Card,
  FluentProvider,
  Text,
  Title1,
  makeStyles,
  tokens,
  webLightTheme,
} from '@fluentui/react-components'

const useStyles = makeStyles({
  pagina: {
    minHeight: '100vh',
    padding: tokens.spacingHorizontalXXL,
    backgroundColor: tokens.colorNeutralBackground2,
    boxSizing: 'border-box',
  },
  contenido: {
    maxWidth: '720px',
    display: 'flex',
    flexDirection: 'column',
    rowGap: tokens.spacingVerticalL,
  },
})

/**
 * Esqueleto de la v1 web (ADR-014). Todavía no hay pantallas de producto.
 * Regla: la web nunca calcula dinero; lo calcula el núcleo de cálculo en la API (D-27).
 */
function App() {
  const estilos = useStyles()

  return (
    <FluentProvider theme={webLightTheme}>
      <main className={estilos.pagina}>
        <div className={estilos.contenido}>
          <Title1 as="h1">SIAP</Title1>
          <Body1>Plataforma web para elaborar presupuestos de obras civiles.</Body1>
          <Card>
            <Text weight="semibold">Esqueleto de la v1 web</Text>
            <Text>Las pantallas de producto se construyen a partir de aquí.</Text>
          </Card>
        </div>
      </main>
    </FluentProvider>
  )
}

export default App
