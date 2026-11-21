import { useState } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  MessageBar,
  MessageBarBody,
  Text,
} from '@fluentui/react-components'
import { api } from '../api/cliente'
import type { FiguraGeometrica, ResultadoFigura } from '../api/cliente'
import { decimales } from '../formato'

interface Props {
  figuras: FiguraGeometrica[]
  /** Error al cargar el catálogo de figuras, si lo hubo. */
  errorFiguras: string | null
  /** Figura y medidas que la fila ya tiene, para editarlas. */
  inicial: { figura: string; parametros: Record<string, number> } | null
  onUsar: (figura: string, parametros: Record<string, number>) => void
  onCerrar: () => void
}

/** Convierte lo que escribe la persona («12,5» o «12.5») en un número. Es entrada, no cálculo. */
function leerNumero(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.')
  if (limpio === '') return null
  const valor = Number(limpio)
  return Number.isFinite(valor) ? valor : null
}

/**
 * Cuadro de figuras geométricas (GEOMETRIA_GENERADOR). La web solo recoge las medidas; el resultado y su
 * fórmula con los valores sustituidos los calcula la API (POST /catalogo/figuras/{codigo}/calcular).
 */
export function DialogoFiguras({ figuras, errorFiguras, inicial, onUsar, onCerrar }: Props) {
  const [codigo, setCodigo] = useState(inicial?.figura ?? figuras[0]?.codigo ?? '')
  const [valores, setValores] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(inicial?.parametros ?? {}).map(([k, v]) => [k, String(v)])),
  )
  const [resultado, setResultado] = useState<ResultadoFigura | null>(null)
  const [calculando, setCalculando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const figura = figuras.find((f) => f.codigo === codigo) ?? null

  function elegir(nuevo: string) {
    setCodigo(nuevo)
    setValores({})
    setResultado(null)
    setError(null)
  }

  function cambiar(parametro: string, texto: string) {
    setValores((actuales) => ({ ...actuales, [parametro]: texto }))
    setResultado(null) // el resultado anterior ya no corresponde a estas medidas
  }

  /** Medidas escritas, como números. Las vacías o que no son números quedan fuera. */
  function parametrosLeidos(): Record<string, number> {
    const salida: Record<string, number> = {}
    for (const p of figura?.parametros ?? []) {
      const n = leerNumero(valores[p.codigo] ?? '')
      if (n !== null) salida[p.codigo] = n
    }
    return salida
  }

  const completos = figura !== null && figura.parametros.every((p) => leerNumero(valores[p.codigo] ?? '') !== null)

  async function calcular() {
    if (!figura) return
    setCalculando(true)
    setError(null)
    try {
      setResultado(await api.calcularFigura(figura.codigo, parametrosLeidos()))
    } catch (ex) {
      setResultado(null)
      setError(ex instanceof Error ? ex.message : 'No se pudo calcular la figura.')
    } finally {
      setCalculando(false)
    }
  }

  return (
    <Dialog open onOpenChange={(_, datos) => !datos.open && onCerrar()}>
      <DialogSurface style={{ maxWidth: 560, width: '95vw' }} aria-label="Figuras geométricas">
        <DialogBody>
          <DialogTitle>Figuras geométricas</DialogTitle>
          <DialogContent>
            {errorFiguras && (
              <div role="alert">
                <MessageBar intent="error">
                  <MessageBarBody>{errorFiguras}</MessageBarBody>
                </MessageBar>
              </div>
            )}
            {!errorFiguras && figuras.length === 0 && <Text as="p">No hay figuras disponibles.</Text>}

            {figuras.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <Text weight="semibold">Figura</Text>
                  <select aria-label="Figura" value={codigo} onChange={(e) => elegir(e.target.value)} style={{ height: 32 }}>
                    {figuras.map((f) => (
                      <option key={f.codigo} value={f.codigo}>
                        {f.nombre} ({f.resultado === 'S' ? 'área' : 'volumen'}, {f.unidad})
                      </option>
                    ))}
                  </select>
                </label>

                {figura && (
                  <>
                    <Text as="p">
                      Fórmula: <Text weight="semibold">{figura.formula}</Text>
                    </Text>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                      {figura.parametros.map((p) => (
                        <label key={p.codigo} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <Text>{p.etiqueta}</Text>
                          <input
                            aria-label={p.etiqueta}
                            value={valores[p.codigo] ?? ''}
                            onChange={(e) => cambiar(p.codigo, e.target.value)}
                            inputMode="decimal"
                            style={{ height: 32, padding: '0 8px' }}
                          />
                        </label>
                      ))}
                    </div>
                  </>
                )}

                {error && (
                  <div role="alert">
                    <MessageBar intent="error">
                      <MessageBarBody>{error}</MessageBarBody>
                    </MessageBar>
                  </div>
                )}

                {resultado && (
                  <div role="status">
                    <Text as="p" weight="semibold">
                      Resultado: {decimales(resultado.resultado)} {resultado.unidad}
                    </Text>
                    <Text as="p" size={200}>
                      {resultado.formula}
                    </Text>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onCerrar}>
              Cerrar
            </Button>
            <Button appearance="outline" onClick={() => void calcular()} disabled={!figura || calculando}>
              {calculando ? 'Calculando…' : 'Calcular'}
            </Button>
            <Button
              appearance="primary"
              disabled={!completos}
              title={completos ? undefined : 'Escriba todas las medidas de la figura'}
              onClick={() => figura && onUsar(figura.codigo, parametrosLeidos())}
            >
              Usar en la fila
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}
