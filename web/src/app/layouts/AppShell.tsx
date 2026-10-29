import { Outlet, useMatches } from 'react-router'

import { esRouteHandle } from '@/app/router/route-handle'
import { NavegacionMovil } from '@/components/compartidos/NavegacionMovil'
import { Sidebar } from '@/components/compartidos/Sidebar'
import { Topbar } from '@/components/compartidos/Topbar'
import { usePrecargarDirectorios } from '@/features/directorios/hooks/usePrecargarDirectorios'
import { useEstadosMapa } from '@/features/mapa/hooks/useEstadosMapa'

export function AppShell() {
  // La ruta más profunda manda: si una subruta no declara handle, se hereda el del padre.
  const handle = useMatches()
    .map((coincidencia) => coincidencia.handle)
    .filter(esRouteHandle)
    .at(-1)
  const { regiones } = useEstadosMapa()
  usePrecargarDirectorios()

  return (
    // Móvil: columna (barra superior, contenido, barra inferior). Desde tablet: menú lateral a la izquierda.
    <div className="flex h-dvh flex-col bg-background text-foreground md:flex-row">
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Topbar
          titulo={handle?.titulo ?? 'IMSS Bienestar'}
          subtitulo={handle?.subtitulo ?? ''}
          regiones={regiones}
          placeholderBusqueda={handle?.busqueda}
          buscador={handle?.buscador}
          filtroRegion={handle?.filtroRegion}
        />
        <main className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
        <NavegacionMovil />
      </div>
    </div>
  )
}
