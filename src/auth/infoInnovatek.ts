/**
 * Datos de la empresa para el pie de la pantalla de entrada. Es el único lugar donde se cambian.
 *
 * Solo está confirmado el nombre «Innovatek S.A.S.». NO se inventan NIT, dirección, teléfono, correo,
 * sitio web ni enlaces a «Términos» o «Privacidad» (esos documentos no existen). Cuando estén confirmados,
 * se agregan aquí: contacto, sitio web y aviso de tratamiento de datos personales.
 */
export const infoInnovatek = {
  nombre: 'Innovatek S.A.S.',
  producto: 'SIAP · Sistema Integral de Análisis de Precios',
} as const

/** El año se toma al renderizar, para que el pie no quede desactualizado. */
export function textoDerechos(anio: number = new Date().getFullYear()): string {
  return `© ${anio} ${infoInnovatek.nombre} Todos los derechos reservados.`
}
