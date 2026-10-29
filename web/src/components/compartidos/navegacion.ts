import { Contact, LayoutDashboard, MapPin, Settings, type LucideIcon } from 'lucide-react'

export type Destino = {
  ruta: string
  etiqueta: string
  icono: LucideIcon
}

/** Pantallas de datos. Las comparten el menú lateral (escritorio) y la barra inferior (móvil). */
export const DESTINOS: readonly Destino[] = [
  { ruta: '/dashboard', etiqueta: 'Dashboard', icono: LayoutDashboard },
  { ruta: '/mapa', etiqueta: 'Mapa', icono: MapPin },
  { ruta: '/directorios', etiqueta: 'Directorios', icono: Contact },
]

export const DESTINO_AJUSTES: Destino = { ruta: '/ajustes', etiqueta: 'Ajustes', icono: Settings }
