import { useContext } from 'react'

import { TemaContext, type ValorTema } from '@/features/tema/tema-context'

export function useTema(): ValorTema {
  const valor = useContext(TemaContext)
  if (!valor) throw new Error('useTema debe usarse dentro de <ThemeProvider>')
  return valor
}
