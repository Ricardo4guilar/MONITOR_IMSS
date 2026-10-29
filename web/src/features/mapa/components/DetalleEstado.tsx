import { ArrowLeft, Bot, Hospital, MapPin, Monitor, Wrench, type LucideIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import type { EstadoMapa, Metricas } from '@/features/mapa/types/mapa.types'

const METRICAS: readonly { clave: keyof Metricas; etiqueta: string; icono: LucideIcon }[] = [
  { clave: 'hospitales', etiqueta: 'Hospitales identificados', icono: Hospital },
  { clave: 'servicios', etiqueta: 'Servicios realizados', icono: Wrench },
  { clave: 'agentes', etiqueta: 'Agentes instalados', icono: Bot },
  { clave: 'equipos', etiqueta: 'Equipos inventariados', icono: Monitor },
]

const formatoNumero = new Intl.NumberFormat('es-MX')

type DetalleEstadoProps = {
  estado: EstadoMapa | null
  /** Color CSS de la región del estado, para su abreviatura. */
  color: string
  onVolver: () => void
}

export function DetalleEstado({ estado, color, onVolver }: DetalleEstadoProps) {
  return (
    <aside aria-label="Detalle del estado" className="flex">
      <Card className="w-full">
        {estado ? (
          <>
            <CardHeader>
              <Button variant="ghost" size="xs" className="w-fit" onClick={onVolver}>
                <ArrowLeft data-icon="inline-start" />
                Volver al mapa
              </Button>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span
                  className="flex size-12 shrink-0 items-center justify-center rounded-lg text-sm font-semibold text-on-region"
                  style={{ background: color }}
                >
                  {estado.abbr}
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-semibold">{estado.name}</h2>
                  <p className="truncate text-sm text-muted-foreground">{estado.region}</p>
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Capital</dt>
                  <dd>{estado.capital}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Región</dt>
                  <dd>{estado.region}</dd>
                </div>
                {METRICAS.map(({ clave, etiqueta, icono: Icono }) => (
                  <div key={clave} className="flex flex-col gap-1 rounded-lg bg-muted/40 p-3">
                    <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Icono aria-hidden="true" className="size-3.5 shrink-0" />
                      {etiqueta}
                    </dt>
                    <dd className="text-xl font-semibold tabular-nums">
                      {formatoNumero.format(estado.metricas[clave])}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </>
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <MapPin />
              </EmptyMedia>
              <EmptyTitle>Selecciona un estado</EmptyTitle>
              <EmptyDescription>
                Pasa el cursor para resaltar la entidad y selecciona para consultar su información.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </Card>
    </aside>
  )
}
