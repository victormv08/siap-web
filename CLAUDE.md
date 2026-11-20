# CLAUDE.md: adaptador para Claude Code

Las reglas de este repositorio están en `AGENTS.md`. Este archivo solo lo importa y agrega notas de Claude Code; no dupliques reglas aquí.

@AGENTS.md

## Notas específicas de Claude Code

- Al empezar, lee `AGENTS.md` y, en el repositorio de conocimiento, `bitacora/ESTADO_ACTUAL.md` y `DECISIONES_VIGENTES.md`.
- Usa Node 22 (`.nvmrc`). Si `node --version` no es 22, no instales con otra versión: avisa.
- Antes de decir que algo funciona, corre `npm run lint`, `npm run typecheck`, `npm test` y `npm run build` y reporta el resultado real, también si falla.
- Para revisar una pantalla en el navegador, levanta `npm run dev` (puerto 5173) y deténlo al terminar.
- Las verificaciones que deleguen en un subagente son **evidencia secundaria** hasta contrastarlas.
