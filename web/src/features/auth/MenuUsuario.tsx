import { LogOut, Settings, User } from 'lucide-react'
import { useNavigate } from 'react-router'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/features/auth/useAuth'
import { useCerrarSesion } from '@/features/auth/useCerrarSesion'
import { cn } from '@/lib/utils'

/** El avatar de siempre, ahora como menú: quién eres, Ajustes y Cerrar sesión. */
export function MenuUsuario({ className }: { className?: string }) {
  const { sesion } = useAuth()
  const cerrarSesion = useCerrarSesion()
  const navegar = useNavigate()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Cuenta de usuario"
        className={cn(
          'rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:ring-3 data-popup-open:ring-ring/30',
          className,
        )}
      >
        <Avatar>
          <AvatarFallback>
            <User aria-hidden="true" className="size-4" />
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="text-xs font-normal text-muted-foreground">Sesión iniciada como</span>
            <span className="text-sm font-medium text-foreground">{sesion?.usuario}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void navegar('/ajustes')}>
          <Settings />
          Ajustes
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={() => void cerrarSesion()}>
          <LogOut />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
