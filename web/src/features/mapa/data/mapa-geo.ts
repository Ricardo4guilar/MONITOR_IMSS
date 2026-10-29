import { z } from 'zod'

import anclajesJson from '@/features/mapa/data/anclajes.json'
import mxMapJson from '@/features/mapa/data/mx-map.json'
import { anclajesSchema, mapaGeoSchema } from '@/features/mapa/schemas/mapa.schemas'
import { parsearViewBox } from '@/features/mapa/utils/zoom'

/** Contorno de los 32 estados (Simplemaps, licencia de uso comercial libre). */
export const MAPA_GEO = mapaGeoSchema.parse(mxMapJson)

/** Punto de cada estado donde se dibuja su marcador: la capital, o el punto interior más cercano si cae fuera. */
export const ANCLAJES: z.infer<typeof anclajesSchema> = anclajesSchema.parse(anclajesJson)

/** Vista completa del mapa (100 % de zoom). */
export const VISTA_BASE = parsearViewBox(MAPA_GEO.viewBox)
