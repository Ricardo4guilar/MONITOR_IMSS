import { useQuery } from '@tanstack/react-query'

import { cargarContactos, cargarHospitales } from '@/features/directorios/services/directorios.service'
import { env } from '@/lib/env'
import { fuentesCsv } from '@/lib/fuentes-csv'

const RUTA_LOCAL = `${import.meta.env.BASE_URL}data`
const FUENTES_HOSPITALES = fuentesCsv(env.VITE_HOSPITALES_CSV_URL, `${RUTA_LOCAL}/directorio_hospitales.csv`)
const FUENTES_CONTACTOS = fuentesCsv(env.VITE_CONTACTOS_CSV_URL, `${RUTA_LOCAL}/directorio_contactos.csv`)

export const CONSULTA_HOSPITALES = {
  queryKey: ['directorios', 'hospitales'],
  queryFn: () => cargarHospitales(FUENTES_HOSPITALES),
} as const

export const CONSULTA_CONTACTOS = {
  queryKey: ['directorios', 'contactos'],
  queryFn: () => cargarContactos(FUENTES_CONTACTOS),
} as const

/**
 * Los dos directorios, cada uno con su propio estado de carga: la hoja de Google a veces tarda
 * varios segundos, y lo que ya llegó se muestra sin esperar a la otra.
 */
export function useDirectorios() {
  const hospitales = useQuery(CONSULTA_HOSPITALES)
  const contactos = useQuery(CONSULTA_CONTACTOS)

  return {
    hospitales: hospitales.data ?? [],
    contactos: contactos.data ?? [],
    cargandoHospitales: hospitales.isPending,
    cargandoContactos: contactos.isPending,
    /** La hoja respondió, pero ninguna fuente sirvió. */
    falloHospitales: !hospitales.isPending && !hospitales.data,
    falloContactos: !contactos.isPending && !contactos.data,
  }
}
