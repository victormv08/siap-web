# siap-web

Web front end for SIAP: a spreadsheet-style budget editor with unit price analysis, bill of quantities and project schedules for civil works. React, TypeScript, Fluent UI.

> Repositorio **privado**. Es el código del frontend de la v1 web de SIAP (ADR-014). El conocimiento, las decisiones y los requisitos viven en el repositorio de conocimiento `in-depth-knowledge-budget` (privado): ahí está la fuente de verdad de **qué** se construye. Aquí se decide y se registra **cómo** se construye.

## Estado

Esqueleto inicial (2026-11-20): aplicación React con Fluent UI, pruebas, comprobaciones de calidad e integración continua. **Todavía no hay pantallas de producto.**

Lo que sigue (el detalle está en `docs/ARQUITECTURA.md`): inicio de sesión y empresa, rejilla de presupuesto, cierre, resumen y asistente, siguiendo la maqueta del repositorio de conocimiento.

## Requisitos

| Herramienta | Versión | Dónde se fija |
|---|---|---|
| Node.js | 22 (22.12 o superior) | `.nvmrc` y `engines` de `package.json` |
| npm | el que trae Node 22 | `package-lock.json` (se sube siempre) |

Con `nvm`: `nvm use 22` (en Windows con `nvm-windows`, `nvm use 22.23.4` o la 22 que tengas instalada). Comprueba con `node --version`.

## Comandos

```bash
npm ci                # instala exactamente lo que dice package-lock.json
npm run dev           # servidor de desarrollo en http://localhost:5173
npm run lint          # oxlint
npm run typecheck     # TypeScript (tsc -b)
npm test              # Vitest, una pasada
npm run build         # comprueba tipos y genera dist/
```

**Antes de subir cambios** ejecuta `lint`, `typecheck`, `test` y `build`: son los mismos pasos de la integración continua.

Usa `npm ci` (no `npm install`) para instalar. Solo se usa `npm install <paquete>` para **agregar** una dependencia, y entonces se sube también el `package-lock.json`.

## Hablar con la API en desarrollo

El servidor de desarrollo reenvía lo que empieza por `/api` a la API local (`siap-api`, `http://localhost:5080`), quitando el prefijo:

| Desde el navegador | Llega a la API como |
|---|---|
| `GET http://localhost:5173/api/health` | `GET http://localhost:5080/health` |

Así no hace falta configurar CORS ni escribir la dirección de la API en el código. Para probarlo: levanta `siap-api` (`dotnet run --project src/Siap.Api`) y luego `npm run dev`. La configuración está en `vite.config.ts`.

## Estructura

```text
siap-web/
├─ index.html
├─ package.json · package-lock.json · .nvmrc
├─ vite.config.ts             Vite, Vitest y el reenvío de /api
├─ tsconfig*.json             TypeScript
├─ .oxlintrc.json             reglas de lint
├─ src/
│  ├─ main.tsx                punto de entrada
│  ├─ App.tsx                 esqueleto de la aplicación
│  ├─ App.test.tsx            pruebas del componente
│  └─ test/setup.ts           preparación de las pruebas
├─ docs/                      arquitectura de este repositorio y decisiones de código
└─ .github/                   integración continua, plantilla de PR y dependabot
```

## Reglas de interfaz (no se negocian sin una decisión)

1. **La web no calcula dinero.** No suma, multiplica ni redondea valores de dinero en el navegador: muestra lo que devuelve la API (D-27, D-51). Dar formato (por ejemplo, separadores de miles) sí se puede.
2. **Fluent UI v9** y estilo **Fluent 2** (D-33). Rejilla densa y sobria; resumen, cierre y cronograma más visuales (D-58).
3. **Que no sature** (D-64): todas las funciones se conservan, pero a la vista solo lo esencial, en tres niveles (siempre visible, al seleccionar, y en «Más» y `Ctrl+K`).
4. **Usable con teclado y en tableta** (D-47, U2). Cumple WCAG 2.2 AA (`01_fundamentos/03_condiciones/ESTANDARES.md`, en el repositorio de conocimiento).
5. **Todo valor se explica** (U4) y los avisos traen una acción (U6).
6. Los textos de pantalla van en español de Colombia.

## Seguridad y autorización (ADR-014)

- Sin datos de clientes ni secretos en el código (ver `SECURITY.md`). Las variables de entorno locales van en `.env.local`, que no se sube.
- Todo lo que empiece por `VITE_` **queda visible para cualquiera que abra la web**: nunca pongas ahí una llave.
- Se puede trabajar en desarrollo y pruebas. **Producción, publicación a clientes reales y cobros reales requieren una autorización aparte** de Victor Manuel.

## Cómo se trabaja aquí

Ramas, commits y revisiones: `CONTRIBUIR.md`. Reglas para agentes de IA: `AGENTS.md`. Configuración de GitHub que debe tener el dueño del repositorio: `docs/CONFIGURACION_GITHUB.md`.
