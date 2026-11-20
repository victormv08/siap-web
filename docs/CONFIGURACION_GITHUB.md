# Configuración de GitHub para `siap-web`

Lista para el **dueño del repositorio** (Victor Manuel). Esto no se puede dejar en el código: se hace en la página del repositorio en GitHub, en **Settings**. Marca cada punto cuando esté hecho.

> Algunas funciones de seguridad de GitHub dependen del plan. Donde dice «si el plan lo permite», si no aparece la opción, el punto se cubre con revisión manual (`git diff` antes de cada commit).

## 1. Visibilidad y acceso

- [ ] El repositorio es **privado** (Settings › General › Danger Zone).
- [ ] Las personas del equipo están como **colaboradoras con permiso de escritura** (Settings › Collaborators). Sin ese permiso no pueden subir a `development`.
- [ ] Solo el dueño tiene permiso de administración.

## 2. Ramas

- [ ] **Rama predeterminada: `development`** (Settings › Branches). Así las solicitudes de integración apuntan ahí por defecto y nadie integra a `main` por descuido.
- [ ] Regla de protección para **`main`** (Settings › Branches › Add branch ruleset o Add rule):
  - Exigir solicitud de integración antes de integrar.
  - Exigir que pase la comprobación **«Compilar y probar»** (aparece después de la primera ejecución de la integración continua).
  - Bloquear `push --force` y el borrado de la rama.
  - Restringir quién puede subir directamente: solo el dueño.
- [ ] Regla de protección para **`development`**:
  - Exigir que pase **«Compilar y probar»**.
  - Bloquear `push --force` y el borrado de la rama.
  - Recomendado: exigir solicitud de integración con **1 revisión** de otra persona. Si el equipo es muy pequeño y esto lo frena, se puede empezar sin exigir revisión y activarla después.

## 3. Acciones (integración continua)

- [ ] Settings › Actions › General: **permitir** Actions en este repositorio.
- [ ] «Workflow permissions»: **Read repository contents permissions** (el flujo ya declara `contents: read`).
- [ ] Después del primer `push`, abrir la pestaña **Actions** y confirmar que **CI** pasó en `main` y en `development`. Si falla, no hace falta tocar nada: avisar con el mensaje de error.

## 4. Seguridad

- [ ] Dependabot alerts y **Dependabot security updates**: activar (Settings › Code security).
- [ ] **Secret scanning** y **push protection**: activar, si el plan lo permite.
- [ ] Revisar que el archivo `.github/dependabot.yml` esté detectado (Insights › Dependency graph › Dependabot).

## 5. Después de configurar

- [ ] Hacer una PR de prueba a `development` con un cambio mínimo y confirmar que **CI** corre y que la plantilla de PR aparece.
- [ ] Dejar constancia en el repositorio de conocimiento (bitácora) de que la configuración quedó hecha.
