import { filaEntidadSchema, filaMetricasSchema } from '@/features/mapa/schemas/mapa.schemas'
import type { FilaEntidad, MetricasPorEstado } from '@/features/mapa/types/mapa.types'
import { fuentesCsv, primeraFuenteValida, type FuenteCsv } from '@/lib/fuentes-csv'

// Se reexporta para quien ya importaba `fuentesCsv` desde aquí.
export { fuentesCsv }

/** Tabla EntidadesFederativas. `null` si ninguna fuente sirve: el mapa usa sus regiones por defecto. */
export function cargarEntidades(fuentes: readonly FuenteCsv[]): Promise<FilaEntidad[] | null> {
  return primeraFuenteValida(fuentes, (filas) =>
    filas.flatMap((fila) => {
      const resultado = filaEntidadSchema.safeParse(fila)
      return resultado.success ? [resultado.data] : []
    }),
  )
}

/** Tabla MetricasEntidad por clave ISO. `{}` si ninguna fuente sirve: el mapa muestra ceros. */
export async function cargarMetricas(fuentes: readonly FuenteCsv[]): Promise<MetricasPorEstado> {
  const metricas = await primeraFuenteValida(fuentes, (filas) => {
    const validas = filas.flatMap((fila) => {
      const resultado = filaMetricasSchema.safeParse(fila)
      return resultado.success ? [resultado.data] : []
    })
    return validas.length > 0 ? Object.fromEntries(validas.map((v) => [v.clave, v.metricas])) : null
  })
  return metricas ?? {}
}
