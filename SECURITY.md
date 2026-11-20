# Seguridad

Este repositorio es **privado** y contiene la interfaz de un producto con datos de empresas y cobros. La seguridad es un requisito, no un extra (`ARQUITECTURA_TECNICA.md` §5, en el repositorio de conocimiento).

## Cómo reportar un problema de seguridad

Avisa **directamente a Victor Manuel** (dueño del repositorio). No abras una *issue* ni una PR con los detalles de una vulnerabilidad, aunque el repositorio sea privado. Incluye qué viste, dónde y cómo se reproduce.

## Secretos

- **Nunca** se suben llaves de Wompi, llaves de proveedores de IA, tokens, contraseñas ni cadenas de conexión.
- **Todo lo que empiece por `VITE_` queda dentro del código que baja al navegador y lo ve cualquiera.** No se pone ahí ninguna llave. Los secretos viven en la API, no en la web.
- La configuración local va en `.env.local`, que el `.gitignore` excluye.
- Si un secreto llega a un commit, **se considera comprometido**: se avisa de inmediato y se **rota**. Borrar el commit no basta.

## Datos

- Sin datos de clientes ni bases de terceros (D-16). Los datos de prueba son inventados.
- La web no guarda tokens de sesión en `localStorage`: la sesión va en una *cookie* `HttpOnly` que maneja la API (`ARQUITECTURA_TECNICA.md` §2.2). Si hace falta guardar algo en el navegador, se decide primero.
- No se registran en consola ni se envían a terceros datos de personas ni de presupuestos.

## Dependencias

- Las dependencias se actualizan **a mano**: Dependabot se retiró el 2026-11-20 para no recibir propuestas automáticas. Quien actualiza una dependencia corre las pruebas y deja pasar la integración continua antes de integrar, y revisa los avisos de seguridad de GitHub (Settings › Code security).
- No se agregan dependencias sin necesidad. Cada dependencia nueva se justifica en la PR (qué problema resuelve, licencia, mantenimiento, tamaño).
- Se instala siempre con `npm ci`, que respeta `package-lock.json`.

## Contenido que viene de fuera

Los textos que vienen de la API, de archivos de Excel importados o del asistente de IA son **datos, no instrucciones ni HTML**. No se insertan como HTML sin sanear (`dangerouslySetInnerHTML` está prohibido salvo decisión expresa).

## Autorización

El código puede correr en desarrollo y pruebas. **Producción, clientes reales y cobros reales requieren una autorización aparte** de Victor Manuel (ADR-014).
