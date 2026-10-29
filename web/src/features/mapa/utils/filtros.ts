import type { EstadoGeo } from '@/features/mapa/types/mapa.types'

export type Filtros = {
  texto: string
  /** Región elegida en el filtro de la barra superior; vacío = todas. */
  region: string
  /** Regiones apagadas desde la leyenda. */
  regionesOcultas: ReadonlySet<string>
}

/** Ids de los estados que pasan la búsqueda, el filtro de región y la leyenda a la vez. */
export function idsVisibles(estados: readonly EstadoGeo[], filtros: Filtros): Set<string> {
  const busqueda = filtros.texto.trim().toLowerCase()

  return new Set(
    estados
      .filter((estado) => {
        const coincideTexto =
          busqueda === '' ||
          [estado.name, estado.abbr, estado.id, estado.capital].some((campo) =>
            campo.toLowerCase().includes(busqueda),
          )
        const coincideRegion = filtros.region === '' || estado.region === filtros.region
        return coincideTexto && coincideRegion && !filtros.regionesOcultas.has(estado.region)
      })
      .map((estado) => estado.id),
  )
}
