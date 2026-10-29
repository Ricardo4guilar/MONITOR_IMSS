import { cn } from '@/lib/utils'

/** Colores de serie disponibles: son los tokens `--chart-*` de index.css. */
export type ColorSerie = 'chart-1' | 'chart-2' | 'chart-3' | 'chart-4' | 'chart-5'

export type SerieLeyenda = {
  etiqueta: string
  color: ColorSerie
}

// Clases completas y literales: Tailwind no detecta nombres armados con plantillas.
const CLASE_DE_COLOR: Record<ColorSerie, string> = {
  'chart-1': 'bg-chart-1',
  'chart-2': 'bg-chart-2',
  'chart-3': 'bg-chart-3',
  'chart-4': 'bg-chart-4',
  'chart-5': 'bg-chart-5',
}

type ChartLegendProps = {
  series: readonly SerieLeyenda[]
}

export function ChartLegend({ series }: ChartLegendProps) {
  return (
    <ul aria-label="Leyenda de la gráfica" className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
      {series.map((serie) => (
        <li key={serie.etiqueta} className="flex items-center gap-2">
          <span aria-hidden="true" className={cn('size-2.5 rounded-full', CLASE_DE_COLOR[serie.color])} />
          {serie.etiqueta}
        </li>
      ))}
    </ul>
  )
}
