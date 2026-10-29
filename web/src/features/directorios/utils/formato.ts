const DIAS = [
  ['LUNES', 'Lunes'],
  ['MARTES', 'Martes'],
  ['MIERCOLES', 'Miércoles'],
  ['JUEVES', 'Jueves'],
  ['VIERNES', 'Viernes'],
  ['SABADO', 'Sábado'],
  ['DOMINGO', 'Domingo'],
] as const

const SIN_DATO = 'Sin dato'
const LUNES_A_VIERNES = DIAS.slice(0, 5).map(([clave]) => clave)

/** «Todos los días», «Lunes a viernes» o los días sueltos en orden de semana. */
export function describirDias(dias: readonly string[]): string {
  if (dias.length === 0) return SIN_DATO

  const presentes = new Set(dias.map((dia) => dia.toUpperCase()))
  if (DIAS.every(([clave]) => presentes.has(clave)) && presentes.size === DIAS.length) return 'Todos los días'
  if (presentes.size === LUNES_A_VIERNES.length && LUNES_A_VIERNES.every((clave) => presentes.has(clave))) {
    return 'Lunes a viernes'
  }

  const nombres = DIAS.filter(([clave]) => presentes.has(clave)).map(([, nombre]) => nombre)
  return nombres.map((nombre, indice) => (indice === 0 ? nombre : nombre.toLowerCase())).join(', ')
}

/** La hoja marca la guardia continua como 00:00 - 23:59; cualquier otro horario se muestra tal cual. */
export function describirHorario(horario: string): string {
  const limpio = horario.trim()
  if (limpio === '') return SIN_DATO
  return limpio === '00:00 - 23:59' ? '24 horas' : limpio
}
