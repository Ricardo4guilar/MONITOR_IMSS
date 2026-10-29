import { useSyncExternalStore } from 'react'

const CONSULTA_ESCRITORIO = '(min-width: 1024px)'

function suscribirse(avisar: () => void): () => void {
  const consulta = window.matchMedia(CONSULTA_ESCRITORIO)
  consulta.addEventListener('change', avisar)
  return () => consulta.removeEventListener('change', avisar)
}

/** `true` desde el ancho en que las pantallas ponen el detalle al lado (el `lg` de Tailwind, 1024 px). */
export function useEsEscritorio(): boolean {
  return useSyncExternalStore(
    suscribirse,
    () => window.matchMedia(CONSULTA_ESCRITORIO).matches,
    () => true,
  )
}
