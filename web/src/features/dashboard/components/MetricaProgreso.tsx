import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress'

type MetricaProgresoProps = {
  etiqueta: string
  /** 0-100. */
  valor: number
  /** Línea de detalle bajo la barra. */
  detalle: string
}

/** Una métrica expresada como barra de progreso: etiqueta, porcentaje y una línea de detalle. */
export function MetricaProgreso({ etiqueta, valor, detalle }: MetricaProgresoProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Progress value={valor} className="gap-2">
        <ProgressLabel>{etiqueta}</ProgressLabel>
        <ProgressValue>{() => `${valor.toFixed(1)}%`}</ProgressValue>
      </Progress>
      <p className="text-xs text-muted-foreground">{detalle}</p>
    </div>
  )
}
