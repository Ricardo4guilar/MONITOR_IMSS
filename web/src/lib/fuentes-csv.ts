import { filasAObjetos, parsearCsv } from '@/lib/csv'
import { obtenerTexto } from '@/lib/http-client'

export type FuenteCsv = { tipo: 'remota' | 'local'; url: string }

export type FilaCsv = Record<string, string>

/** Primero la hoja publicada (datos en vivo) y, si no hay o falla, la copia local. */
export function fuentesCsv(urlRemota: string | undefined, urlLocal: string): FuenteCsv[] {
  const remota: FuenteCsv[] = urlRemota ? [{ tipo: 'remota', url: urlRemota }] : []
  return [...remota, { tipo: 'local', url: urlLocal }]
}

/**
 * Prueba las fuentes en orden y devuelve lo que `convertir` saque de la primera que sirva.
 * Una fuente no sirve si falla la red, responde HTML, viene vacía o `convertir` devuelve `null`.
 */
export async function primeraFuenteValida<T>(
  fuentes: readonly FuenteCsv[],
  convertir: (filas: FilaCsv[]) => T | null,
): Promise<T | null> {
  for (const fuente of fuentes) {
    try {
      const filas = filasAObjetos(parsearCsv(await obtenerTexto(fuente.url)))
      if (filas.length === 0) throw new Error('CSV vacío')

      const resultado = convertir(filas)
      if (resultado === null) throw new Error('sin filas válidas')
      return resultado
    } catch (error) {
      const motivo = error instanceof Error ? error.message : String(error)
      console.warn(`Fuente ${fuente.tipo} (${fuente.url}) falló: ${motivo}`)
    }
  }
  return null
}
