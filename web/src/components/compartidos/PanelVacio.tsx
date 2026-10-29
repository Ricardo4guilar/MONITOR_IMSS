import type { LucideIcon } from 'lucide-react'

import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { cn } from '@/lib/utils'

type PanelVacioProps = {
  icono: LucideIcon
  titulo: string
  descripcion?: string
  className?: string
}

/** Contenido de un panel que todavía no tiene datos, o cuyos datos no se pudieron cargar. */
export function PanelVacio({ icono: Icono, titulo, descripcion, className }: PanelVacioProps) {
  return (
    <Empty className={cn('min-h-40 border bg-muted/20', className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icono />
        </EmptyMedia>
        <EmptyTitle>{titulo}</EmptyTitle>
        {descripcion ? <EmptyDescription>{descripcion}</EmptyDescription> : null}
      </EmptyHeader>
    </Empty>
  )
}
