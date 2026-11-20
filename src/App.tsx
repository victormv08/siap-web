import { useEffect, useState } from 'react'
import {
  Button,
  FluentProvider,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  MessageBar,
  MessageBarBody,
  Spinner,
  Tab,
  TabList,
  Text,
  Toolbar,
  ToolbarButton,
  ToolbarDivider,
  makeStyles,
  tokens,
  webLightTheme,
} from '@fluentui/react-components'
import { api } from './api/cliente'
import type { ConfiguracionCierre, ItemResultado, Presupuesto, ResumenPresupuesto } from './api/cliente'
import { pesos } from './formato'
import { CostosDirectos } from './vistas/CostosDirectos'
import { AiuEIva, PresupuestoTotal } from './vistas/Cierre'
import { PanelApu } from './vistas/PanelApu'
import { DialogoExcluir } from './vistas/DialogoExcluir'
import { HojaPendiente } from './vistas/HojaPendiente'

type Hoja = 'cd' | 'cant' | 'apu' | 'ins' | 'dg' | 'tot' | 'form' | 'res' | 'gantt' | 'hist'

/** Mismo orden de hojas que la maqueta de referencia. */
const HOJAS: [Hoja, string][] = [
  ['cd', 'Costos directos'],
  ['cant', 'Cantidades'],
  ['apu', 'APU'],
  ['ins', 'Insumos'],
  ['dg', 'Datos generales · AIU'],
  ['tot', 'Presupuesto total'],
  ['form', 'Formulario de precios'],
  ['res', 'Resumen desagregado'],
  ['gantt', 'Gantt'],
  ['hist', 'Historial'],
]

/** Por qué cada hoja aún no tiene datos de la API. Sin cifras inventadas. */
const PENDIENTES: Partial<Record<Hoja, { nombre: string; motivo: string }>> = {
  cant: {
    nombre: 'Cantidades',
    motivo:
      'La memoria de cálculo (generador de cantidades) necesita su propio recurso en la API y la regla de la tabla de acero (R-017).',
  },
  apu: {
    nombre: 'APU',
    motivo:
      'Por ahora el análisis de cada ítem se ve en el panel inferior de Costos directos. La edición de APU todavía no tiene endpoints de escritura.',
  },
  ins: {
    nombre: 'Insumos',
    motivo:
      'El catálogo de insumos y su historial de precios dependen de la decisión sobre el catálogo publicado (D-48, D-49) y del origen de precios de SICC (D-68).',
  },
  form: {
    nombre: 'Formulario de precios',
    motivo: 'El formulario sale de la exportación, que todavía no existe en la API.',
  },
  res: {
    nombre: 'Resumen desagregado',
    motivo: 'Requiere un recurso de desagregación (materiales, mano de obra, equipo y transporte) en la API.',
  },
  gantt: {
    nombre: 'Gantt',
    motivo: 'El cronograma depende de la regla de reparto en el tiempo (R-016), que aún no está decidida.',
  },
  hist: {
    nombre: 'Historial',
    motivo: 'El historial de cambios depende del registro de operaciones, que todavía no está implementado.',
  },
}

