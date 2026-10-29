import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { MAPA_GEO } from '@/features/mapa/data/mapa-geo'
import { cargarEntidades, cargarMetricas, fuentesCsv } from '@/features/mapa/services/mapa.service'
import type { EstadoMapa, Metricas } from '@/features/mapa/types/mapa.types'
import { aplicarEntidades } from '@/features/mapa/utils/entidades'
import { colorDeRegion, ordenarRegiones } from '@/features/mapa/utils/regiones'
import { env } from '@/lib/env'

const RUTA_LOCAL = `${import.meta.env.BASE_URL}data`
const FUENTES_ENTIDADES = fuentesCsv(env.VITE_ENTIDADES_CSV_URL, `${RUTA_LOCAL}/entidades_data.csv`)
const FUENTES_METRICAS = fuentesCsv(env.VITE_METRICAS_CSV_URL, `${RUTA_LOCAL}/metricas_entidad.csv`)

const SIN_METRICAS: Metricas = { hospitales: 0, servicios: 0, agentes: 0, equipos: 0 }

/** Los 32 estados con región y métricas de las hojas, más las regiones y su color. */
export function useEstadosMapa() {
  const entidades = useQuery({ queryKey: ['mapa', 'entidades'], queryFn: () => cargarEntidades(FUENTES_ENTIDADES) })
  const metricas = useQuery({ queryKey: ['mapa', 'metricas'], queryFn: () => cargarMetricas(FUENTES_METRICAS) })

  const estados = useMemo<EstadoMapa[]>(
    () =>
      aplicarEntidades(MAPA_GEO.states, entidades.data ?? null).map((estado) => ({
        ...estado,
        metricas: metricas.data?.[estado.id] ?? SIN_METRICAS,
      })),
    [entidades.data, metricas.data],
  )

  const regiones = useMemo(() => ordenarRegiones(estados.map((e) => e.region)), [estados])

  /** Región → color CSS. Las inesperadas toman uno de respaldo según su posición. */
  const colores = useMemo(
    () => new Map(regiones.map((region, indice) => [region, colorDeRegion(region, indice)])),
    [regiones],
  )

  return { estados, regiones, colores, cargando: entidades.isPending || metricas.isPending }
}
