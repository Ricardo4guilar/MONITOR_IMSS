import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts'

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import type { PuntoGrafica } from '@/features/dashboard/utils/serie-avance'

// Colores desde los tokens --chart-*: instalados (azul), meta (rojo) y proyección (blanco).
const CONFIG = {
  acumulado: { label: 'Agentes instalados', color: 'var(--chart-1)' },
  meta: { label: 'Meta', color: 'var(--chart-2)' },
  proyeccion: { label: 'Proyección', color: 'var(--chart-3)' },
} satisfies ChartConfig

const enteros = new Intl.NumberFormat('es-MX')

/** Texto para lectores de pantalla: lo que la gráfica dice, ya que el dibujo no es legible sin verlo. */
function resumenAccesible(serie: readonly PuntoGrafica[]): string {
  const primero = serie[0]
  const ultimo = serie.at(-1)
  if (!primero || !ultimo) return 'Gráfica de líneas sin datos'
  return (
    `Gráfica de líneas: agentes instalados del ${primero.fecha} al ${ultimo.fecha}, ` +
    `de ${enteros.format(primero.acumulado)} a ${enteros.format(ultimo.acumulado)} ` +
    `de una meta de ${enteros.format(ultimo.meta)}.`
  )
}

type GraficaAvanceProps = {
  serie: readonly PuntoGrafica[]
}

/**
 * Avance acumulado de instalación contra la meta y contra la proyección a ritmo constante.
 * Ocupa todo el alto que le deje el panel: el contenedor interno es absoluto porque el gráfico
 * necesita un padre con alto definido y, sin él, toma la proporción de pantalla ancha y crece sin límite.
 */
export function GraficaAvance({ serie }: GraficaAvanceProps) {
  return (
    <div role="img" aria-label={resumenAccesible(serie)} className="relative min-h-48 flex-1">
      <div className="absolute inset-0">
        <ChartContainer config={CONFIG} className="aspect-auto size-full">
          <ComposedChart data={[...serie]} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="relleno-acumulado" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-acumulado)" stopOpacity={0.35} />
                <stop offset="95%" stopColor="var(--color-acumulado)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="fecha"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={28}
              // "9/9/2026" → "9/9": el año ya está en el título del panel.
              tickFormatter={(fecha: string) => fecha.split('/').slice(0, 2).join('/')}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={56}
              domain={[0, 'auto']}
              tickFormatter={(valor: number) => enteros.format(valor)}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line dataKey="meta" type="linear" stroke="var(--color-meta)" strokeWidth={2} strokeDasharray="6 4" dot={false} />
            <Line
              dataKey="proyeccion"
              type="linear"
              stroke="var(--color-proyeccion)"
              strokeWidth={2}
              strokeDasharray="2 4"
              dot={false}
            />
            <Area
              dataKey="acumulado"
              type="monotone"
              stroke="var(--color-acumulado)"
              strokeWidth={2.5}
              fill="url(#relleno-acumulado)"
              dot={false}
            />
          </ComposedChart>
        </ChartContainer>
      </div>
    </div>
  )
}
