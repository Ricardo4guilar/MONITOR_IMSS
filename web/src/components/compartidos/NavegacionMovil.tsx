import { NavLink } from 'react-router'

import { DESTINO_AJUSTES, DESTINOS } from '@/components/compartidos/navegacion'
import { cn } from '@/lib/utils'

/** Barra inferior para móvil: el pulgar la alcanza y no tapa el contenido (ocupa su propio espacio). */
export function NavegacionMovil() {
  return (
    <nav
      aria-label="Navegación móvil"
      className="grid shrink-0 grid-cols-4 gap-1 border-t border-sidebar-border bg-sidebar px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden"
    >
      {[...DESTINOS, DESTINO_AJUSTES].map(({ ruta, etiqueta, icono: Icono }) => (
        <NavLink
          key={ruta}
          to={ruta}
          className={({ isActive }) =>
            cn(
              'flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[0.6875rem] leading-none font-medium transition-colors outline-none',
              'text-sidebar-foreground focus-visible:ring-3 focus-visible:ring-sidebar-ring/50',
              isActive && 'bg-sidebar-accent text-sidebar-accent-foreground',
            )
          }
        >
          <Icono aria-hidden="true" className="size-5" />
          {etiqueta}
        </NavLink>
      ))}
    </nav>
  )
}
