import { Minus, Plus, RotateCcw, Scan } from 'lucide-react'

import { Button } from '@/components/ui/button'

type ZoomControlsProps = {
  /** 1 = 100 %. */
  factor: number
  puedeAcercar: boolean
  puedeAlejar: boolean
  onAcercar: () => void
  onAlejar: () => void
  onTamanoReal: () => void
  /** Limpia selección, filtros de la leyenda, búsqueda, región y zoom. */
  onRestablecer: () => void
}

export function ZoomControls({
  factor,
  puedeAcercar,
  puedeAlejar,
  onAcercar,
  onAlejar,
  onTamanoReal,
  onRestablecer,
}: ZoomControlsProps) {
  return (
    <div
      role="group"
      aria-label="Controles de zoom del mapa"
      className="absolute top-4 right-4 flex items-center gap-1 rounded-lg bg-popover/90 p-1 ring-1 ring-foreground/10"
    >
      <Button variant="ghost" size="icon" aria-label="Acercar" disabled={!puedeAcercar} onClick={onAcercar}>
        <Plus />
      </Button>
      <Button variant="ghost" size="icon" aria-label="Alejar" disabled={!puedeAlejar} onClick={onAlejar}>
        <Minus />
      </Button>
      <Button variant="ghost" size="icon" aria-label="Tamaño real" onClick={onTamanoReal}>
        <Scan />
      </Button>
      <Button variant="ghost" size="icon" aria-label="Restablecer vista" onClick={onRestablecer}>
        <RotateCcw />
      </Button>
      <output aria-live="polite" className="min-w-12 pr-2 text-right text-xs text-muted-foreground tabular-nums">
        {Math.round(factor * 100)}%
      </output>
    </div>
  )
}
