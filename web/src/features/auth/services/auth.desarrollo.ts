import { z } from 'zod'

import {
  CredencialesInvalidas,
  SesionBloqueada,
  type ServicioAuthFormulario,
  type Sesion,
} from '@/features/auth/types/auth.types'

export const CLAVE_DE_ALMACEN = 'imss.sesion'
const DURACION_SESION_MS = 8 * 60 * 60 * 1000
const INTENTOS_MAXIMOS = 5
const BLOQUEO_MS = 30_000

const sesionGuardadaSchema = z.object({ usuario: z.string(), expiraEn: z.number() })

type Opciones = {
  usuario: string
  clave: string
  /** Dónde se guarda la sesión. En la app es `sessionStorage`: se pierde al cerrar la pestaña. */
  almacen: Storage
  /** Pausa artificial por intento, para que adivinar claves no sea instantáneo. */
  esperaMs?: number
  ahora?: () => number
}

/**
 * Adaptador de autenticación SOLO PARA DESARROLLO.
 *
 * Compara contra una credencial que vive en el navegador, así que NO protege nada si se publica:
 * cualquiera podría leerla en el código. Por eso la app solo lo usa con `import.meta.env.DEV`.
 * En producción lo sustituye Amazon Cognito, que valida en el servidor, con el mismo contrato.
 */
export function crearAuthDesarrollo({
  usuario: usuarioValido,
  clave: claveValida,
  almacen,
  esperaMs = 400,
  ahora = Date.now,
}: Opciones): ServicioAuthFormulario {
  // Los intentos fallidos viven en memoria: recargar la página no es una forma de reiniciarlos
  // en producción (ahí lo controla Cognito), pero en desarrollo basta para ejercitar el flujo.
  let fallos = 0
  let bloqueadoHasta = 0

  function sesionActual(): Sesion | null {
    const crudo = almacen.getItem(CLAVE_DE_ALMACEN)
    if (!crudo) return null

    try {
      const guardada = sesionGuardadaSchema.parse(JSON.parse(crudo))
      // Una sesión escrita a mano por otro usuario, o caducada, no vale.
      if (guardada.usuario !== usuarioValido || guardada.expiraEn <= ahora()) return null
      return { usuario: guardada.usuario }
    } catch {
      return null
    }
  }

  return {
    modo: 'formulario',
    sesionActual,

    async iniciarSesion(usuario, clave) {
      if (ahora() < bloqueadoHasta) {
        throw new SesionBloqueada(Math.ceil((bloqueadoHasta - ahora()) / 1000))
      }

      if (esperaMs > 0) await new Promise((resolver) => setTimeout(resolver, esperaMs))

      if (usuario.trim() !== usuarioValido || clave !== claveValida) {
        fallos += 1
        if (fallos >= INTENTOS_MAXIMOS) {
          bloqueadoHasta = ahora() + BLOQUEO_MS
          fallos = 0
        }
        throw new CredencialesInvalidas()
      }

      fallos = 0
      almacen.setItem(CLAVE_DE_ALMACEN, JSON.stringify({ usuario: usuarioValido, expiraEn: ahora() + DURACION_SESION_MS }))
      return { usuario: usuarioValido }
    },

    cerrarSesion() {
      almacen.removeItem(CLAVE_DE_ALMACEN)
      return Promise.resolve()
    },
  }
}
