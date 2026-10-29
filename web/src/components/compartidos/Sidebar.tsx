import { NavLink } from 'react-router'

import { LogoImss } from '@/components/compartidos/LogoImss'
import { DESTINO_AJUSTES, DESTINOS, type Destino } from '@/components/compartidos/navegacion'
import { cn } from '@/lib/utils'

function Enlace({ ruta, etiqueta, icono: Icono }: Destino) {
  return (
    <NavLink
      to={ruta}
      className={({ isActive }) =>
        cn(
          'group flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-[0.6875rem] leading-none font-medium transition-colors outline-none',
          'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
          'focus-visible:ring-3 focus-visible:ring-sidebar-ring/50',
          isActive && 'bg-sidebar-accent text-sidebar-accent-foreground',
        )
      }
    >
      <Icono aria-hidden="true" className="size-5" />
      {etiqueta}
    </NavLink>
  )
}

/** Menú lateral de escritorio y tablet. En móvil se sustituye por la barra inferior. */
export function Sidebar() {
  return (
    <aside className="hidden w-24 shrink-0 flex-col items-center gap-8 border-r border-sidebar-border bg-sidebar px-3 py-6 md:flex">
      <div className="flex flex-col items-center gap-2">
        <LogoImss className="size-11" />
        <span className="text-[0.6875rem] font-medium tracking-wide text-sidebar-foreground">Bienestar</span>
      </div>

      <nav aria-label="Navegación principal" className="flex w-full flex-1 flex-col gap-2">
        {DESTINOS.map((destino) => (
          <Enlace key={destino.ruta} {...destino} />
        ))}
        <div className="mt-auto">
          <Enlace {...DESTINO_AJUSTES} />
        </div>
      </nav>
    </aside>
  )
}
