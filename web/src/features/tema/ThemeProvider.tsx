import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { TemaContext, type ValorTema } from '@/features/tema/tema-context'
import { guardarPreferencia, leerPreferencia, resolverTema, type PreferenciaTema } from '@/features/tema/utils/tema'

const CONSULTA_OSCURO = '(prefers-color-scheme: dark)'

type ThemeProviderProps = {
  /** Dónde se recuerda la elección. Por defecto `localStorage`: es una preferencia, no un dato sensible. */
  almacen?: Storage
  children: ReactNode
}

export function ThemeProvider({ almacen = localStorage, children }: ThemeProviderProps) {
  const [preferencia, setPreferencia] = useState<PreferenciaTema>(() => leerPreferencia(almacen))
  const [sistemaOscuro, setSistemaOscuro] = useState(() => window.matchMedia(CONSULTA_OSCURO).matches)

  // El sistema operativo puede cambiar de tema con la app abierta (modo automático día/noche).
  useEffect(() => {
    const consulta = window.matchMedia(CONSULTA_OSCURO)
    const alCambiar = (evento: { matches: boolean }) => setSistemaOscuro(evento.matches)
    consulta.addEventListener('change', alCambiar)
    return () => consulta.removeEventListener('change', alCambiar)
  }, [])

  const tema = resolverTema(preferencia, sistemaOscuro)

  // Aplica el tema a la página entera: la clase activa los tokens `.dark` y color-scheme pinta barras de scroll y controles nativos.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', tema === 'oscuro')
    document.documentElement.style.colorScheme = tema === 'oscuro' ? 'dark' : 'light'
  }, [tema])

  const cambiar = useCallback(
    (nueva: PreferenciaTema) => {
      setPreferencia(nueva)
      guardarPreferencia(almacen, nueva)
    },
    [almacen],
  )

  const valor = useMemo<ValorTema>(() => ({ preferencia, tema, cambiar }), [preferencia, tema, cambiar])

  return <TemaContext.Provider value={valor}>{children}</TemaContext.Provider>
}
