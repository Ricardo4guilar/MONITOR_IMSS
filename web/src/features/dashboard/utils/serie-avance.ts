import type { PuntoAvance } from '@/features/dashboard/types/dashboard.types'

export type PuntoGrafica = PuntoAvance & {
  /** Meta total de agentes: constante en toda la serie. */
  meta: number
  /** Dónde debería ir ese día para llegar a la meta justo al final de la serie, a ritmo constante. */
  proyeccion: number
}

/**
 * Prepara los datos de la gráfica de avance. La hoja no trae la meta como columna, pero
 * `acumulado + restante` es siempre la meta, así que se deduce del primer día.
 */
export function construirSerieAvance(puntos: readonly PuntoAvance[]): PuntoGrafica[] {
  const primero = puntos[0]
  const ultimo = puntos.at(-1)
  if (!primero || !ultimo) return []

  const meta = primero.acumulado + primero.restante
  const dias = ultimo.dia - primero.dia

  return puntos.map((punto) => ({
    ...punto,
    meta,
    proyeccion:
      dias === 0
        ? meta
        : Math.round(primero.acumulado + ((meta - primero.acumulado) * (punto.dia - primero.dia)) / dias),
  }))
}
