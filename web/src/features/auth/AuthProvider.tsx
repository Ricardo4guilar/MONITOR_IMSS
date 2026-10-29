import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { AuthContext, type ValorAuth } from '@/features/auth/auth-context'
import type { ServicioAuth, Sesion } from '@/features/auth/types/auth.types'

/** Cada cuánto se revisa si la sesión caducó con la app abierta. */
const REVISION_MS = 30_000

type AuthProviderProps = {
  servicio: ServicioAuth
  children: ReactNode
}

export function AuthProvider({ servicio, children }: AuthProviderProps) {
  const [sesion, setSesion] = useState<Sesion | null>(() => servicio.sesionActual())

  // Si la sesión caduca mientras la pantalla está abierta, se cierra sola en lugar de seguir mostrando datos.
  useEffect(() => {
    const temporizador = setInterval(() => setSesion(servicio.sesionActual()), REVISION_MS)
    return () => clearInterval(temporizador)
  }, [servicio])

  // Las acciones solo dependen del servicio, no de la sesión: así su identidad no cambia al abrirse la sesión
  // y quien las usa en un efecto (la página de regreso) no lo vuelve a ejecutar.
  const cerrarSesion = useCallback(async () => {
    await servicio.cerrarSesion()
    setSesion(null)
  }, [servicio])

  const iniciarSesion = useCallback(
    async (usuario: string, clave: string) => {
      if (servicio.modo !== 'formulario') throw new Error('Este proveedor de identidad no usa formulario')
      setSesion(await servicio.iniciarSesion(usuario, clave))
    },
    [servicio],
  )

  const iniciarSesionPorRedireccion = useCallback(
    (destino: string) => {
      if (servicio.modo !== 'redireccion') return Promise.reject(new Error('Este proveedor de identidad no usa redirección'))
      return servicio.iniciarSesionPorRedireccion(destino)
    },
    [servicio],
  )

  const completarInicio = useCallback(
    async (urlDeRegreso: string) => {
      if (servicio.modo !== 'redireccion') throw new Error('Este proveedor de identidad no usa redirección')
      const resultado = await servicio.completarInicio(urlDeRegreso)
      setSesion(resultado.sesion)
      return resultado.destino
    },
    [servicio],
  )

  const valor = useMemo<ValorAuth>(
    () =>
      servicio.modo === 'formulario'
        ? { modo: 'formulario', sesion, cerrarSesion, iniciarSesion }
        : { modo: 'redireccion', sesion, cerrarSesion, iniciarSesionPorRedireccion, completarInicio },
    [servicio.modo, sesion, cerrarSesion, iniciarSesion, iniciarSesionPorRedireccion, completarInicio],
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}
