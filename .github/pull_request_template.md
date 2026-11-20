## Qué cambia

<!-- Describe el cambio en una o dos frases. Si cambia la pantalla, agrega una captura. -->

## Por qué

<!-- Requisito, decisión o hallazgo que lo motiva. Cita los IDs del repositorio de conocimiento: RD-xxx, D-xx, U-x. -->

## Cómo se probó

<!-- Qué pruebas nuevas o existentes cubren el cambio y qué resultado dieron. Si es visual, cómo lo revisaste (navegador, tamaño, teclado). -->

## Lista de verificación

- [ ] `npm run lint`, `npm run typecheck`, `npm test` y `npm run build` pasan
- [ ] Hay pruebas para lo nuevo o para el error corregido
- [ ] No hay secretos, llaves ni datos de clientes (revisé `git diff`); nada sensible en variables `VITE_`
- [ ] **No calcula dinero** en el navegador
- [ ] **No satura** la pantalla (D-64): lo esencial a la vista, lo demás al seleccionar o en «Más»
- [ ] Se usa con teclado, se ve bien en tableta y tiene nombres accesibles (D-47, U2, WCAG 2.2 AA)
- [ ] Si agregué una dependencia, expliqué por qué y subí `package-lock.json`
- [ ] **No contradice** una decisión de `DECISIONES_VIGENTES.md`. Si la contradice, lo explico aquí y queda como propuesta en espera
- [ ] Si corrige o cambia algo vigente, quedó registrado en el repositorio de conocimiento
