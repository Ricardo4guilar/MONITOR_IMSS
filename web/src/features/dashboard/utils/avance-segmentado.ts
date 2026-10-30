/** Una fecha de corte dentro del periodo, con una etiqueta opcional para el tooltip/leyenda. */
export type Corte = {
  /** Fecha del corte en formato d/m/yyyy (igual que las hojas) o un Date ya construido. */
  fecha: string | Date
  /** Texto descriptivo opcional ("Corte de noviembre"). */
  etiqueta?: string
}

/** Un día del periodo, ya clasificado para pintarlo. */
export type Segmento = {
  /** Posición del día dentro del periodo, empezando en 0. */
  indice: number
  /** La fecha que representa esta barra (medianoche, hora local). */
  fecha: Date
  /** `transcurrido` si el día es menor o igual a hoy; si no, `restante`. */
  estado: 'transcurrido' | 'restante'
  /** `true` si una fecha de corte cae en este día: se pinta distinto y gana sobre el relleno. */
  esCorte: boolean
  /** Etiqueta del corte, si lo hay. */
  etiquetaCorte?: string
}

const MS_POR_DIA = 24 * 60 * 60 * 1000

/**
 * Convierte una fecha a medianoche hora local. Acepta `Date` o el texto d/m/yyyy que publican las hojas
 * (p. ej. "9/9/2026"). Devuelve `null` si el texto no es una fecha válida, para que quien llama decida.
 */
export function parsearFecha(valor: string | Date): Date | null {
  if (valor instanceof Date) {
    return Number.isNaN(valor.getTime()) ? null : aMedianoche(valor)
  }
  const partes = valor.trim().split('/')
  if (partes.length !== 3) return null

  const [dia, mes, anio] = partes.map((parte) => Number(parte)) as [number, number, number]
  if (![dia, mes, anio].every(Number.isInteger)) return null

  const fecha = new Date(anio, mes - 1, dia)
  // new Date no valida: un 31/2 se desborda a marzo. Se comprueba que no cambió ninguna parte.
  const valida =
    fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia
  return valida ? fecha : null
}

function aMedianoche(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate())
}

/** Días completos entre dos fechas (b - a). Negativo si b es anterior a a. */
function diasEntre(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / MS_POR_DIA)
}

type ConstruirSegmentosArgs = {
  inicio: string | Date
  fin: string | Date
  hoy: string | Date
  cortes?: readonly Corte[]
}

/**
 * Genera un segmento por cada día del periodo A→B (inclusive en ambos extremos): una barra por día.
 * - A→H (hoy) quedan como `transcurrido`; el resto H→B como `restante`.
 * - Un día marcado como corte conserva su fecha pero se señala con `esCorte`, y manda sobre el relleno.
 *
 * Devuelve `[]` si alguna fecha no es válida o si B es anterior a A: el componente muestra un aviso.
 */
export function construirSegmentos({ inicio, fin, hoy, cortes = [] }: ConstruirSegmentosArgs): Segmento[] {
  const a = parsearFecha(inicio)
  const b = parsearFecha(fin)
  const h = parsearFecha(hoy)
  if (!a || !b || !h) return []

  const totalDias = diasEntre(a, b)
  if (totalDias < 0) return []

  // Cortes válidos indexados por días desde A, para marcarlos en O(1) al recorrer el periodo.
  const cortesPorDia = new Map<number, string | undefined>()
  for (const corte of cortes) {
    const fecha = parsearFecha(corte.fecha)
    if (!fecha) continue
    const indice = diasEntre(a, fecha)
    if (indice >= 0 && indice <= totalDias) cortesPorDia.set(indice, corte.etiqueta)
  }

  const indiceHoy = diasEntre(a, h)

  return Array.from({ length: totalDias + 1 }, (_, indice) => {
    const fecha = new Date(a.getTime() + indice * MS_POR_DIA)
    const esCorte = cortesPorDia.has(indice)
    return {
      indice,
      fecha,
      estado: indice <= indiceHoy ? 'transcurrido' : 'restante',
      esCorte,
      etiquetaCorte: esCorte ? cortesPorDia.get(indice) : undefined,
    }
  })
}

/** Porcentaje 0-100 del periodo ya transcurrido (A→H sobre A→B). Útil para el texto de cabecera. */
export function porcentajeTranscurrido(segmentos: readonly Segmento[]): number {
  if (segmentos.length === 0) return 0
  const transcurridos = segmentos.filter((s) => s.estado === 'transcurrido').length
  return Math.min(100, Math.max(0, (transcurridos / segmentos.length) * 100))
}
