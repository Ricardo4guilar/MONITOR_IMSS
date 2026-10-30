import { useMemo } from 'react'

import {
  construirSegmentos,
  porcentajeTranscurrido,
  type Corte,
} from '@/features/dashboard/utils/avance-segmentado'
import { cn } from '@/lib/utils'

const fechaLarga = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })

type AvanceSegmentadoProps = {
  /** Título de la barra (p. ej. "Tiempo transcurrido"). */
  etiqueta: string
  /** Punto A: inicio del periodo. Formato d/m/yyyy o Date. */
  inicio: string | Date
  /** Punto B: fin del periodo. Formato d/m/yyyy o Date. */
  fin: string | Date
  /** Punto H: "hoy". Normalmente la fecha que calculó la hoja (resumen.fechaHoy). */
  hoy: string | Date
  /**
   * Puntos X: cortes de fecha que se resaltan sobre el relleno de avance. Uno o varios.
   *
   * Para llenarlos manualmente, pasa un arreglo con la fecha (d/m/yyyy, igual que las hojas) y, si quieres,
   * una etiqueta para el tooltip. Ejemplo:
   *
   *   cortes={[
   *     { fecha: '30/11/2026', etiqueta: 'Corte de noviembre' },
   *     { fecha: '15/12/2026', etiqueta: 'Revisión intermedia' },
   *   ]}
   *
   * Las fechas fuera del rango A→B se ignoran. Si se deja vacío, no se dibuja ningún corte.
   */
  cortes?: readonly Corte[]
}

/**
 * Barra temporal segmentada: una celda por día entre A y B.
 * - A→H se pinta brillante (avance); H→B queda en un tono apagado (días que aún no llegan).
 * - Cada corte X se marca con un azul que resalta y sobresale, por encima del relleno.
 */
export function AvanceSegmentado({ etiqueta, inicio, fin, hoy, cortes = [] }: AvanceSegmentadoProps) {
  const segmentos = useMemo(
    () => construirSegmentos({ inicio, fin, hoy, cortes }),
    [inicio, fin, hoy, cortes],
  )
  const pct = porcentajeTranscurrido(segmentos)

  if (segmentos.length === 0) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">{etiqueta}</span>
        <p className="text-xs text-muted-foreground">Fechas del periodo no disponibles.</p>
      </div>
    )
  }

  // Días transcurridos = barras ya pintadas (A→H). Es el conteo que rotula la cabecera, no el porcentaje.
  const diasTranscurridos = segmentos.filter((s) => s.estado === 'transcurrido').length

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium">{etiqueta}</span>
        <span className="text-xs tabular-nums text-muted-foreground">
          {diasTranscurridos} de {segmentos.length} días
        </span>
      </div>

      <div
        role="img"
        aria-label={`${etiqueta}: día ${diasTranscurridos} de ${segmentos.length} (${pct.toFixed(0)}% transcurrido)`}
        className="flex h-6 items-end gap-px"
      >
        {segmentos.map((s) => {
          const titulo = fechaLarga.format(s.fecha) + (s.etiquetaCorte ? ` · ${s.etiquetaCorte}` : '')
          return (
            <span
              key={s.indice}
              title={titulo}
              className={cn(
                'flex-1 rounded-[2px] transition-colors',
                s.esCorte
                  ? // Corte X: azul cian claro que resalta sobre el relleno; sobresale a lo alto.
                    'h-full bg-sky-400 ring-1 ring-sky-200 dark:bg-sky-300'
                  : s.estado === 'transcurrido'
                    ? // Avance A→H: azul brillante del tema.
                      'h-full bg-primary'
                    : // Restante H→B: tono apagado y más bajo, "aún no llega".
                      'h-full bg-muted-foreground/25',
              )}
            />
          )
        })}
      </div>

      {cortes.length > 0 ? (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {cortes.map((corte, i) => (
            <li key={i} className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-[2px] bg-sky-400 ring-1 ring-sky-200 dark:bg-sky-300" />
              {corte.etiqueta ?? (typeof corte.fecha === 'string' ? corte.fecha : fechaLarga.format(corte.fecha))}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
