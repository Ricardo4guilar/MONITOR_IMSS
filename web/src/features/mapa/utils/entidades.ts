import type { EstadoGeo, FilaEntidad } from '@/features/mapa/types/mapa.types'
import { normalizarRegion } from '@/features/mapa/utils/regiones'

/**
 * Regenera región y nombre de cada estado con los de la tabla EntidadesFederativas, por clave.
 * Sin tabla (`null`) quedan las regiones que ya trae el mapa. No modifica la lista original.
 */
export function aplicarEntidades(
  estados: readonly EstadoGeo[],
  filas: readonly FilaEntidad[] | null,
): EstadoGeo[] {
  const porClave = new Map(filas?.map((fila) => [fila.clave, fila]))

  return estados.map((estado) => {
    const fila = porClave.get(estado.id)
    return {
      ...estado,
      region: normalizarRegion(fila?.region) || normalizarRegion(estado.region),
      name: fila?.nombre.trim() || estado.name,
    }
  })
}
