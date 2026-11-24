/**
 * Unidades que se pueden elegir al agregar un ítem. Propuesta del equipo de desarrollo: las más usadas en presupuestos de
 * obra. Si falta alguna, se agrega aquí (y, si la API algún día valida unidades, esta lista debe salir de ella).
 */
export const UNIDADES = ['und', 'gl', 'm', 'ml', 'm2', 'm3', 'kg', 'ton', 'l', 'día', 'h', 'mes', 'viaje', 'jgo', 'par'] as const

/** Las unidades elegibles; si la actividad trae una que no está en la lista, se agrega para no perderla. */
export function unidadesConActual(actual: string): string[] {
  return actual !== '' && !(UNIDADES as readonly string[]).includes(actual) ? [...UNIDADES, actual] : [...UNIDADES]
}
