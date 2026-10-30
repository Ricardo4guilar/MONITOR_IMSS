import { CalendarCheck, CircleAlert, Gauge, TrendingUp } from 'lucide-react'

import { ChartLegend, type SerieLeyenda } from '@/components/compartidos/ChartLegend'
import { ChartPanel } from '@/components/compartidos/ChartPanel'
import { PanelVacio } from '@/components/compartidos/PanelVacio'
import { Skeleton } from '@/components/ui/skeleton'
import { GraficaAvance } from '@/features/dashboard/components/GraficaAvance'
import { ResumenNovDicBarras } from '@/features/dashboard/components/ResumenNovDicBarras'
import { ResumenSepOctPanel } from '@/features/dashboard/components/ResumenSepOct'
import { useDatosDashboard } from '@/features/dashboard/hooks/useDatosDashboard'

const SERIES_DE_AVANCE: readonly SerieLeyenda[] = [
  { etiqueta: 'Agentes instalados', color: 'chart-1' },
  { etiqueta: 'Meta', color: 'chart-2' },
  { etiqueta: 'Proyección', color: 'chart-3' },
]

export function DashboardPage() {
  const datos = useDatosDashboard()

  return (
    // En pantalla grande la rejilla llena el alto disponible: la gráfica toma lo que sobra y los
    // paneles de abajo miden lo que ocupa su contenido, así nada obliga a hacer scroll.
    <div className="grid gap-4 lg:h-full lg:grid-cols-2 lg:grid-rows-[minmax(0,1fr)_auto]">
      {/* La gráfica de avance es la protagonista: ancho completo y todo el alto libre. */}
      <ChartPanel
        titulo="Avance de instalación: Sep - Oct 2026"
        icono={TrendingUp}
        leyenda={<ChartLegend series={SERIES_DE_AVANCE} />}
        ocupado={datos.cargandoAvance}
        className="min-h-96 lg:col-span-2 lg:min-h-0"
      >
        {datos.cargandoAvance ? (
          <Skeleton className="min-h-72 flex-1" />
        ) : datos.avanceVacio ? (
          <PanelVacio icono={CircleAlert} titulo="No se pudo cargar el avance" descripcion="Revisa la hoja publicada." />
        ) : (
          <GraficaAvance serie={datos.serie} />
        )}
      </ChartPanel>

      {/* Orden cronológico: primero la etapa que cerró (Sept-Oct) y después la que está en curso (Nov-Dic). */}
      <ChartPanel titulo="Panorama del proyecto Septiembre-Octubre 2026" icono={CalendarCheck} ocupado={datos.cargandoSepOct}>
        {datos.cargandoSepOct ? (
          <Skeleton className="min-h-40 flex-1" />
        ) : datos.resumenSepOct ? (
          <ResumenSepOctPanel resumen={datos.resumenSepOct} />
        ) : (
          <PanelVacio icono={CircleAlert} titulo="No se pudieron cargar las métricas" descripcion="Revisa la hoja publicada." />
        )}
      </ChartPanel>

      <ChartPanel titulo="Proyecciones para Noviembre-Diciembre 2026" icono={Gauge} ocupado={datos.cargandoNovDic}>
        {datos.cargandoNovDic ? (
          <Skeleton className="min-h-40 flex-1" />
        ) : datos.resumenNovDic ? (
          <ResumenNovDicBarras resumen={datos.resumenNovDic} />
        ) : (
          <PanelVacio icono={CircleAlert} titulo="No se pudo cargar el resumen" descripcion="Revisa la hoja publicada." />
        )}
      </ChartPanel>
    </div>
  )
}
