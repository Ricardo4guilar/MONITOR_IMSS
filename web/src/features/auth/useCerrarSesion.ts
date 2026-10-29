import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

import { useAuth } from '@/features/auth/useAuth'

/**
 * Cierra la sesión y borra de la memoria todo lo que se descargó mientras estuvo abierta
 * (directorios con teléfonos y correos incluidos): quien entre después en el mismo navegador no debe verlo.
 * El redirect al login lo hace `RutaProtegida` en cuanto la sesión desaparece.
 */
export function useCerrarSesion() {
  const { cerrarSesion } = useAuth()
  const queryClient = useQueryClient()

  return useCallback(async () => {
    await cerrarSesion()
    queryClient.clear()
  }, [cerrarSesion, queryClient])
}
