import { useEffect, useState } from 'react'
import type { JSX, ReactNode } from 'react'
import {
  FluentProvider,
  Menu,
  MenuDivider,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  MessageBar,
  MessageBarBody,
  Spinner,
  Text,
  webDarkTheme,
  webLightTheme,
} from '@fluentui/react-components'
import { api } from './api/cliente'
import type { ConfiguracionCierre, ItemResultado, Presupuesto, ResumenPresupuesto } from './api/cliente'
import { pesos } from './formato'
import { CostosDirectos } from './vistas/CostosDirectos'
import { AiuEIva, PresupuestoTotal } from './vistas/Cierre'
import { PanelApu } from './vistas/PanelApu'
import { HojaApu } from './vistas/HojaApu'
import { DialogoExcluir } from './vistas/DialogoExcluir'
import { MedidorCantidades } from './vistas/MedidorCantidades'
import { ProveedorSesion } from './auth/ProveedorSesion'
import { GuardianSesion } from './auth/GuardianSesion'
import { useSesion } from './auth/contextoSesion'
import { DialogoAbrir } from './vistas/DialogoAbrir'
import { DialogoNuevo } from './vistas/DialogoNuevo'
import { DialogoCapitulo } from './vistas/DialogoCapitulo'
import { DialogoItem } from './vistas/DialogoItem'
import { Cantidades } from './vistas/Cantidades'
import { FormularioPreciosVista, HistorialVista, ResumenDesagregadoVista } from './vistas/Reportes'
import { HojaPendiente } from './vistas/HojaPendiente'
import './estilos.css'

type Hoja = 'cd' | 'cant' | 'apu' | 'ins' | 'dg' | 'tot' | 'form' | 'res' | 'gantt' | 'hist'

