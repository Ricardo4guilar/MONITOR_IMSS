import { createContext } from 'react'

import type { PreferenciaTema, Tema } from '@/features/tema/utils/tema'

export type ValorTema = {
  /** Lo que eligió la persona: claro, oscuro o «sistema». */
  preferencia: PreferenciaTema
  /** Lo que se está pintando ahora. */
  tema: Tema
  cambiar: (preferencia: PreferenciaTema) => void
}

export const TemaContext = createContext<ValorTema | null>(null)
