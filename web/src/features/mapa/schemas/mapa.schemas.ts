import { z } from 'zod'

export const estadoGeoSchema = z.object({
  id: z.string(),
  abbr: z.string(),
  name: z.string(),
  capital: z.string(),
  region: z.string(),
  d: z.string(),
})

/** Geometría de los 32 estados: si cambia el archivo y no son 32, falla al arrancar y no en pantalla. */
export const mapaGeoSchema = z.object({
  viewBox: z.string(),
  states: z.array(estadoGeoSchema).length(32),
})

export const anclajesSchema = z.record(z.string(), z.object({ x: z.number(), y: z.number() }))

/** Fila de EntidadesFederativas: sin clave no sirve; nombre y región pueden venir vacíos. */
export const filaEntidadSchema = z
  .object({
    Clave: z.string().trim().min(1),
    Nombre: z.string().default(''),
    Region: z.string().default(''),
  })
  .transform(({ Clave, Nombre, Region }) => ({ clave: Clave, nombre: Nombre, region: Region }))

// "1,234" → 1234, "" → 0, "n/a" → 0 (mismo criterio que el mapa original).
const entero = z
  .string()
  .default('')
  .transform((valor) => Number.parseInt(valor.replace(/[^0-9-]/g, ''), 10) || 0)

/** Fila de MetricasEntidad, con la clave en mayúsculas. */
export const filaMetricasSchema = z
  .object({
    clave_iso: z.string().trim().min(1),
    hospitales: entero,
    servicios: entero,
    agentes: entero,
    equipos: entero,
  })
  .transform(({ clave_iso, ...metricas }) => ({ clave: clave_iso.toUpperCase(), metricas }))

