# AGENTS.md: adaptador del repositorio `siap-web`

> Archivo para agentes de IA (Claude Code, Codex, Cursor y otros). **No copia las reglas**: apunta a ellas (ADR-003). Dueño: Victor Manuel (arquitecto).

## 1. Léelo primero

Las reglas canónicas están en el repositorio de conocimiento **`in-depth-knowledge-budget`** (privado, `https://github.com/victormv08/in-depth-knowledge-budget`), en `AGENTS.md`. Clónalo como carpeta hermana de este repositorio o léelo en GitHub **antes de trabajar**. Lo que ahí manda y aquí no se repite: reglas de verdad (no inventes), postura crítica, confidencialidad y qué está autorizado.

Dónde mirar en ese repositorio:

| Necesitas | Documento |
|---|---|
| Qué se decidió y qué contradice qué | `01_fundamentos/05_elaboracion/decisiones/DECISIONES_VIGENTES.md` |
| Estado y siguiente paso | `bitacora/ESTADO_ACTUAL.md` |
| Estándares de interfaz (U1 a U8, WCAG, Nielsen) | `01_fundamentos/03_condiciones/ESTANDARES.md` |
| Herramientas y pantallas previstas | `01_fundamentos/05_elaboracion/interfaz/CATALOGO_DE_HERRAMIENTAS.md` y `MOCKUP_BAJA_FIDELIDAD.md` |
| Maqueta navegable (referencia, no código para copiar) | `experimentos/maqueta_navegable/` |
| Guía de revisión de la Vista simple y la completa | `experimentos/maqueta_navegable/GUIA_REVISION_VISTA_SIMPLE.md` |
| Modelo de datos y arquitectura | `.../arquitectura/MODELO_LOGICO_V2.md` y `ARQUITECTURA_TECNICA.md` |

## 2. Este repositorio

- **Qué es:** frontend de la v1 web de SIAP, una plataforma de presupuestos de obras civiles (Colombia). La v1 es **solo web** (D-65).
- **Stack:** React, TypeScript, Vite, Fluent UI v9 (`@fluentui/react-components`), Vitest y Testing Library, oxlint. Node 22 (`.nvmrc`), npm.
- **Autorización de construir:** ADR-014 (D-69). **Sí:** código, desarrollo y pruebas. **No sin autorización aparte:** producción, clientes reales y cobros reales.

## 3. Comandos (los mismos que corre la integración continua)

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

**No des por terminado un cambio sin haber corrido los cuatro últimos y ver sus resultados.** Instala con `npm ci`; `npm install <paquete>` solo para agregar una dependencia, y entonces sube también `package-lock.json`.

## 4. Reglas propias de este repositorio

1. **La web no calcula dinero**: no suma, multiplica ni redondea valores monetarios. Muestra lo que devuelve la API (D-27, D-51). Dar formato para mostrar sí está permitido.
2. Usa **Fluent UI v9** y los *tokens* de tema; no copies colores ni estilos de otros programas (CESOFT incluido).
3. **La interfaz no debe saturar** (D-64): todas las funciones se conservan, pero a la vista solo lo esencial. Cualquier pantalla nueva respeta los tres niveles y se revisa contra `ESTANDARES.md`.
4. **Teclado completo, tableta y accesibilidad** (D-47, U2, WCAG 2.2 AA): toda acción se alcanza con teclado y tiene nombre accesible.
5. **Nada de secretos ni datos de clientes** en el código, en pruebas ni en commits. Todo lo que empiece por `VITE_` es público. Los datos de prueba son inventados (D-16).
6. **No copies** bases de APU, precios de terceros, textos o pantallas de otros programas.
7. No adoptes una librería o tecnología nueva (rejilla, enrutador, manejo de datos, generador del cliente de la API, etc.) sin una decisión o un ADR. **El agente recomienda; el equipo decide** (ADR-007). Los ADR de código van en `docs/adr/`.
8. Los textos de pantalla van en español de Colombia. Los nombres de los conceptos del dominio siguen el glosario (`GLOSARIO.md`).
9. Los cambios se hacen en `development` o en una rama que parta de ella, nunca directamente en `main` (ver `CONTRIBUIR.md`).

## 5. Si algo no cuadra

- Si lo pedido **contradice una decisión vigente** de Victor Manuel, **no lo apliques**: dilo y propón una propuesta en espera en el repositorio de conocimiento (ADR-009).
- Se va **corrigiendo sobre la marcha** (ADR-014): toda corrección que cambie algo vigente se registra en el repositorio de conocimiento, no solo en el código.
- Lo que no sepas, dilo. Tu conocimiento general **no es evidencia**: márcalo como hipótesis.

## 6. Qué no hacer sin autorización expresa

No hagas `push` a `main`, no publiques ni despliegues, no contactes a terceros, no cambies la configuración de GitHub y no crees cuentas ni llaves.