/** Mismo orden de hojas que la maqueta de referencia. */
const HOJAS: [Hoja, string, JSX.Element][] = [
  ['cd', 'Costos directos', <Icono key="cd" trazo={<><path d="M4 6h10M4 12h10M4 18h10M18 9v8M14 13h8" /></>} />],
  ['cant', 'Cantidades', <Icono key="cant" trazo={<><rect x="2.5" y="8" width="19" height="8" rx="1" /><path d="M6.5 8v3.5M10.5 8v4.5M14.5 8v3.5M18.5 8v4.5" /></>} />],
  ['apu', 'APU (análisis de precios)', <Icono key="apu" trazo={<><rect x="5" y="3" width="14" height="18" rx="1" /><path d="M8 7h8M8 11h2M12 11h2M8 15h2M12 15h4" /></>} />],
  ['ins', 'Lista de insumos', <Icono key="ins" trazo={<><path d="M12 3 4 7v10l8 4 8-4V7z" /><path d="m4 7 8 4 8-4M12 11v10" /></>} />],
  ['dg', 'Datos generales, AIU e IVA', <Icono key="dg" trazo={<><path d="M19 5 5 19" /><circle cx="7" cy="7" r="2.5" /><circle cx="17" cy="17" r="2.5" /></>} />],
  ['tot', 'Presupuesto total con AIU', <Icono key="tot" trazo={<path d="M4 20h16M7 16v-5M12 16V6M17 16v-8" />} />],
  ['form', 'Formulario de precios', <Icono key="form" trazo={<><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M4 8h16M4 13h16M10 8v13" /></>} />],
  ['res', 'Resumen desagregado', <Icono key="res" trazo={<path d="M4 20h16M7 16v-5M12 16V6M17 16v-8" />} />],
  ['gantt', 'Diagrama de Gantt', <Icono key="gantt" trazo={<path d="M4 4v16h16M7 8h6M10 12h7M8 16h5" />} />],
  ['hist', 'Historial de cambios', <Icono key="hist" trazo={<><path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5" /><path d="M4 4v4.5h4.5M12 8v4l3 2" /></>} />],
]

/** Por qué cada hoja aún no tiene datos de la API. Sin cifras inventadas. */
const PENDIENTES: Partial<Record<Hoja, { nombre: string; motivo: string }>> = {
  ins: {
    nombre: 'Insumos',
    motivo:
      'El catálogo de insumos y su historial de precios dependen de la decisión sobre el catálogo publicado (D-48, D-49) y del origen de precios de SICC (D-68).',
  },
  gantt: {
    nombre: 'Gantt',
    motivo: 'El cronograma depende de la regla de reparto en el tiempo (R-016), que aún no está decidida.',
  },
}

const PENDIENTE_API = 'Pendiente: todavía no está conectado a la API'

/** Íconos de trazos simples, del mismo estilo que la maqueta. */
function Icono({ trazo }: { trazo: ReactNode }) {
  return (
    <svg className="icono" viewBox="0 0 24 24" aria-hidden="true">
      {trazo}
    </svg>
  )
}

const I = {
  inicio: <Icono trazo={<path d="M3 11 12 3l9 8M5 10v10h5v-6h4v6h5V10" />} />,
  nuevo: <Icono trazo={<><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" /><path d="M14 3v5h5M12 11v6M9 14h6" /></>} />,
  abrir: <Icono trazo={<path d="M3 7a1 1 0 0 1 1-1h5l2 2h8a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />} />,
  guardar: <Icono trazo={<><path d="M5 4h11l3 3v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" /><path d="M8 4v5h7V4M8 20v-6h8v6" /></>} />,
  deshacer: <Icono trazo={<path d="M9 7 4 12l5 5M4 12h10a6 6 0 0 1 0 6" />} />,
  rehacer: <Icono trazo={<path d="m15 7 5 5-5 5M20 12H10a6 6 0 0 0 0 6" />} />,
  item: <Icono trazo={<><rect x="3" y="5" width="18" height="5" rx="1" /><path d="M3 15h9M17 14v6M14 17h6" /></>} />,
  capitulo: <Icono trazo={<><path d="M4 5h11M4 9h7M7 13h8M7 17h5" /><path d="M18 12v8M14 16h8" /></>} />,
  eliminar: <Icono trazo={<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />} />,
  excluir: <Icono trazo={<><circle cx="12" cy="12" r="8" /><path d="m6.5 17.5 11-11" /></>} />,
  incluir: <Icono trazo={<path d="m5 12 4 4 10-10" />} />,
  cantidades: <Icono trazo={<><rect x="2.5" y="8" width="19" height="8" rx="1" /><path d="M6.5 8v3.5M10.5 8v4.5M14.5 8v3.5M18.5 8v4.5" /></>} />,
  apu: <Icono trazo={<><rect x="5" y="3" width="14" height="18" rx="1" /><path d="M8 7h8M8 11h2M12 11h2M8 15h2M12 15h4" /></>} />,
  cap: <Icono trazo={<><path d="M4 5h11M4 9h7M7 13h8M7 17h5" /><path d="M18 12v8M14 16h8" /></>} />,
  ia: <Icono trazo={<><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /><path d="M18 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" /></>} />,
  ayuda: <Icono trazo={<><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5v.01" /></>} />,
  base: <Icono trazo={<><circle cx="10.5" cy="10.5" r="6" /><path d="m15 15 5 5" /></>} />,
  insumos: <Icono trazo={<><path d="M12 3 4 7v10l8 4 8-4V7z" /><path d="m4 7 8 4 8-4M12 11v10" /></>} />,
  precios: <Icono trazo={<><path d="M3 12V4h8l10 10-8 8z" /><circle cx="7.5" cy="8.5" r="1.3" /></>} />,
  aiu: <Icono trazo={<><path d="M19 5 5 19" /><circle cx="7" cy="7" r="2.5" /><circle cx="17" cy="17" r="2.5" /></>} />,
  formulario: <Icono trazo={<><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M4 8h16M4 13h16M10 8v13" /></>} />,
  resumen: <Icono trazo={<path d="M4 20h16M7 16v-5M12 16V6M17 16v-8" />} />,
  gantt: <Icono trazo={<path d="M4 4v16h16M7 8h6M10 12h7M8 16h5" />} />,
  excel: <Icono trazo={<><rect x="3" y="4" width="13" height="16" rx="1" /><path d="m7 9 5 6M12 9l-5 6M16 12h5M18 9l3 3-3 3" /></>} />,
}

interface Accion {
  etiqueta: string
  icono: ReactNode
  tecla?: string
  onClick?: () => void
  deshabilitado?: boolean
  motivo?: string
  /** Nombre accesible si difiere del texto visible (debe contenerlo). */
  nombreAccesible?: string
  /** Es la hoja actual: se marca con aria-current y apariencia activa. */
  activa?: boolean
}

function AplicacionPresupuestos() {
  const { datos: sesion, salir } = useSesion()
  const [, setLista] = useState<ResumenPresupuesto[]>([])
  const [presupuesto, setPresupuesto] = useState<Presupuesto | null>(null)
  const [cargando, setCargando] = useState(true)
  const [hoja, setHoja] = useState<Hoja>('cd')
  const [itemSel, setItemSel] = useState<string | null>(null)
  const [medidorAbierto, setMedidorAbierto] = useState(false)
  const [abrirAbierto, setAbrirAbierto] = useState(false)
  const [nuevoAbierto, setNuevoAbierto] = useState(false)
  // Actividades cuya cantidad sale de una memoria guardada en esta sesión (la API puede informarlo con tieneMemoria).
  const [conMemoria, setConMemoria] = useState<ReadonlySet<string>>(new Set())
  const [capituloAbierto, setCapituloAbierto] = useState(false)
  const [itemAbierto, setItemAbierto] = useState(false)
  const [mostrarApu, setMostrarApu] = useState(true)
  const [aviso, setAviso] = useState<string | null>(null)
  const [aExcluir, setAExcluir] = useState<ItemResultado | null>(null)
  const [panelCapitulos, setPanelCapitulos] = useState(true)
  const [barraVisible, setBarraVisible] = useState(true)
  const [tema, setTema] = useState<'oscuro' | 'claro'>('claro')

  // El tema vive en el atributo data-theme de la página; los estilos de estilos.css lo leen.
  useEffect(() => {
    document.documentElement.dataset.theme = tema === 'claro' ? 'light' : 'dark'
  }, [tema])

  // El título de la pestaña lleva el nombre del presupuesto abierto.
  const nombreAbierto = presupuesto?.nombre
  useEffect(() => {
    document.title = nombreAbierto ? `SIAP · ${nombreAbierto}` : 'SIAP'
    return () => {
      document.title = 'SIAP'
    }
  }, [nombreAbierto])

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

  /** Pone un presupuesto como el abierto: limpia la selección, vuelve a Costos directos y olvida las memorias de la sesión. */
  function mostrarPresupuesto(abierto: Presupuesto) {
    setPresupuesto(abierto)
    setItemSel(null)
    setHoja('cd')
    setConMemoria(new Set())
  }

  /** Abre otro presupuesto de la lista. Si falla, el error llega al diálogo, que sigue abierto. */
  async function abrirPresupuesto(id: string) {
    const abierto = await api.obtener(id)
    mostrarPresupuesto(abierto)
    setAbrirAbierto(false)
    setAviso(`Se abrió «${abierto.nombre}».`)
  }

  /** Crea un presupuesto con el nombre dado y lo deja abierto. Si falla, el error llega al diálogo. */
  async function crearPresupuesto(nombre: string) {
    const creado = await api.crear(nombre)
    mostrarPresupuesto(creado)
    setNuevoAbierto(false)
    setLista(await api.listar())
    setAviso(`Se creó «${creado.nombre}». Use «Abrir» para volver a otro presupuesto.`)
  }

  /** Abre el medidor de cantidades de una actividad: la indicada, o la seleccionada (F6). */
  function abrirMedidor(codigo?: string) {
    const destino = codigo ?? itemSel
    if (!presupuesto || !destino) {
      setAviso('Selecciona una actividad para medir sus cantidades.')
      return
    }
    setItemSel(destino)
    setMedidorAbierto(true)
  }

  // F6 abre el medidor de la actividad seleccionada, como el atajo de la barra.
  useEffect(() => {
    function alPresionar(evento: KeyboardEvent) {
      if (evento.key !== 'F6') return
      evento.preventDefault()
      if (!presupuesto || !itemSel) {
        setAviso('Selecciona una actividad para medir sus cantidades.')
        return
      }
      setMedidorAbierto(true)
    }
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [itemSel, presupuesto])

  /** Vuelve a Costos directos. La selección de capítulo y actividad no se toca, así que se conserva. */
  function irAInicio() {
    setHoja('cd')
  }

  // Escape vuelve a Costos directos desde otra hoja. Se escucha en la fase de captura: así ve el DOM
  // ANTES de que Fluent cierre un diálogo con esa misma tecla, y no navega en la misma pulsación.
  useEffect(() => {
    if (hoja === 'cd') return
    function alPresionar(evento: KeyboardEvent) {
      if (evento.key !== 'Escape' || evento.ctrlKey || evento.metaKey || evento.altKey) return
      if (document.querySelector('[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]')) return
      const objetivo = evento.target
      if (
        objetivo instanceof HTMLElement &&
        (objetivo.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(objetivo.tagName))
      ) {
        return // un campo en edición conserva su Escape
      }
      evento.preventDefault()
      setHoja('cd')
    }
    window.addEventListener('keydown', alPresionar, true)
    return () => window.removeEventListener('keydown', alPresionar, true)
  }, [hoja])

  // Al volver a Costos directos, la actividad seleccionada vuelve a quedar a la vista.
  useEffect(() => {
    if (hoja !== 'cd') return
    document.querySelector('.siap-rejilla tr.seleccionada')?.scrollIntoView?.({ block: 'nearest' })
  }, [hoja])

  function seleccionarCapitulo(codigo: string) {
    setHoja('cd')
    document.getElementById(`capitulo-${codigo}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }

  const seleccionado: ItemResultado | null =
    presupuesto && itemSel ? presupuesto.capitulos.flatMap((c) => c.items).find((i) => i.codigo === itemSel) ?? null : null
  const capituloActivo =
    presupuesto && seleccionado
      ? presupuesto.capitulos.find((c) => c.items.some((i) => i.codigo === seleccionado.codigo))?.codigo ?? null
      : null
  const excluidos = presupuesto?.capitulos.flatMap((c) => c.items).filter((i) => i.excluido).length ?? 0
  const pendiente = PENDIENTES[hoja]
  const mostrarArbol = hoja === 'cd' && panelCapitulos

  const acciones: (Accion | 'sep')[] = [
    {
      etiqueta: 'Costos directos',
      nombreAccesible: 'Costos directos (inicio)',
      icono: I.inicio,
      activa: hoja === 'cd',
      onClick: irAInicio,
    },
    'sep',
    { etiqueta: 'Nuevo', icono: I.nuevo, onClick: () => setNuevoAbierto(true) },
    { etiqueta: 'Abrir', icono: I.abrir, onClick: () => setAbrirAbierto(true) },
    { etiqueta: 'Guardar', icono: I.guardar, deshabilitado: true, motivo: 'Cada cambio se guarda en la API al confirmarlo' },
    'sep',
    { etiqueta: 'Deshacer', icono: I.deshacer, tecla: 'Ctrl+Z', deshabilitado: true, motivo: PENDIENTE_API },
    { etiqueta: 'Rehacer', icono: I.rehacer, tecla: 'Ctrl+Y', deshabilitado: true, motivo: PENDIENTE_API },
    'sep',
    { etiqueta: 'Ítem', icono: I.item, onClick: () => setItemAbierto(true) },
    { etiqueta: 'Capítulo', icono: I.capitulo, onClick: () => setCapituloAbierto(true) },
    { etiqueta: 'Eliminar', icono: I.eliminar, deshabilitado: true, motivo: PENDIENTE_API },
    {
      etiqueta: seleccionado?.excluido ? 'Incluir' : 'Excluir',
      icono: seleccionado?.excluido ? I.incluir : I.excluir,
      deshabilitado: !seleccionado,
      motivo: 'Selecciona un ítem',
      onClick: () => {
        if (!seleccionado) return
        if (seleccionado.excluido) void incluir(seleccionado)
        else setAExcluir(seleccionado)
      },
    },
    'sep',
    { etiqueta: 'Cantidades', icono: I.cantidades, tecla: 'F6', onClick: () => abrirMedidor() },
    { etiqueta: 'APU', icono: I.apu, tecla: 'F3', onClick: () => setMostrarApu((v) => !v) },
    { etiqueta: 'Ítem base', icono: I.base, tecla: 'F4', deshabilitado: true, motivo: PENDIENTE_API },
    { etiqueta: 'Insumos', icono: I.insumos, deshabilitado: true, motivo: PENDIENTE_API },
    { etiqueta: 'Precios', icono: I.precios, tecla: 'F7', deshabilitado: true, motivo: PENDIENTE_API },
    'sep',
    { etiqueta: 'AIU e IVA', icono: I.aiu, onClick: () => setHoja('dg') },
    { etiqueta: 'Formulario', icono: I.formulario, onClick: () => setHoja('form') },
    { etiqueta: 'Resumen', icono: I.resumen, onClick: () => setHoja('res') },
    { etiqueta: 'Gantt', icono: I.gantt, deshabilitado: true, motivo: PENDIENTE_API },
    { etiqueta: 'Excel', icono: I.excel, deshabilitado: true, motivo: PENDIENTE_API },
  ]

  if (cargando) {
    return (
      <FluentProvider theme={webLightTheme}>
        <div style={{ padding: 16 }}>
          <Spinner label="Cargando presupuesto desde la API…" />
        </div>
      </FluentProvider>
    )
  }

  return (
    <FluentProvider theme={tema === 'oscuro' ? webDarkTheme : webLightTheme} style={{ height: '100%' }}>
      <div className="siap-app">
        <header className="siap-titulo">
          <button type="button" className="siap-marca" aria-label="Ir al inicio (SIAP)" title="Ir a Costos directos" onClick={irAInicio}>
            SIAP
          </button>
          <span className="siap-nombre-programa">Sistema Integral de Análisis de Precios</span>
          <span className="derecha">
            <b>{sesion?.empresa.nombre}</b>
            <span className="siap-usuario">{sesion?.usuario.nombre}</span>
            <button type="button" className="siap-salir" onClick={() => void salir()}>
              Salir
            </button>
          </span>
        </header>

        <nav className="siap-menu" aria-label="Menú principal">
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <button type="button">Archivo</button>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItem icon={I.nuevo} onClick={() => setNuevoAbierto(true)}>
                  Nuevo presupuesto...
                </MenuItem>
                <MenuItem icon={I.abrir} onClick={() => setAbrirAbierto(true)}>
                  Abrir presupuesto...
                </MenuItem>
                <MenuItem
                  icon={I.guardar}
                  secondaryContent="Ctrl+G"
                  onClick={() => setAviso('Cada cambio ya se guarda en la API al confirmarlo.')}
                >
                  Guardar
                </MenuItem>
                <MenuDivider />
                <MenuItem icon={I.excel} disabled title={PENDIENTE_API}>
                  Importar desde Excel...
                </MenuItem>
                <MenuItem icon={I.excel} disabled title={PENDIENTE_API}>
                  Exportar a Excel
                </MenuItem>
                <MenuItem icon={I.formulario} disabled title={PENDIENTE_API}>
                  Exportar a PDF
                </MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <button type="button">Editar</button>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItem icon={I.deshacer} secondaryContent="Ctrl+Z" disabled title={PENDIENTE_API}>
                  Deshacer
                </MenuItem>
                <MenuItem icon={I.rehacer} secondaryContent="Ctrl+Y" disabled title={PENDIENTE_API}>
                  Rehacer
                </MenuItem>
                <MenuDivider />
                <MenuItem icon={I.item} secondaryContent="Ctrl+Enter" disabled title={PENDIENTE_API}>
                  Insertar ítem
                </MenuItem>
                <MenuItem icon={I.capitulo} disabled title={PENDIENTE_API}>
                  Insertar capítulo
                </MenuItem>
                <MenuItem icon={I.eliminar} secondaryContent="Supr" disabled title={PENDIENTE_API}>
                  Eliminar fila
                </MenuItem>
                <MenuDivider />
                <MenuItem
                  icon={seleccionado?.excluido ? I.incluir : I.excluir}
                  secondaryContent="Ctrl+E"
                  disabled={!seleccionado}
                  title={seleccionado ? undefined : 'Selecciona un ítem'}
                  onClick={() => {
                    if (!seleccionado) return
                    if (seleccionado.excluido) void incluir(seleccionado)
                    else setAExcluir(seleccionado)
                  }}
                >
                  Excluir / incluir ítem
                </MenuItem>
                <MenuItem icon={I.item} secondaryContent="Ctrl+D" disabled title={PENDIENTE_API}>
                  Llenar hacia abajo
                </MenuItem>
                <MenuItem icon={I.excel} secondaryContent="Ctrl+V" disabled title={PENDIENTE_API}>
                  Pegar filas desde Excel
                </MenuItem>
                <MenuDivider />
                <MenuItem icon={I.base} secondaryContent="Ctrl+B" disabled title={PENDIENTE_API}>
                  Buscar...
                </MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <button type="button">Hojas</button>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                {HOJAS.map(([clave, nombre, icono]) => (
                  <MenuItem key={clave} icon={icono} onClick={() => setHoja(clave)}>
                    {nombre}
                  </MenuItem>
                ))}
              </MenuList>
            </MenuPopover>
          </Menu>
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <button type="button">Presupuesto</button>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItem icon={I.cantidades} secondaryContent="F6" onClick={() => abrirMedidor()}>
                  Generador de cantidades
                </MenuItem>
                <MenuDivider />
                <MenuItem icon={I.item} disabled title={PENDIENTE_API}>
                  Repetir capítulo (× veces)...
                </MenuItem>
                <MenuItem icon={I.aiu} disabled title={PENDIENTE_API}>
                  Capítulo con / sin AIU
                </MenuItem>
                <MenuDivider />
                <MenuItem icon={I.ayuda} disabled title={PENDIENTE_API}>
                  Revisar avisos
                </MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <button type="button">APU</button>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItem
                  icon={I.apu}
                  secondaryContent="F3"
                  disabled={!seleccionado}
                  title={seleccionado ? undefined : 'Selecciona un ítem'}
                  onClick={() => {
                    setMostrarApu(true)
                  }}
                >
                  Editar APU del ítem
                </MenuItem>
                <MenuItem icon={I.base} secondaryContent="F4" disabled title={PENDIENTE_API}>
                  Buscar ítem base...
                </MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <button type="button">Insumos</button>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItem icon={I.precios} secondaryContent="F7" disabled title={PENDIENTE_API}>
                  Cambiar precios desde lista...
                </MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <button type="button">Herramientas</button>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItem icon={I.ia} secondaryContent="Ctrl+J" disabled title="Pendiente: decisión sobre IA (D-51 a D-54)">
                  Asistente
                </MenuItem>
                <MenuDivider />
                <MenuItem icon={I.ayuda} disabled title="Pendiente: roles y permisos (Q-H10 a Q-H13)">
                  Personas y licencias...
                </MenuItem>
                <MenuDivider />
                <MenuItem icon={I.ayuda} disabled title="Pendiente: licencia sin conexión (D-59, D-60)">
                  Simular pérdida de conexión
                </MenuItem>
                <MenuItem icon={I.ayuda} disabled title="Pendiente: licencia sin conexión (D-59, D-60)">
                  Simular: un día más sin conexión
                </MenuItem>
                <MenuItem icon={I.ayuda} disabled title="Pendiente: licencia sin conexión (D-59, D-60)">
                  Simular: licencia vencida (bloqueo)
                </MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <button type="button">Ver</button>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItem icon={I.cap} onClick={() => setPanelCapitulos((v) => !v)}>
                  Panel de capítulos
                </MenuItem>
                <MenuItem icon={barraVisible ? I.incluir : undefined} onClick={() => setBarraVisible((v) => !v)}>
                  Barra de herramientas
                </MenuItem>
                <MenuDivider />
                <MenuItem icon={I.ayuda} onClick={() => setTema((t) => (t === 'oscuro' ? 'claro' : 'oscuro'))}>
                  Tema claro / oscuro
                </MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <button type="button">Ayuda</button>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItem
                  icon={I.ayuda}
                  secondaryContent="F1"
                  onClick={() =>
                    setAviso(
                      'Atajos: Ctrl+G guardar · Ctrl+Z deshacer · Ctrl+Y rehacer · Ctrl+Enter insertar ítem · Supr eliminar fila · Ctrl+E excluir o incluir · Ctrl+D llenar hacia abajo · Ctrl+V pegar desde Excel · Ctrl+B buscar · F3 APU · F4 ítem base · F6 cantidades · F7 precios. Muchos aún no están conectados a la API.',
                    )
                  }
                >
                  Atajos de teclado
                </MenuItem>
                <MenuItem
                  icon={I.ayuda}
                  onClick={() =>
                    setAviso('En la maqueta no se envía nada. El programa real abriría un mensaje de soporte con el presupuesto, la versión y la licencia adjuntos.')
                  }
                >
                  Contactar a soporte
                </MenuItem>
                <MenuItem icon={I.ayuda} onClick={() => setAviso('Maqueta conectada a siap-api. La API calcula; la web solo muestra.')}>
                  Acerca de SIAP
                </MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
        </nav>

        <div className="siap-herramientas" role="toolbar" aria-label="Herramientas" style={{ display: barraVisible ? undefined : 'none' }}>
          {acciones.map((a, indice) =>
            a === 'sep' ? (
              <span key={`sep-${indice}`} className="separador" />
            ) : (
              <button
                key={a.etiqueta}
                type="button"
                aria-label={a.nombreAccesible ?? a.etiqueta}
                aria-current={a.activa ? 'page' : undefined}
                className={a.activa ? 'activa' : undefined}
                title={a.deshabilitado ? `${a.etiqueta}: ${a.motivo ?? PENDIENTE_API}` : (a.nombreAccesible ?? a.etiqueta)}
                disabled={a.deshabilitado}
                onClick={a.onClick}
              >
                {a.icono}
                <span>{a.etiqueta}</span>
                {a.tecla && <span className="tecla">{a.tecla}</span>}
              </button>
            ),
          )}
        </div>

        {hoja !== 'cd' ? (
          <nav className="siap-franja" aria-label="Ubicación en el presupuesto">
            <span className="siap-franja-titulo">{HOJAS.find(([clave]) => clave === hoja)?.[1]}</span>
            <button type="button" className="siap-volver" onClick={irAInicio}>
              <span aria-hidden="true">←</span> Volver a Costos directos
            </button>
          </nav>
        ) : (
          <span />
        )}

        {aviso ? (
          <div className="siap-aviso">
            <MessageBar intent="warning">
              <MessageBarBody>{aviso}</MessageBarBody>
            </MessageBar>
          </div>
        ) : (
          <span />
        )}

        {!presupuesto ? (
          <div style={{ padding: 16 }}>
            <Text>No hay presupuestos todavía. Use «Nuevo» para crear uno vacío.</Text>
          </div>
        ) : (
          <div className={mostrarArbol ? 'siap-trabajo' : 'siap-trabajo sin-arbol'}>
            {mostrarArbol && (
              <aside className="siap-arbol" aria-label="Capítulos">
                <div className="siap-ph">Capítulos</div>
                <ul>
                  <li>
                    <button type="button" className="raiz">
                      <span className="nombre-presupuesto" title={presupuesto.nombre}>
                        <span aria-hidden="true">▣ </span>
                        <span>{presupuesto.nombre}</span>
                      </span>
                      <span className="sub">$ {pesos(presupuesto.total)}</span>
                    </button>
                  </li>
                  {presupuesto.capitulos.map((c, indice) => (
                    <li key={c.codigo}>
                      <button
                        type="button"
                        className={capituloActivo === c.codigo ? 'activo' : undefined}
                        onClick={() => seleccionarCapitulo(c.codigo)}
                      >
                        {indice + 1} {c.nombre}
                        <span className="sub">$ {pesos(c.subtotal)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="meta">Datos de demostración inventados.</div>
              </aside>
            )}

            <main className="siap-principal">
              {hoja === 'cd' && (
                <>
                  <div className="siap-rejilla">
                    <CostosDirectos
                      presupuesto={presupuesto}
                      itemSeleccionado={itemSel}
                      onAbrirMedidor={(codigo) => abrirMedidor(codigo)}
                      conMemoria={conMemoria}
                      onSeleccionarItem={setItemSel}
                      onCambiarCantidad={cambiarCantidad}
                      bloqueado={false}
                    />
                  </div>
                  {mostrarApu && seleccionado && (
                    <PanelApu
                      key={`${seleccionado.codigoAnalisis}-${presupuesto?.id}-${presupuesto?.total}`}
                      presupuestoId={presupuesto?.id ?? ''}
                      codigoAnalisis={seleccionado.codigoAnalisis}
                      codigoItem={seleccionado.codigo}
                      onGuardado={(actualizado) => {
                        setPresupuesto(actualizado)
                        setAviso(null)
                      }}
                    />
                  )}
                </>
              )}
              {hoja === 'cant' && presupuesto && (
                <Cantidades presupuesto={presupuesto} onAbrirMedidor={(codigo) => abrirMedidor(codigo)} conMemoria={conMemoria} />
              )}
              {hoja === 'res' && presupuesto && <ResumenDesagregadoVista key={`res-${presupuesto.id}-${presupuesto.total}`} presupuestoId={presupuesto.id} />}
              {hoja === 'form' && presupuesto && <FormularioPreciosVista key={`form-${presupuesto.id}-${presupuesto.total}`} presupuestoId={presupuesto.id} />}
              {hoja === 'hist' && presupuesto && <HistorialVista key={`hist-${presupuesto.id}-${presupuesto.total}`} presupuestoId={presupuesto.id} />}
              {hoja === 'dg' && (
                <AiuEIva
                  key={`${presupuesto.id}-${JSON.stringify(presupuesto.configuracion)}`}
                  presupuesto={presupuesto}
                  onGuardar={guardarCierre}
                  bloqueado={false}
                />
              )}
              {hoja === 'apu' && presupuesto && (
                <HojaApu
                  presupuesto={presupuesto}
                  itemSeleccionado={seleccionado?.codigo ?? null}
                  onElegirItem={setItemSel}
                  onGuardado={(actualizado) => {
                    setPresupuesto(actualizado)
                    setAviso(null)
                  }}
                />
              )}
              {hoja === 'tot' && <PresupuestoTotal presupuesto={presupuesto} />}
              {pendiente && <HojaPendiente nombre={pendiente.nombre} motivo={pendiente.motivo} />}
            </main>
          </div>
        )}

        <footer className="siap-estado" aria-label="Barra de estado">
          <span>
            <span className="siap-punto" />
            {presupuesto ? 'Listo' : 'Sin presupuesto'}
          </span>
          <span>Costo directo&nbsp;<b>$ {presupuesto ? pesos(presupuesto.costoDirecto) : '—'}</b></span>
          <span>Total&nbsp;<b>$ {presupuesto ? pesos(presupuesto.total) : '—'}</b></span>
          <span>{excluidos} ítem{excluidos === 1 ? '' : 's'} excluido{excluidos === 1 ? '' : 's'}</span>
          <span className="creciente" />
          <span>En línea · cálculo en la API</span>
        </footer>

        {medidorAbierto && presupuesto && seleccionado && (
          <MedidorCantidades
            presupuestoId={presupuesto.id}
            codigoItem={seleccionado.codigo}
            descripcion={seleccionado.descripcion}
            unidad={seleccionado.unidad}
            onCerrar={() => setMedidorAbierto(false)}
            onGuardado={(actualizado, tieneFilas) => {
              setPresupuesto(actualizado)
              setAviso(null)
              setConMemoria((previas) => {
                const nuevas = new Set(previas)
                if (tieneFilas) nuevas.add(seleccionado.codigo)
                else nuevas.delete(seleccionado.codigo)
                return nuevas
              })
            }}
          />
        )}
        {abrirAbierto && (
          <DialogoAbrir actualId={presupuesto?.id ?? null} onElegir={abrirPresupuesto} onCerrar={() => setAbrirAbierto(false)} />
        )}
        {nuevoAbierto && <DialogoNuevo onCrear={crearPresupuesto} onCerrar={() => setNuevoAbierto(false)} />}
        {presupuesto && (
          <DialogoCapitulo
            abierto={capituloAbierto}
            onCancelar={() => setCapituloAbierto(false)}
            onConfirmar={async (nombre) => {
              setCapituloAbierto(false)
              await aplicar(() => api.agregarCapitulo(presupuesto.id, nombre))
            }}
          />
        )}
        {itemAbierto && presupuesto && (
          <DialogoItem
            presupuesto={presupuesto}
            capituloInicial={capituloActivo}
            onCerrar={() => setItemAbierto(false)}
            onCreado={(actualizado) => {
              setPresupuesto(actualizado)
              setAviso(null)
            }}
          />
        )}
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

/** Raíz: sin sesión muestra la pantalla de entrada; con sesión, la aplicación de presupuestos. */
function App() {
  return (
    <ProveedorSesion>
      <GuardianSesion>
        <AplicacionPresupuestos />
      </GuardianSesion>
    </ProveedorSesion>
  )
}

export default App