const estilos = makeStyles({
  raiz: { display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: tokens.colorNeutralBackground2 },
  titulo: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalM}`,
    backgroundColor: '#0f2240',
    color: '#ffffff',
    borderBottom: `3px solid #c8a84d`,
  },
  marca: { fontWeight: tokens.fontWeightBold, letterSpacing: '0.08em', color: '#c8a84d' },
  menu: { display: 'flex', gap: tokens.spacingHorizontalXXS, padding: tokens.spacingVerticalXXS, backgroundColor: tokens.colorNeutralBackground3, borderBottom: `1px solid ${tokens.colorNeutralStroke2}` },
  barra: { borderBottom: `1px solid ${tokens.colorNeutralStroke2}`, backgroundColor: tokens.colorNeutralBackground1 },
  pestanas: { backgroundColor: tokens.colorNeutralBackground3, overflowX: 'auto', paddingLeft: tokens.spacingHorizontalS },
  trabajo: { display: 'grid', gridTemplateColumns: '230px minmax(0, 1fr)', minHeight: 0, flex: 1 },
  arbol: {
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground2,
    overflow: 'auto',
    padding: tokens.spacingVerticalS,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  arbolBoton: { textAlign: 'left', background: 'none', border: 'none', padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalS}`, cursor: 'pointer', borderRadius: tokens.borderRadiusSmall, color: tokens.colorNeutralForeground1 },
  principal: { display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0 },
  estado: {
    display: 'flex',
    gap: tokens.spacingHorizontalL,
    alignItems: 'center',
    padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalM}`,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground3,
  },
  avisos: { margin: tokens.spacingHorizontalS },
  cargando: { padding: tokens.spacingHorizontalL },
  pie: { marginLeft: 'auto' },
  cabeceraAn: { color: tokens.colorNeutralForeground3 },
})

