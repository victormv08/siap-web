import { useMemo, useState } from 'react'
import type { ClipboardEvent } from 'react'
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
} from '@fluentui/react-components'
import { api, ErrorDeImportacion } from '../api/cliente'
import type { ErrorDeFila, Presupuesto } from '../api/cliente'
import {
  celdasVacias,
  COLUMNAS_FILAS,
  esPegadoDeFilas,
  FILAS_INICIALES,
  NUMERO_DE_COLUMNAS,
  pegarEnCeldas,
  validarCeldas,
} from './pegadoFilas'

interface Props {
  presupuesto: Presupuesto
  /** Texto ya pegado (Ctrl+V sobre la pantalla); vacío cuando se abre desde el menú. */
  textoInicial: string
  onCerrar: () => void
  onImportado: (actualizado: Presupuesto) => void
}

/** Anchos de las columnas: Capítulo, Código, Descripción, Unidad, Cantidad. */
const ANCHOS = ['22%', '14%', '38%', '8%', '18%']

/**
 * Pegar filas desde Excel en una rejilla de celdas: Capítulo, Código, Descripción, Unidad y Cantidad.
 * Se pega con Ctrl+V sobre cualquier celda (empieza ahí, como en Excel) y cada celda se puede corregir.
 * Todo o nada. La web solo reparte el texto en celdas; la API valida y el precio sale del catálogo.
 */
