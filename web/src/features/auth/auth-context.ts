import { createContext } from 'react'

import type { Sesion } from '@/features/auth/types/auth.types'

type ValorAuthComun = {
  /** `null` si nadie ha iniciado sesión. */
  sesion: Sesion | null
  cerrarSesion: () => Promise<void>
}

/** Lo que las pantallas pueden hacer depende de cómo entra la gente: con formulario propio o por redirección. */
export type ValorAuth =
  | (ValorAuthComun & {
      modo: 'formulario'
      iniciarSesion: (usuario: string, clave: string) => Promise<void>
    })
  | (ValorAuthComun & {
      modo: 'redireccion'
      iniciarSesionPorRedireccion: (destino: string) => Promise<void>
      /** Procesa el regreso del proveedor y devuelve la ruta interna a la que ir. */
      completarInicio: (urlDeRegreso: string) => Promise<string>
    })

export const AuthContext = createContext<ValorAuth | null>(null)
