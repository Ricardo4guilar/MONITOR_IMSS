import { AuthNoConfigurada, type ServicioAuth } from '@/features/auth/types/auth.types'
import { crearAuthCognito } from '@/features/auth/services/auth.cognito'
import { crearAuthDesarrollo } from '@/features/auth/services/auth.desarrollo'
import { env } from '@/lib/env'

/** Sin proveedor de identidad: nadie puede entrar. Es el estado correcto de un despliegue sin Cognito configurado. */
const authNoConfigurada: ServicioAuth = {
  modo: 'formulario',
  sesionActual: () => null,
  cerrarSesion: () => Promise.resolve(),
  iniciarSesion: () => Promise.reject(new AuthNoConfigurada()),
}

/** Acepta el dominio con o sin `https://` y sin barra final, como suele copiarse de la consola de AWS. */
function normalizarDominio(dominio: string): string {
  const conEsquema = /^https?:\/\//i.test(dominio) ? dominio : `https://${dominio}`
  return conEsquema.replace(/\/+$/, '')
}

/**
 * Elige el proveedor de identidad:
 * 1. Cognito, si están definidas sus tres variables (es lo que se usa al desplegar en AWS).
 * 2. El de desarrollo, solo en `vite dev` y con credencial definida en `.env.local`.
 * 3. Ninguno: nadie entra.
 */
export function crearServicioAuth(): ServicioAuth {
  const { VITE_COGNITO_DOMINIO: dominio, VITE_COGNITO_CLIENT_ID: clientId, VITE_COGNITO_USER_POOL_ID: userPoolId } = env
  if (dominio && clientId && userPoolId) {
    const origen = window.location.origin
    return crearAuthCognito({
      dominio: normalizarDominio(dominio),
      clientId,
      userPoolId,
      // Deben coincidir exactamente con las URLs registradas en el cliente de Cognito.
      redirectUri: `${origen}/auth/callback`,
      logoutUri: `${origen}/login`,
      almacen: sessionStorage,
      redirigir: (url) => window.location.assign(url),
    })
  }

  if (import.meta.env.DEV && env.VITE_DEV_USUARIO && env.VITE_DEV_CLAVE) {
    return crearAuthDesarrollo({ usuario: env.VITE_DEV_USUARIO, clave: env.VITE_DEV_CLAVE, almacen: sessionStorage })
  }
  return authNoConfigurada
}