export function DialogoPegarFilas({ presupuesto, textoInicial, onCerrar, onImportado }: Props) {
  const [celdas, setCeldas] = useState<string[][]>(() =>
    pegarEnCeldas(celdasVacias(FILAS_INICIALES), textoInicial, 0, 0),
  )
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [erroresApi, setErroresApi] = useState<ErrorDeFila[]>([])

  const validadas = useMemo(() => validarCeldas(celdas), [celdas])
  const puedeEnviar = validadas.filas.length > 0 && validadas.problemas.length === 0 && !enviando

  // La API cuenta las filas que recibió; se traducen al número que ve la persona en la rejilla.
  const erroresDeLaApi = erroresApi.map((e) => ({ fila: validadas.numerosDeFila[e.fila - 1] ?? e.fila, motivo: e.motivo }))
  const motivoPorFila = new Map<number, string>()
  for (const p of [...validadas.problemas, ...erroresDeLaApi]) {
    motivoPorFila.set(p.fila, [motivoPorFila.get(p.fila), p.motivo].filter(Boolean).join(' '))
  }

  function cambiar(nuevas: string[][]) {
    setCeldas(nuevas)
    setError(null)
    setErroresApi([])
  }

  function editar(fila: number, columna: number, valor: string) {
    cambiar(celdas.map((f, i) => (i === fila ? f.map((c, j) => (j === columna ? valor : c)) : f)))
  }

  function alPegar(evento: ClipboardEvent<HTMLInputElement>, fila: number, columna: number) {
    const texto = evento.clipboardData.getData('text/plain')
    // Un solo valor se pega normal dentro de la celda; varias celdas o líneas se reparten en la rejilla.
    if (!esPegadoDeFilas(texto)) return
    evento.preventDefault()
    cambiar(pegarEnCeldas(celdas, texto, fila, columna))
  }

  async function importar() {
    if (!puedeEnviar) return
    setEnviando(true)
    setError(null)
    setErroresApi([])
    try {
      onImportado(await api.importarFilas(presupuesto.id, validadas.filas))
      onCerrar()
    } catch (ex) {
      if (ex instanceof ErrorDeImportacion) {
        setError(ex.message)
        setErroresApi(ex.errores)
      } else {
        setError(ex instanceof Error ? ex.message : 'La API no pudo importar las filas.')
      }
    } finally {
      setEnviando(false)
    }
  }

  const hayDatos = validadas.filas.length + validadas.problemas.length > 0

  return (
    <Dialog open onOpenChange={(_, datos) => !datos.open && onCerrar()}>
      <DialogSurface style={{ width: '96vw', maxWidth: 960 }}>
        <form
          onSubmit={(evento) => {
            evento.preventDefault()
            void importar()
          }}
        >
          <DialogBody>
            <DialogTitle>Pegar filas desde Excel</DialogTitle>
            <DialogContent style={{ display: 'grid', gap: 12 }}>
              <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 13 }}>
                Copia las celdas en Excel (<b>{COLUMNAS_FILAS.join(' | ')}</b>), haz clic en la primera celda y pulsa <b>Ctrl+V</b>.
                Descripción y Unidad pueden ir vacías: se toman del catálogo. El precio sale del catálogo, no del Excel.
              </p>
              <div style={{ maxHeight: '48vh', overflow: 'auto', border: '1px solid var(--grid)' }}>
                <table className="g pegar-filas" aria-label="Filas para importar" style={{ minWidth: 640 }}>
                  <colgroup>
                    <col style={{ width: 36 }} />
                    {ANCHOS.map((ancho, k) => (
                      <col key={k} style={{ width: ancho }} />
                    ))}
                  </colgroup>
                  <thead>
                    <tr>
                      <th scope="col" aria-label="Número de fila" />
                      {COLUMNAS_FILAS.map((nombre) => (
                        <th key={nombre} scope="col">
                          {nombre}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {celdas.map((fila, i) => {
                      const motivo = motivoPorFila.get(i + 1)
                      return (
                        <tr key={i} className={motivo ? 'pegar-mal' : undefined}>
                          <td className="pegar-num" title={motivo}>
                            {i + 1}
                          </td>
                          {Array.from({ length: NUMERO_DE_COLUMNAS }, (_, j) => (
                            <td key={j} className={j === NUMERO_DE_COLUMNAS - 1 ? 'n pegar-td' : 'pegar-td'}>
                              <input
                                className="pegar-celda"
                                value={fila[j] ?? ''}
                                aria-label={`${COLUMNAS_FILAS[j]}, fila ${i + 1}`}
                                aria-invalid={motivo ? true : undefined}
                                title={motivo}
                                spellCheck={false}
                                autoComplete="off"
                                onChange={(evento) => editar(i, j, evento.target.value)}
                                onPaste={(evento) => alPegar(evento, i, j)}
                              />
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div>
                <Button
                  appearance="subtle"
                  size="small"
                  onClick={() => cambiar([...celdas, ...celdasVacias(5)])}
                >
                  Agregar 5 filas
                </Button>
                <Button appearance="subtle" size="small" onClick={() => cambiar(celdasVacias(FILAS_INICIALES))}>
                  Limpiar
                </Button>
              </div>
              {hayDatos && (
                <MessageBar intent={validadas.problemas.length > 0 ? 'warning' : 'info'}>
                  <MessageBarBody>
                    {validadas.filas.length} {validadas.filas.length === 1 ? 'fila lista' : 'filas listas'} para importar
                    {validadas.problemas.length > 0 ? `; ${validadas.problemas.length} con problemas` : ''}.
                  </MessageBarBody>
                </MessageBar>
              )}
              {validadas.problemas.length > 0 && (
                <ul aria-label="Filas con problemas" style={{ margin: 0, paddingLeft: 20 }}>
                  {validadas.problemas.map((p) => (
                    <li key={`${p.fila}-${p.motivo}`}>
                      Fila {p.fila}: {p.motivo}
                    </li>
                  ))}
                </ul>
              )}
              {error && (
                <MessageBar intent="error">
                  <MessageBarBody>{error}</MessageBarBody>
                </MessageBar>
              )}
              {erroresDeLaApi.length > 0 && (
                <ul aria-label="Filas rechazadas por la API" style={{ margin: 0, paddingLeft: 20 }}>
                  {erroresDeLaApi.map((e) => (
                    <li key={`${e.fila}-${e.motivo}`}>
                      Fila {e.fila}: {e.motivo}
                    </li>
                  ))}
                </ul>
              )}
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={onCerrar}>
                Cancelar
              </Button>
              <Button type="submit" appearance="primary" disabled={!puedeEnviar}>
                {enviando ? 'Importando…' : 'Importar filas'}
              </Button>
            </DialogActions>
          </DialogBody>
        </form>
      </DialogSurface>
    </Dialog>
  )
}
