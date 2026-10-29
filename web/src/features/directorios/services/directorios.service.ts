import { filaContactoSchema, filaHospitalSchema } from '@/features/directorios/schemas/directorios.schemas'
import type { Contacto, Hospital } from '@/features/directorios/types/directorios.types'
import { primeraFuenteValida, type FuenteCsv } from '@/lib/fuentes-csv'

/** Directorio de hospitales. `null` si ninguna fuente sirve. */
export function cargarHospitales(fuentes: readonly FuenteCsv[]): Promise<Hospital[] | null> {
  return primeraFuenteValida(fuentes, (filas) => {
    const hospitales = filas.flatMap((fila) => {
      const resultado = filaHospitalSchema.safeParse(fila)
      return resultado.success ? [resultado.data] : []
    })
    return hospitales.length > 0 ? hospitales : null
  })
}

/** Directorio de contactos médicos. `null` si ninguna fuente sirve. */
export function cargarContactos(fuentes: readonly FuenteCsv[]): Promise<Contacto[] | null> {
  return primeraFuenteValida(fuentes, (filas) => {
    const contactos = filas.flatMap((fila) => {
      const resultado = filaContactoSchema.safeParse(fila)
      return resultado.success ? [resultado.data] : []
    })
    return contactos.length > 0 ? contactos : null
  })
}
