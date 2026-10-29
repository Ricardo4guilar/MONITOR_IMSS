import { Badge } from '@/components/ui/badge'
import { MetricaProgreso } from '@/features/dashboard/components/MetricaProgreso'
import type { ResumenNovDic } from '@/features/dashboard/types/dashboard.types'
import { diasDelPeriodo, estadoRitmo, porcentaje } from '@/features/dashboard/utils/nov-dic'

const enteros = new Intl.NumberFormat('es-MX')
const unDecimal = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

type ResumenNovDicProps = {
  resumen: ResumenNovDic
}

/** Las tres lecturas de la etapa: cuánto falta de la meta, cuánto del tiempo pasó y si el ritmo alcanza. */
export function ResumenNovDicBarras({ resumen }: ResumenNovDicProps) {
  const periodo = diasDelPeriodo(resumen)
  const ritmo = estadoRitmo(resumen)

  return (
    <div className="flex flex-col gap-5">
      <MetricaProgreso
        etiqueta="Avance hacia la meta final"
        valor={porcentaje(resumen.acumuladoHoy, resumen.metaFinal)}
        detalle={`${enteros.format(resumen.acumuladoHoy)} de ${enteros.format(resumen.metaFinal)} agentes`}
      />
      <MetricaProgreso
        etiqueta="Tiempo transcurrido"
        valor={porcentaje(resumen.diasTranscurridos, periodo)}
        detalle={`Día ${resumen.diasTranscurridos} de ${periodo} · límite ${resumen.fechaLimite}`}
      />
      <div className="flex flex-col gap-2">
        <MetricaProgreso
          etiqueta="Ritmo de instalación"
          valor={porcentaje(resumen.promDiarioInstalado, resumen.promDiarioRequerido)}
          detalle={`${unDecimal.format(resumen.promDiarioInstalado)} agentes/día instalados`}
        />
        <p className="text-xs text-muted-foreground">
          {`${unDecimal.format(resumen.promDiarioRequerido)} agentes/día requeridos`}
        </p>
        <Badge variant={ritmo === 'por-encima' ? 'secondary' : 'destructive'} className="w-fit">
          {ritmo === 'por-encima' ? 'Por encima del ritmo requerido' : 'Por debajo del ritmo requerido'}
        </Badge>
      </div>
    </div>
  )
}
