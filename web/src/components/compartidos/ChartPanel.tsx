import { useId, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type ChartPanelProps = {
  titulo: string
  /** Icono del encabezado: ayuda a distinguir los paneles de un vistazo. */
  icono?: LucideIcon
  /** Contenido bajo el título, normalmente la leyenda de las series. */
  leyenda?: ReactNode
  /** Los datos del panel están cargando: se anuncia a lectores de pantalla. */
  ocupado?: boolean
  /** El tamaño lo decide quien lo coloca en la rejilla (alto mínimo, columnas que ocupa). */
  className?: string
  children: ReactNode
}

/** Tarjeta que enmarca una gráfica o un resumen. */
export function ChartPanel({ titulo, icono: Icono, leyenda, ocupado = false, className, children }: ChartPanelProps) {
  const idTitulo = useId()

  return (
    // min-h-0 en cada nivel: sin él, un hijo flex no se encoge por debajo de su contenido y la rejilla desborda.
    <section aria-labelledby={idTitulo} aria-busy={ocupado} role="region" className={cn('flex min-h-0', className)}>
      <Card className="min-h-0 w-full shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2.5">
            {Icono ? (
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icono aria-hidden="true" className="size-4" />
              </span>
            ) : null}
            <CardTitle>
              <h2 id={idTitulo}>{titulo}</h2>
            </CardTitle>
          </div>
          {leyenda ? <CardDescription>{leyenda}</CardDescription> : null}
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col">{children}</CardContent>
      </Card>
    </section>
  )
}
