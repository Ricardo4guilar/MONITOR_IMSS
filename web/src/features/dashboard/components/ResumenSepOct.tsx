import { MetricaProgreso } from '@/features/dashboard/components/MetricaProgreso'
import type { ResumenSepOct } from '@/features/dashboard/types/dashboard.types'

const enteros = new Intl.NumberFormat('es-MX')
const unDecimal = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/** Una cifra suelta: etiqueta arriba, valor abajo. */
function Cifra({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
      <dd className="text-lg font-semibold tabular-nums">{valor}</dd>
    </div>
  )
}

type ResumenSepOctProps = {
  resumen: ResumenSepOct
}

/** Cierre de la etapa Sept-Oct: cuánto se logró de la meta, qué tan efectivo fue el tiempo y las cifras de apoyo. */
export function ResumenSepOctPanel({ resumen }: ResumenSepOctProps) {
  return (
    <div className="flex flex-col gap-5">
      <MetricaProgreso
        etiqueta="Avance hacia la meta"
        valor={resumen.progreso}
        detalle={`${enteros.format(resumen.totalInstalados)} de ${enteros.format(resumen.metaTotal)} agentes`}
      />
      <MetricaProgreso
        etiqueta="Tiempo efectivo"
        valor={resumen.tiempoEfectivo}
        detalle={`${unDecimal.format(resumen.tiempoInvertido)} h invertidas de ${unDecimal.format(resumen.tiempoTotal)} h totales`}
      />
      <dl className="grid grid-cols-3 gap-3 border-t pt-4">
        <Cifra etiqueta="Visitas" valor={enteros.format(resumen.visitas)} />
        <Cifra etiqueta="Faltan" valor={enteros.format(resumen.faltanteMeta)} />
        <Cifra etiqueta="Tiempo muerto" valor={`${unDecimal.format(resumen.tiempoMuerto)} h`} />
      </dl>
    </div>
  )
}
