import { ReferenceDot, ReferenceLine } from 'recharts'

import type { PuntoGrafica } from '@/features/dashboard/utils/serie-avance'
import { ubicarDiaActual } from '@/features/dashboard/utils/dia-actual'

const COLOR = 'var(--color-acumulado, var(--chart-1))'

type FormaDot = { cx?: number; cy?: number }

/** Punto pulsante sobre la línea de Agentes instalados. recharts pasa cx/cy ya en coordenadas del gráfico. */
function MarcadorPulsante({ cx, cy }: FormaDot) {
  if (typeof cx !== 'number' || typeof cy !== 'number') return null

  return (
    <g pointerEvents="none">
      {/* Halo que crece y se desvanece: el efecto de pulso. */}
      <circle cx={cx} cy={cy} r={5} fill={COLOR} opacity={0.6}>
        <animate attributeName="r" values="5;12;5" dur="1.8s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.6;0;0.6" dur="1.8s" repeatCount="indefinite" />
      </circle>
      {/* Punto sólido fijo en el centro. */}
      <circle cx={cx} cy={cy} r={4} fill={COLOR} stroke="var(--color-card, #fff)" strokeWidth={1.5} />
    </g>
  )
}

type ChartTodayPointerProps = {
  /** La misma serie que alimenta la gráfica (AvancePorDia). Define el rango de días permitido. */
  serie: readonly PuntoGrafica[]
  /** "Hoy"; por defecto la fecha real. Inyectable para pruebas. */
  hoy?: Date
}

/**
 * Marca el día actual en la gráfica: una línea vertical guía y un punto pulsante sobre «Agentes instalados».
 *
 * - La línea vertical cruza todas las series en ese día; el pulso se ancla al valor acumulado de ese día.
 * - No interfiere con el punto activo del tooltip: son elementos independientes, sin eventos de puntero.
 * - Nunca sale de la gráfica: se ancla a un día real de la serie (el más cercano a hoy), que siempre está
 *   dentro del dominio de AvancePorDia.
 *
 * Debe ir como hijo directo del ComposedChart para recibir su sistema de coordenadas.
 */
export function ChartTodayPointer({ serie, hoy }: ChartTodayPointerProps) {
  const posicion = ubicarDiaActual(serie, hoy)
  if (!posicion) return null

  const acumulado = serie[posicion.indice]?.acumulado
  if (typeof acumulado !== 'number') return null

  return (
    <>
      {/* Guía vertical tenue en el día en curso (cruza meta, proyección y acumulado). */}
      <ReferenceLine
        x={posicion.fecha}
        stroke={COLOR}
        strokeDasharray="4 4"
        strokeOpacity={0.5}
        ifOverflow="hidden"
      />
      {/* Punto pulsante sobre la línea de Agentes instalados, en el valor de ese día. */}
      <ReferenceDot
        x={posicion.fecha}
        y={acumulado}
        ifOverflow="hidden"
        shape={<MarcadorPulsante />}
        // Sin r/fill propios: la forma la dibuja MarcadorPulsante.
        r={0}
        fill="none"
        stroke="none"
      />
    </>
  )
}
