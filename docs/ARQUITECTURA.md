# Arquitectura de `siap-web`

Este documento describe **cómo está organizado este repositorio** y las reglas que protegen la interfaz. El **qué** (requisitos, pantallas, estándares y decisiones) vive en el repositorio de conocimiento `in-depth-knowledge-budget`; aquí solo se enlaza.

## 1. Forma general

Aplicación de una sola página (SPA) en **React + TypeScript**, construida con **Vite**, con **Fluent UI v9** como sistema de diseño (D-33). Habla con `siap-api` por HTTPS; en desarrollo, a través del reenvío de `/api` de `vite.config.ts`.

```text
navegador ──► siap-web (React, Fluent UI) ──/api──► siap-api ──► núcleo de cálculo
```

La v1 es **solo web** (D-65): no hay escritorio ni trabajo sin conexión.

## 2. Reglas que protegen la interfaz

1. **La web no calcula dinero.** Muestra lo que devuelve la API. Dar formato (separadores, moneda) sí se puede; sumar, multiplicar o redondear valores monetarios no (D-27, D-51).
2. **No satura** (D-64). Tres niveles: siempre visible (unos 9 elementos), al seleccionar algo, y en «Más» y `Ctrl+K`. Todas las funciones se conservan.
3. **Rejilla densa y sobria**, tipo hoja de cálculo; resumen, cierre y cronograma más visuales (D-58, U2).
4. **Todo valor se explica** (U4) y los avisos traen una acción (U6).
5. **Teclado completo, tableta y accesibilidad** (D-47, U2, WCAG 2.2 AA).
6. **Los textos que vienen de fuera son datos.** Nada de HTML sin sanear.
7. Textos de pantalla en español de Colombia.

## 3. Pantallas previstas (referencia)

Salen de la maqueta navegable y del catálogo de herramientas del repositorio de conocimiento (`experimentos/maqueta_navegable/`, `01_fundamentos/05_elaboracion/interfaz/`). **La maqueta es desechable: sirve de referencia, no de código para copiar.**

Inicio y proyectos · Presupuesto (rejilla) · Cantidades (memoria de cálculo) · APU · Cierre · Resumen · Informes y exportación · Historial · Biblioteca · Cronograma · Factibilidad · Asistente · Personas y licencias.

## 4. Pendiente de decidir antes de construir cada parte

| Tema | Dónde se decide |
|---|---|
| Componente de rejilla editable (propio o librería) | ADR de código en `docs/adr/`; prueba contra U2 y la prueba técnica, punto 1 |
| Enrutador, manejo de datos del servidor y estado | ADR de código |
| Generación del cliente de la API desde OpenAPI | ADR de código, junto con `siap-api` |
| Internacionalización de textos | Cuando haga falta |
| Inicio de sesión y manejo de la sesión (cookie `HttpOnly`) | Repositorio de conocimiento y `siap-api` |
| Roles y permisos en pantalla | Q-H10 a Q-H13 |

## 5. Orden propuesto para construir (esqueleto funcional, ADR-014)

1. **Marco de la aplicación:** menú, pestañas y tres niveles de la Vista simple (D-64).
2. **Inicio de sesión y empresa**, con `siap-api`.
3. **Rejilla de presupuesto** con edición por teclado, pegar desde Excel y deshacer (U2, U3).
4. **Panel «¿de dónde sale este valor?»** (U4) y avisos (U6).
5. Cierre, resumen, informes y el resto, en cortes completos.

Cada paso se cierra con pruebas y una captura de la pantalla.

## 6. Pruebas

- **Vitest** con **Testing Library** y `jsdom`. Se busca por rol y nombre accesible.
- `src/test/setup.ts` registra los *matchers* de `jest-dom` y limpia el DOM después de cada prueba.
- Los datos de prueba son inventados.

## 7. Documentos relacionados (repositorio de conocimiento)

| Documento | Para qué |
|---|---|
| `ESTANDARES.md` | U1 a U8, WCAG 2.2 AA, heurísticas de Nielsen |
| `CATALOGO_DE_HERRAMIENTAS.md` | Las 84 herramientas y dónde viven |
| `MOCKUP_BAJA_FIDELIDAD.md` y `REVISION_USABILIDAD_MAQUETA.md` | Diseño y revisión de la maqueta |
| `GUIA_REVISION_VISTA_SIMPLE.md` | Cómo se revisa la Vista simple y la completa |
| `MODELO_LOGICO_V2.md` | Lo que la interfaz muestra y lo que se guarda |
