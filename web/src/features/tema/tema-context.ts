import { createContext } from 'react'

import type { PaletaTema, PreferenciaTema, Tema } from '@/features/tema/utils/tema'

export type ValorTema = {
  /** Lo que eligió la persona: claro, oscuro o «sistema». */
  preferencia: PreferenciaTema
  /** Lo que se está pintando ahora. */
  tema: Tema
  cambiar: (preferencia: PreferenciaTema) => void
  /** Paleta de marca elegida: «nw» (azul) u «og» (verde). */
  paleta: PaletaTema
  cambiarPaleta: (paleta: PaletaTema) => void
}

export const TemaContext = createContext<ValorTema | null>(null)
