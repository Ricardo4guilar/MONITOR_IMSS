import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { TemaContext, type ValorTema } from '@/features/tema/tema-context'
import {
  guardarPaleta,
  guardarPreferencia,
  leerPaleta,
  leerPreferencia,
  resolverTema,
  type PaletaTema,
  type PreferenciaTema,
} from '@/features/tema/utils/tema'

const CONSULTA_OSCURO = '(prefers-color-scheme: dark)'

type ThemeProviderProps = {
  /** Dónde se recuerda la elección. Por defecto `localStorage`: es una preferencia, no un dato sensible. */
  almacen?: Storage
  children: ReactNode
}

export function ThemeProvider({ almacen = localStorage, children }: ThemeProviderProps) {
  const [preferencia, setPreferencia] = useState<PreferenciaTema>(() => leerPreferencia(almacen))
  const [paleta, setPaleta] = useState<PaletaTema>(() => leerPaleta(almacen))
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

  // La paleta es una capa aparte del claro/oscuro: `data-paleta="og"` reescribe solo los tokens de marca
  // (azul → verde) y funciona igual sobre `:root` y sobre `.dark`. «nw» es el valor base, no lleva atributo.
  useEffect(() => {
    if (paleta === 'nw') document.documentElement.removeAttribute('data-paleta')
    else document.documentElement.setAttribute('data-paleta', paleta)
  }, [paleta])

  const cambiar = useCallback(
    (nueva: PreferenciaTema) => {
      setPreferencia(nueva)
      guardarPreferencia(almacen, nueva)
    },
    [almacen],
  )

  const cambiarPaleta = useCallback(
    (nueva: PaletaTema) => {
      setPaleta(nueva)
      guardarPaleta(almacen, nueva)
    },
    [almacen],
  )

  const valor = useMemo<ValorTema>(
    () => ({ preferencia, tema, cambiar, paleta, cambiarPaleta }),
    [preferencia, tema, cambiar, paleta, cambiarPaleta],
  )

  return <TemaContext.Provider value={valor}>{children}</TemaContext.Provider>
}
