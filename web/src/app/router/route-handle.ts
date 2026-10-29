/** Metadatos que cada ruta declara en su `handle` y que el layout muestra en la barra superior. */
export type RouteHandle = {
  titulo: string
  subtitulo: string
  /** Texto del buscador de la barra superior. */
  busqueda?: string
  /** Si la pantalla usa el buscador de la barra superior. Por defecto sí. */
  buscador?: boolean
  /** Si la pantalla usa el filtro de región de la barra superior. Por defecto sí. */
  filtroRegion?: boolean
}

const esTextoOpcional = (valor: unknown) => valor === undefined || typeof valor === 'string'
const esBooleanoOpcional = (valor: unknown) => valor === undefined || typeof valor === 'boolean'

/** React Router entrega `handle` como `unknown`: se valida antes de usarlo. */
export function esRouteHandle(valor: unknown): valor is RouteHandle {
  if (typeof valor !== 'object' || valor === null) return false
  if (!('titulo' in valor) || typeof valor.titulo !== 'string') return false
  if (!('subtitulo' in valor) || typeof valor.subtitulo !== 'string') return false
  if ('busqueda' in valor && !esTextoOpcional(valor.busqueda)) return false
  if ('buscador' in valor && !esBooleanoOpcional(valor.buscador)) return false
  if ('filtroRegion' in valor && !esBooleanoOpcional(valor.filtroRegion)) return false
  return true
}
