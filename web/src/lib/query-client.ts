import { QueryClient } from '@tanstack/react-query'

/**
 * Los servicios de datos ya prueban varias fuentes y nunca lanzan, así que reintentar
 * la consulta completa solo retrasaría la copia local. Las hojas casi no cambian: 5 min de caché.
 */
export function crearQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 5 * 60_000, refetchOnWindowFocus: false },
    },
  })
}
