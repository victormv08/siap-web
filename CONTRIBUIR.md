# Cómo contribuir a `siap-web`

Para quien desarrolla en este repositorio (practicantes, desarrolladoras y desarrolladores). Si usas un agente de IA, lee también `AGENTS.md`.

## 1. Antes de empezar

1. Lee el `README.md` y `docs/ARQUITECTURA.md`.
2. Lee en el repositorio de conocimiento `in-depth-knowledge-budget`: `bitacora/ESTADO_ACTUAL.md` y `DECISIONES_VIGENTES.md`. Ahí está **qué** se construye y qué ya está decidido. Para la interfaz, mira también `ESTANDARES.md` y la maqueta navegable.
3. Usa Node 22 (`.nvmrc`) y comprueba `node --version`.
4. Corre `npm ci`, `npm run lint`, `npm run typecheck`, `npm test` y `npm run build`. Si no pasan en una copia limpia, avisa antes de cambiar nada.

## 2. Ramas

| Rama | Para qué | Quién escribe |
|---|---|---|
| `main` | Solo lo revisado y estable. Es lo que se podría desplegar | **Victor Manuel**, integrando desde `development` |
| `development` | Trabajo diario del equipo. Sale de `main` y vuelve a `main` revisada | El equipo |
| `feature/<tema-corto>` o `fix/<tema-corto>` | Cambios que toman más de un día o que quieres revisar aparte | Quien lo desarrolla; parte de `development` y vuelve a `development` |

Reglas:

- **No se hace `push` directo a `main`.**
- Antes de empezar un trabajo, actualiza: `git switch development && git pull`.
- Un cambio = un propósito. Los cambios grandes se parten en solicitudes de integración (PR) pequeñas.
- Nada de `git push --force` sobre `main` ni `development`.

## 3. Commits

En español, en presente, con un prefijo que diga el tipo y un alcance corto:

```text
feat(presupuesto): agrega la rejilla con edición por teclado
fix(login): corrige el foco al abrir el diálogo
test(app): comprueba el título de la página
docs: aclara cómo correr la web contra la API local
chore: actualiza dependencias
```

- Cita los identificadores del repositorio de conocimiento cuando existan (`RD-044`, `D-64`, `U2`...). Así se mantiene la cadena fuente → requisito → código → prueba.
- Incluye en el mensaje **por qué**, no solo qué.

## 4. Solicitud de integración (PR)

1. Abre la PR **hacia `development`**.
2. Llena la plantilla. En especial: qué requisito o decisión implementa, cómo lo probaste y, si cambia la pantalla, **una captura**.
3. La integración continua debe pasar. **No se integra con la integración continua en rojo.**
4. Pide revisión a otra persona del equipo. Quien escribe el cambio no lo aprueba.
5. Se integra con **Squash and merge** o con un commit de merge, como se acuerde; no con reescritura de historia.

## 5. Antes de subir

```bash
npm run lint
npm run typecheck
npm test
npm run build
git status           # ¿hay algo que no debería subir?
git diff --staged    # ¿hay secretos o datos de clientes?
```

Si agregaste una dependencia, sube también `package-lock.json`.

## 6. Lo que nunca se sube

- **Secretos:** llaves, tokens, contraseñas, cadenas de conexión. **Todo lo que empiece por `VITE_` es público**: nunca va una llave ahí.
- **Datos de clientes** o de las bases de insumos del programa de referencia. Los datos de prueba son **inventados**.
- Archivos `.env` con valores reales. Para configuración local, usa `.env.local` (no se sube).

Si subiste algo sensible por error, **avisa de inmediato** a Victor Manuel: borrar el commit no basta, hay que **rotar** la llave.

## 7. Interfaz: lo que se revisa en cada PR

- **No calcula dinero** en el navegador.
- **No satura** (D-64): lo esencial a la vista, lo demás al seleccionar o en «Más» y `Ctrl+K`.
- **Teclado, tableta y accesibilidad** (D-47, U2, WCAG 2.2 AA): se llega a todo con teclado, hay nombres accesibles y el foco se ve.
- Fluent UI v9 con los *tokens* de tema.

## 8. Cuando algo contradice lo decidido

Las decisiones de Victor Manuel están en `DECISIONES_VIGENTES.md` (repositorio de conocimiento). Si tu cambio o tu idea las contradice:

1. **No lo apliques.**
2. Descríbelo en una nota para el repositorio de conocimiento: qué propones, qué decisión contradice y por qué. Se registra como propuesta en espera (ADR-009) y Victor Manuel la acepta o la rechaza.

Se va **corrigiendo sobre la marcha** (ADR-014): corregir es normal, pero toda corrección que cambie algo vigente queda registrada en el repositorio de conocimiento, no solo en el código.

## 9. Pruebas

- Toda función nueva trae su prueba. Un error corregido trae la prueba que lo habría detectado.
- Se usa Vitest con Testing Library. Para buscar elementos se prefiere el rol y el nombre accesible (`getByRole`), que también comprueba la accesibilidad.
- Los datos de prueba son inventados.
