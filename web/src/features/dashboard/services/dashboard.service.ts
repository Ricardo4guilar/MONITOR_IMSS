import {
  filaAvanceSchema,
  filaNovDicSchema,
  resumenSepOctSchema,
} from '@/features/dashboard/schemas/dashboard.schemas'
import type { PuntoAvance, ResumenNovDic, ResumenSepOct } from '@/features/dashboard/types/dashboard.types'
import { primeraFuenteValida, type FuenteCsv } from '@/lib/fuentes-csv'

/** Serie diaria de instalación, ordenada por día. `null` si ninguna fuente sirve. */
export function cargarAvanceDiario(fuentes: readonly FuenteCsv[]): Promise<PuntoAvance[] | null> {
  return primeraFuenteValida(fuentes, (filas) => {
    const puntos = filas.flatMap((fila) => {
      const resultado = filaAvanceSchema.safeParse(fila)
      return resultado.success ? [resultado.data] : []
    })
    return puntos.length > 0 ? puntos.toSorted((a, b) => a.dia - b.dia) : null
  })
}

/** Resumen Noviembre-Diciembre (primera fila válida). `null` si ninguna fuente sirve. */
export function cargarResumenNovDic(fuentes: readonly FuenteCsv[]): Promise<ResumenNovDic | null> {
  return primeraFuenteValida(fuentes, (filas) => {
    for (const fila of filas) {
      const resultado = filaNovDicSchema.safeParse(fila)
      if (resultado.success) return resultado.data
    }
    return null
  })
}

/**
 * Resumen Septiembre-Octubre. La hoja es clave-valor (columnas `metrica` y `valor`), así que las filas
 * se pliegan en un objeto y se valida completo: si falta o está mal una métrica, la fuente no sirve.
 */
export function cargarResumenSepOct(fuentes: readonly FuenteCsv[]): Promise<ResumenSepOct | null> {
  return primeraFuenteValida(fuentes, (filas) => {
    const hoja = Object.fromEntries(filas.map((fila) => [fila.metrica ?? '', fila.valor ?? '']))
    const resultado = resumenSepOctSchema.safeParse(hoja)
    return resultado.success ? resultado.data : null
  })
}
