import { Badge } from '@/components/ui/badge'
import { AvanceSegmentado } from '@/features/dashboard/components/AvanceSegmentado'
import { MetricaProgreso } from '@/features/dashboard/components/MetricaProgreso'
import type { ResumenNovDic } from '@/features/dashboard/types/dashboard.types'
import type { Corte } from '@/features/dashboard/utils/avance-segmentado'
import { estadoRitmo, porcentaje } from '@/features/dashboard/utils/nov-dic'

// Cortes de fecha a resaltar en la barra de tiempo. Se llenan a mano con fechas d/m/yyyy dentro del
// periodo (FechaInicio → FechaLimite). Ejemplo:
//   { fecha: '30/11/2026', etiqueta: 'Corte de noviembre' }
// Las fechas fuera del rango se ignoran. Vacío = sin cortes.
const CORTES_NOV_DIC: readonly Corte[] = [ {fecha: '31/10/2026', etiqueta: 'Corte etapa I'}]

const enteros = new Intl.NumberFormat('es-MX')


/** Una cifra suelta: etiqueta arriba, valor abajo. */
function Cifra({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
      <dd className="text-lg font-semibold tabular-nums">{valor}</dd>
    </div>
  )
}

type ResumenNovDicProps = {
  resumen: ResumenNovDic
}

/** Las tres lecturas de la etapa: cuánto falta de la meta, cuánto del tiempo pasó y si el ritmo alcanza. */
export function ResumenNovDicBarras({ resumen }: ResumenNovDicProps) {
  const ritmo = estadoRitmo(resumen)

  return (
    <div className="flex flex-col gap-5">
      <MetricaProgreso
        etiqueta="Avance hacia la meta final"
        valor={porcentaje(resumen.acumuladoHoy, resumen.metaFinal)}
        detalle={`${enteros.format(resumen.acumuladoHoy)} de ${enteros.format(resumen.metaFinal)} agentes`}
      />
      <Cifra etiqueta='Agentes restantes por instalar' valor={enteros.format(resumen.restante)}/>
      
      <AvanceSegmentado
        etiqueta="Tiempo transcurrido"
        inicio={resumen.fechaInicio}
        fin={resumen.fechaLimite}
        hoy={resumen.fechaHoy}
        cortes={CORTES_NOV_DIC}
      />
      <dl className="grid grid-cols-3 gap-3  pt-4">
        <Cifra etiqueta="Inicio de proyecto" valor={resumen.fechaInicio} />
      <Cifra etiqueta="Fin de proyecto" valor={resumen.fechaLimite} />
      <Cifra etiqueta="Día actual" valor={resumen.fechaHoy} />
      </dl>
      

      <div className="flex flex-col gap-2">
        <dt><strong>Ritmo de trabajo en Agentes/día</strong></dt>
        <dl className="grid grid-cols-3 gap-3 border-t pt-4">
        <Cifra etiqueta="Desde el incio de proyecto" valor={enteros.format(resumen.promDiarioInstalado)} />
        <Cifra etiqueta="Requerido para cumplir objetivo" valor={enteros.format(resumen.promDiarioRequerido)} />
         <Badge variant={ritmo === 'por-encima' ? 'secondary' : 'destructive'} className="w-fit">
          {ritmo === 'por-encima' ? 'Por encima del ritmo requerido' : 'Por debajo del ritmo requerido'}
        </Badge>
      </dl>
       
      </div>
    </div>
  )
}
