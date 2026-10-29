import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { CONSULTA_CONTACTOS, CONSULTA_HOSPITALES } from '@/features/directorios/hooks/useDirectorios'

/**
 * Empieza a descargar los directorios al abrir la app, no al entrar a su pantalla: la hoja de Google a veces
 * tarda varios segundos y así, cuando se llega a Directorios, los datos ya están o falta poco.
 */
export function usePrecargarDirectorios() {
  const queryClient = useQueryClient()

  useEffect(() => {
    void queryClient.prefetchQuery(CONSULTA_HOSPITALES)
    void queryClient.prefetchQuery(CONSULTA_CONTACTOS)
  }, [queryClient])
}
