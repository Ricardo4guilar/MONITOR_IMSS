import type { PuntoGrafica } from '@/features/dashboard/utils/serie-avance'

const MS_POR_DIA = 24 * 60 * 60 * 1000

/** Fecha d/m/yyyy (como la de las hojas) a medianoche local. `null` si no es válida. */
function parsearFecha(texto: string): Date | null {
  const partes = texto.trim().split('/')
  if (partes.length !== 3) return null
  const [dia, mes, anio] = partes.map((parte) => Number(parte)) as [number, number, number]
  if (![dia, mes, anio].every(Number.isInteger)) return null
  const fecha = new Date(anio, mes - 1, dia)
  const valida = fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia
  return valida ? fecha : null
}

/**
 * Encuentra en la serie el punto que representa "hoy", para anclar ahí el marcador del día actual.
 *
 * El marcador nunca debe salir de la gráfica: su dominio son las fechas de AvancePorDia. Por eso, si hoy
 * cae fuera del rango (antes del primer día o después del último), se ancla al extremo más cercano; si cae
 * dentro, al día de la serie con la fecha más próxima. Así siempre coincide con una categoría real del eje X.
 *
 * Devuelve la `fecha` (el valor de `dataKey="fecha"` de ese punto, para posicionar un ReferenceLine) y su
 * `indice` en la serie. `null` si la serie está vacía o ninguna fecha es válida.
 */
export function ubicarDiaActual(
  serie: readonly PuntoGrafica[],
  hoy: Date = new Date(),
): { fecha: string; indice: number } | null {
  if (serie.length === 0) return null

  const hoyMs = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime()

  let mejorIndice = -1
  let mejorDistancia = Number.POSITIVE_INFINITY
  for (let i = 0; i < serie.length; i++) {
    const punto = serie[i]
    if (!punto) continue
    const fecha = parsearFecha(punto.fecha)
    if (!fecha) continue
    const distancia = Math.abs(Math.round((fecha.getTime() - hoyMs) / MS_POR_DIA))
    if (distancia < mejorDistancia) {
      mejorDistancia = distancia
      mejorIndice = i
    }
  }

  if (mejorIndice === -1) return null
  return { fecha: serie[mejorIndice]!.fecha, indice: mejorIndice }
}
