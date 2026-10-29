import type { ReactNode } from 'react'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useEsEscritorio } from '@/hooks/useEsEscritorio'

type PanelDetalleProps = {
  /** Hay algo elegido que mostrar. Solo afecta a pantallas pequeñas. */
  abierto: boolean
  onCerrar: () => void
  /** Nombre accesible del panel inferior. */
  titulo: string
  children: ReactNode
}

/**
 * Pantalla grande: el detalle va en su columna, sin más.
 * Pantalla pequeña: no cabe al lado, y debajo de una tabla larga sería inalcanzable, así que
 * se abre como panel inferior al elegir un registro y se cierra con Escape, tocando fuera o la X.
 */
export function PanelDetalle({ abierto, onCerrar, titulo, children }: PanelDetalleProps) {
  const escritorio = useEsEscritorio()
  if (escritorio) return <>{children}</>

  return (
    <Sheet open={abierto} onOpenChange={(nuevo) => !nuevo && onCerrar()}>
      <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto">
        <SheetHeader className="sr-only">
          <SheetTitle>{titulo}</SheetTitle>
        </SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  )
}
