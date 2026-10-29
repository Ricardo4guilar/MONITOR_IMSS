import { TriangleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'

import { LogoImss } from '@/components/compartidos/LogoImss'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { buttonVariants } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { ErrorInicioSesion } from '@/features/auth/types/auth.types'
import { useAuth } from '@/features/auth/useAuth'

const MENSAJE_GENERICO = 'No se pudo completar el inicio de sesión. Intenta de nuevo.'

/**
 * A donde Cognito devuelve al usuario con `?code=…&state=…`. Esta ruta es pública (no puede exigir sesión:
 * justamente aquí se abre). Canjea el código y manda a la pantalla que se pedía.
 */
export function CallbackPage() {
  const auth = useAuth()
  const ubicacion = useLocation()
  const navegar = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const completarInicio = auth.modo === 'redireccion' ? auth.completarInicio : null

  useEffect(() => {
    if (!completarInicio) return
    let cancelado = false
    // El servicio devuelve la misma promesa si el efecto corre dos veces (StrictMode): el código se canjea una sola vez.
    const urlDeRegreso = new URL(`${ubicacion.pathname}${ubicacion.search}`, window.location.origin).toString()
    completarInicio(urlDeRegreso)
      .then((destino) => {
        if (!cancelado) void navegar(destino, { replace: true })
      })
      .catch((fallo: unknown) => {
        // Solo se muestra un mensaje conocido; cualquier otro error podría traer detalles técnicos.
        if (!cancelado) setError(fallo instanceof ErrorInicioSesion ? fallo.message : MENSAJE_GENERICO)
      })
    return () => {
      cancelado = true
    }
  }, [completarInicio, navegar, ubicacion.pathname, ubicacion.search])

  // Con el adaptador de formulario (desarrollo) esta ruta no tiene sentido.
  if (!completarInicio) return <Navigate to="/login" replace />

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-6 text-foreground">
      <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center">
        <LogoImss className="size-14" />
        {error ? (
          <>
            <Alert variant="destructive" className="text-left">
              <TriangleAlert />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Link to="/login" replace className={buttonVariants({ size: 'lg' })}>
              Volver a iniciar sesión
            </Link>
          </>
        ) : (
          <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner aria-hidden="true" />
            Completando el inicio de sesión…
          </p>
        )}
      </div>
    </main>
  )
}
