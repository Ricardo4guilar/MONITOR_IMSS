import { Navigate, Outlet, useLocation } from 'react-router'

import { useAuth } from '@/features/auth/useAuth'

/** Todo lo que cuelga de aquí exige sesión. Sin ella se va al login y, al entrar, se regresa a donde se iba. */
export function RutaProtegida() {
  const { sesion } = useAuth()
  const ubicacion = useLocation()

  if (!sesion) {
    return <Navigate to="/login" replace state={{ desde: `${ubicacion.pathname}${ubicacion.search}` }} />
  }
  return <Outlet />
}