function App() {
  const e = estilos()
  const [lista, setLista] = useState<ResumenPresupuesto[]>([])
  const [presupuesto, setPresupuesto] = useState<Presupuesto | null>(null)
  const [cargando, setCargando] = useState(true)
  const [hoja, setHoja] = useState<Hoja>('cd')
  const [itemSel, setItemSel] = useState<string | null>(null)
  const [mostrarApu, setMostrarApu] = useState(true)
  const [aviso, setAviso] = useState<string | null>(null)
  const [aExcluir, setAExcluir] = useState<ItemResultado | null>(null)

  // Carga inicial: el primer presupuesto de la organización.
  useEffect(() => {
    let vigente = true
    api
      .listar()
      .then(async (resumen) => {
        if (!vigente) return
        setLista(resumen)
        if (resumen.length > 0) {
          const completo = await api.obtener(resumen[0].id)
          if (vigente) setPresupuesto(completo)
        }
      })
      .catch((ex: unknown) => {
        if (vigente) setAviso(ex instanceof Error ? ex.message : 'No se pudo cargar la lista de presupuestos.')
      })
      .finally(() => {
        if (vigente) setCargando(false)
      })
    return () => {
      vigente = false
    }
  }, [])

  // Cada cambio vuelve de la API ya calculado. La web reemplaza, no recalcula.
  async function aplicar(operacion: () => Promise<Presupuesto>) {
    try {
      setPresupuesto(await operacion())
      setAviso(null)
    } catch (ex) {
      setAviso(ex instanceof Error ? ex.message : 'La API no pudo guardar el cambio.')
    }
  }

  async function cambiarCantidad(item: ItemResultado, cantidad: number) {
    if (!presupuesto) return
    await aplicar(() =>
      api.actualizarItem(presupuesto.id, item.codigo, {
        cantidad,
        excluido: item.excluido,
        motivoExclusion: item.motivoExclusion,
      }),
    )
  }

  async function excluir(motivo: string) {
    if (!presupuesto || !aExcluir) return
    const item = aExcluir
    setAExcluir(null)
    await aplicar(() =>
      api.actualizarItem(presupuesto.id, item.codigo, { cantidad: item.cantidad, excluido: true, motivoExclusion: motivo }),
    )
  }

  async function incluir(item: ItemResultado) {
    if (!presupuesto) return
    await aplicar(() =>
      api.actualizarItem(presupuesto.id, item.codigo, { cantidad: item.cantidad, excluido: false, motivoExclusion: null }),
    )
  }

  /** Lanza el error hacia la hoja de cierre, que muestra el mensaje junto al formulario. */
  async function guardarCierre(cierre: ConfiguracionCierre) {
    if (!presupuesto) return
    setPresupuesto(await api.actualizarCierre(presupuesto.id, cierre))
    setAviso(null)
  }

  async function nuevoPresupuesto() {
    try {
      const creado = await api.crear('Presupuesto nuevo')
      setPresupuesto(creado)
      setItemSel(null)
      setHoja('cd')
      setLista(await api.listar())
      setAviso('Se creó un presupuesto vacío. Aún no hay una forma de agregar capítulos desde la web.')
    } catch (ex) {
      setAviso(ex instanceof Error ? ex.message : 'No se pudo crear el presupuesto.')
    }
  }

  function seleccionarCapitulo(codigo: string) {
    setHoja('cd')
    document.getElementById(`capitulo-${codigo}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }

  function itemSeleccionadoDatos(): ItemResultado | null {
    if (!presupuesto || !itemSel) return null
    return presupuesto.capitulos.flatMap((c) => c.items).find((i) => i.codigo === itemSel) ?? null
  }

  const seleccionado = itemSeleccionadoDatos()
  const excluidos = presupuesto?.capitulos.flatMap((c) => c.items).filter((i) => i.excluido).length ?? 0
  const pendiente = PENDIENTES[hoja]

  if (cargando) {
    return (
      <FluentProvider theme={webLightTheme}>
        <div className={e.cargando}>
          <Spinner label="Cargando presupuesto desde la API…" />
        </div>
      </FluentProvider>
    )
  }

  return (
    <FluentProvider theme={webLightTheme}>
      <div className={e.raiz}>
        <header className={e.titulo}>
          <span className={e.marca}>SIAP</span>
          <span>{presupuesto?.nombre ?? 'Sin presupuestos'}</span>
          <span className={e.pie}>Datos de demostración (inventados)</span>
        </header>

        <nav className={e.menu} aria-label="Menú principal">
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <Button appearance="subtle">Archivo</Button>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItem onClick={() => void nuevoPresupuesto()}>Nuevo presupuesto</MenuItem>
                {lista.map((p) => (
                  <MenuItem key={p.id} disabled={presupuesto?.id === p.id}>
                    Abrir: {p.nombre}
                  </MenuItem>
                ))}
              </MenuList>
            </MenuPopover>
          </Menu>
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <Button appearance="subtle">Editar</Button>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItem disabled={!seleccionado || seleccionado.excluido} onClick={() => seleccionado && setAExcluir(seleccionado)}>
                  Excluir ítem seleccionado
                </MenuItem>
                <MenuItem disabled={!seleccionado || !seleccionado.excluido} onClick={() => seleccionado && void incluir(seleccionado)}>
                  Incluir ítem seleccionado
                </MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <Button appearance="subtle">Hojas</Button>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                {HOJAS.map(([clave, nombre]) => (
                  <MenuItem key={clave} onClick={() => setHoja(clave)}>
                    {nombre}
                  </MenuItem>
                ))}
              </MenuList>
            </MenuPopover>
          </Menu>
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <Button appearance="subtle">Ver</Button>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItem onClick={() => setMostrarApu((v) => !v)}>
                  {mostrarApu ? 'Ocultar' : 'Mostrar'} panel APU
                </MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <Button appearance="subtle">Ayuda</Button>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItem disabled>Asistente (pendiente de decisión sobre IA)</MenuItem>
                <MenuItem
                  onClick={() =>
                    setAviso('Maqueta conectada a siap-api. Los valores los calcula el núcleo de la API; la web solo los muestra.')
                  }
                >
                  Acerca de SIAP
                </MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
        </nav>

        <div className={e.barra}>
          <Toolbar aria-label="Herramientas" size="small">
            <ToolbarButton onClick={() => void nuevoPresupuesto()}>Nuevo</ToolbarButton>
            <ToolbarDivider />
            <ToolbarButton
              disabled={!seleccionado || seleccionado.excluido}
              onClick={() => seleccionado && setAExcluir(seleccionado)}
            >
              Excluir
            </ToolbarButton>
            <ToolbarButton
              disabled={!seleccionado || !seleccionado.excluido}
              onClick={() => seleccionado && void incluir(seleccionado)}
            >
              Incluir
            </ToolbarButton>
            <ToolbarDivider />
            <ToolbarButton onClick={() => setHoja('dg')}>AIU e IVA</ToolbarButton>
            <ToolbarButton onClick={() => setHoja('tot')}>Total</ToolbarButton>
            <ToolbarButton onClick={() => setMostrarApu((v) => !v)}>APU</ToolbarButton>
          </Toolbar>
        </div>

        <div className={e.pestanas}>
          <TabList selectedValue={hoja} onTabSelect={(_, datos) => setHoja(datos.value as Hoja)} size="small">
            {HOJAS.map(([clave, nombre]) => (
              <Tab key={clave} value={clave}>
                {nombre}
              </Tab>
            ))}
          </TabList>
        </div>

        {aviso && (
          <div className={e.avisos}>
            <MessageBar intent="warning">
              <MessageBarBody>{aviso}</MessageBarBody>
            </MessageBar>
          </div>
        )}

        {!presupuesto ? (
          <div className={e.cargando}>
            <Text>No hay presupuestos todavía. Use «Nuevo» para crear uno vacío.</Text>
          </div>
        ) : (
          <div className={e.trabajo}>
            <aside className={e.arbol} aria-label="Capítulos">
              <Text weight="semibold">Presupuesto</Text>
              <Text className={e.cabeceraAn}>$ {pesos(presupuesto.total)}</Text>
              {presupuesto.capitulos.map((c) => (
                <button key={c.codigo} className={e.arbolBoton} onClick={() => seleccionarCapitulo(c.codigo)}>
                  <Text weight="semibold">
                    {c.codigo} {c.nombre}
                  </Text>
                  <br />
                  <Text size={200}>$ {pesos(c.subtotal)}</Text>
                </button>
              ))}
              <Text size={200} className={e.cabeceraAn}>
                Ciudad y fecha se toman de los datos generales.
              </Text>
            </aside>

            <main className={e.principal}>
              {hoja === 'cd' && (
                <>
                  <CostosDirectos
                    presupuesto={presupuesto}
                    itemSeleccionado={itemSel}
                    onSeleccionarItem={setItemSel}
                    onCambiarCantidad={cambiarCantidad}
                    onExcluir={setAExcluir}
                    onIncluir={incluir}
                    bloqueado={false}
                  />
                  {mostrarApu && seleccionado && (
                    <PanelApu
                      key={seleccionado.codigoAnalisis}
                      codigoAnalisis={seleccionado.codigoAnalisis}
                      codigoItem={seleccionado.codigo}
                    />
                  )}
                </>
              )}
              {hoja === 'dg' && (
                <AiuEIva
                  key={`${presupuesto.id}-${JSON.stringify(presupuesto.configuracion)}`}
                  presupuesto={presupuesto}
                  onGuardar={guardarCierre}
                  bloqueado={false}
                />
              )}
              {hoja === 'tot' && <PresupuestoTotal presupuesto={presupuesto} />}
              {pendiente && <HojaPendiente nombre={pendiente.nombre} motivo={pendiente.motivo} />}
            </main>
          </div>
        )}

        <footer className={e.estado} aria-label="Barra de estado">
          <Text>Costo directo $ {presupuesto ? pesos(presupuesto.costoDirecto) : '—'}</Text>
          <Text>Total $ {presupuesto ? pesos(presupuesto.total) : '—'}</Text>
          <Text>{excluidos} ítem{excluidos === 1 ? '' : 's'} excluido{excluidos === 1 ? '' : 's'}</Text>
          <Text className={e.pie}>En línea · cálculo en la API</Text>
        </footer>

        <DialogoExcluir
          abierto={aExcluir !== null}
          descripcion={aExcluir?.descripcion ?? ''}
          onCancelar={() => setAExcluir(null)}
          onConfirmar={excluir}
        />
      </div>
    </FluentProvider>
  )
}

export default App
