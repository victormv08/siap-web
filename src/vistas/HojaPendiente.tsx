import { MessageBar, MessageBarBody, Title3, Text, makeStyles, tokens } from '@fluentui/react-components'

const estilos = makeStyles({
  hoja: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM, padding: tokens.spacingHorizontalL, maxWidth: '75ch' },
})

interface Props {
  nombre: string
  motivo: string
}

/**
 * Hoja que está en la maqueta de referencia, pero cuyos datos la API todavía no expone.
 * Se dice explícitamente en vez de mostrar cifras inventadas: la web no calcula ni inventa valores.
 */
export function HojaPendiente({ nombre, motivo }: Props) {
  const e = estilos()
  return (
    <section className={e.hoja} aria-label={nombre}>
      <Title3 as="h2">{nombre}</Title3>
      <MessageBar intent="info">
        <MessageBarBody>Esta hoja todavía no está conectada a la API.</MessageBarBody>
      </MessageBar>
      <Text>{motivo}</Text>
    </section>
  )
}
