import { useQueryClient } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Refresca los datos de toda la app: invalida y vuelve a pedir todas las consultas activas
 * (dashboard, mapa, directorios). Útil porque las hojas tienen 5 min de caché y no se refrescan
 * al enfocar la ventana. Mientras recarga, el icono gira y el botón queda deshabilitado.
 */
export function BotonRefrescar({ className }: { className?: string }) {
  const queryClient = useQueryClient()
  const [refrescando, setRefrescando] = useState(false)

  async function refrescar() {
    setRefrescando(true)
    try {
      await queryClient.invalidateQueries()
    } finally {
      setRefrescando(false)
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Actualizar datos"
      title="Actualizar datos"
      disabled={refrescando}
      onClick={() => void refrescar()}
      className={className}
    >
      <RefreshCw aria-hidden="true" className={cn(refrescando && 'animate-spin')} />
    </Button>
  )
}
