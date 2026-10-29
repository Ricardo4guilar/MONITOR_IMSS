import { deBase64Url } from '@/features/auth/services/base64url'
import { desafioPkce, generarAleatorio } from '@/features/auth/services/pkce'
import {
  cargaIdTokenSchema,
  inicioPendienteSchema,
  respuestaTokensSchema,
  sesionCognitoSchema,
} from '@/features/auth/schemas/cognito.schemas'
import { ErrorInicioSesion, type ServicioAuthRedireccion, type Sesion } from '@/features/auth/types/auth.types'
import { rutaInterna } from '@/features/auth/utils/ruta-interna'
import { enviarFormulario } from '@/lib/http-client'

export const CLAVE_PKCE = 'imss.cognito.inicio'
export const CLAVE_SESION_COGNITO = 'imss.cognito.sesion'
/** Lo que se puede tardar entre salir hacia Cognito y volver. Pasado esto, el inicio ya no vale. */
const VIGENCIA_INICIO_MS = 10 * 60 * 1000

type Opciones = {
  /** Dominio de la página de acceso, con https y sin barra final: `https://xxx.auth.us-east-1.amazoncognito.com`. */
  dominio: string
  clientId: string
  /** Identificador del grupo de usuarios (`us-east-1_AbCdEf123`): de aquí salen la región y el emisor esperado. */
  userPoolId: string
  /** Debe estar registrada tal cual en el cliente de Cognito (esquema, host, ruta y barra final). */
  redirectUri: string
  /** A dónde manda Cognito tras cerrar su propia sesión. También debe estar registrada. */
  logoutUri: string
  /** `sessionStorage`: se pierde al cerrar la pestaña, y cada pestaña tiene su propio inicio en curso. */
  almacen: Storage
  /** En la app es `window.location.assign`; en las pruebas, un espía. */
  redirigir: (url: string) => void
  ahora?: () => number
}

/**
 * Adaptador de Amazon Cognito: Código de autorización + PKCE contra la página de acceso administrada.
 *
 * - La app nunca ve la contraseña ni el MFA: los resuelve Cognito.
 * - Es un cliente público (sin secreto). PKCE hace que un código interceptado no sirva sin el verificador.
 * - `state` protege contra CSRF y `nonce` contra la repetición de un ID token ajeno.
 * - Solo se guarda quién es el usuario y cuándo caduca. Ningún token se persiste, así un XSS no se lleva credenciales.
 *   Al caducar el ID token hay que volver a entrar (Cognito reconoce su propia cookie y suele ser inmediato).
 */
export function crearAuthCognito({
  dominio,
  clientId,
  userPoolId,
  redirectUri,
  logoutUri,
  almacen,
  redirigir,
  ahora = Date.now,
}: Opciones): ServicioAuthRedireccion {
  const region = userPoolId.split('_')[0] ?? ''
  const emisorEsperado = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`
  // Un mismo regreso procesado dos veces (React StrictMode monta los efectos dos veces) no debe gastar el código dos veces.
  const regresosEnCurso = new Map<string, Promise<{ sesion: Sesion; destino: string }>>()

  function leerInicioPendiente() {
    const crudo = almacen.getItem(CLAVE_PKCE)
    if (!crudo) return null
    try {
      return inicioPendienteSchema.parse(JSON.parse(crudo))
    } catch {
      return null
    }
  }

  function sesionActual(): Sesion | null {
    const crudo = almacen.getItem(CLAVE_SESION_COGNITO)
    if (!crudo) return null
    try {
      const guardada = sesionCognitoSchema.parse(JSON.parse(crudo))
      return guardada.expiraEn > ahora() ? { usuario: guardada.usuario } : null
    } catch {
      return null
    }
  }

  async function procesarRegreso(urlDeRegreso: string): Promise<{ sesion: Sesion; destino: string }> {
    const parametros = new URL(urlDeRegreso).searchParams

    // Cognito puede volver con un error (acceso denegado, etc.). Se registra solo el código, no la descripción.
    const errorDeCognito = parametros.get('error')
    if (errorDeCognito) throw new Error(`Cognito respondió «${errorDeCognito}»`)

    const pendiente = leerInicioPendiente()
    if (!pendiente) throw new Error('no hay un inicio de sesión en curso en esta pestaña')
    if (ahora() - pendiente.creadoEn > VIGENCIA_INICIO_MS) {
      almacen.removeItem(CLAVE_PKCE)
      throw new Error('el inicio de sesión tardó demasiado')
    }
    if (parametros.get('state') !== pendiente.state) throw new Error('el state no coincide')

    const codigo = parametros.get('code')
    if (!codigo) throw new Error('falta el código')

    // El inicio es de un solo uso: se consume antes de canjear, haya éxito o no.
    almacen.removeItem(CLAVE_PKCE)

    const tokens = respuestaTokensSchema.parse(
      await enviarFormulario(`${dominio}/oauth2/token`, {
        grant_type: 'authorization_code',
        code: codigo,
        client_id: clientId,
        redirect_uri: redirectUri,
        code_verifier: pendiente.verificador,
      }),
    )

    // La firma no se verifica aquí: el token llegó directo del endpoint de Cognito por TLS, no de una URL.
    // Lo que sí se comprueba es que sea para este pool, este cliente, este inicio y que no haya caducado.
    // Quien proteja datos (el API) sí debe verificar la firma del token contra las llaves públicas de Cognito.
    const partes = tokens.id_token.split('.')
    if (partes.length !== 3 || !partes[1]) throw new Error('el ID token no tiene forma de JWT')
    const carga = cargaIdTokenSchema.parse(JSON.parse(deBase64Url(partes[1])))

    if (carga.iss !== emisorEsperado) throw new Error('el emisor del token no es este pool')
    if (carga.aud !== clientId) throw new Error('el token es de otro cliente')
    if (carga.nonce !== pendiente.nonce) throw new Error('el nonce no coincide')
    const expiraEn = carga.exp * 1000
    if (expiraEn <= ahora()) throw new Error('el token ya caducó')

    const sesion: Sesion = { usuario: carga.email ?? carga['cognito:username'] ?? carga.sub }
    almacen.setItem(CLAVE_SESION_COGNITO, JSON.stringify({ usuario: sesion.usuario, expiraEn }))
    return { sesion, destino: rutaInterna(pendiente.destino) }
  }

  return {
    modo: 'redireccion',
    sesionActual,

    async iniciarSesionPorRedireccion(destino) {
      const verificador = generarAleatorio(48)
      const state = generarAleatorio()
      const nonce = generarAleatorio()

      almacen.setItem(
        CLAVE_PKCE,
        JSON.stringify({ state, nonce, verificador, destino: rutaInterna(destino), creadoEn: ahora() }),
      )

      const url = new URL(`${dominio}/oauth2/authorize`)
      url.search = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: 'openid email',
        code_challenge: await desafioPkce(verificador),
        code_challenge_method: 'S256',
        state,
        nonce,
      }).toString()
      redirigir(url.toString())
    },

    completarInicio(urlDeRegreso) {
      const enCurso = regresosEnCurso.get(urlDeRegreso)
      if (enCurso) return enCurso

      const intento = procesarRegreso(urlDeRegreso).catch((fallo: unknown) => {
        const motivo = fallo instanceof Error ? fallo.message : 'error desconocido'
        console.warn(`Inicio de sesión rechazado: ${motivo}`)
        throw new ErrorInicioSesion()
      })
      regresosEnCurso.set(urlDeRegreso, intento)
      return intento
    },

    cerrarSesion() {
      almacen.removeItem(CLAVE_SESION_COGNITO)
      almacen.removeItem(CLAVE_PKCE)
      // También se cierra la sesión del lado de Cognito: si no, «Iniciar sesión» volvería a entrar sin pedir nada.
      redirigir(`${dominio}/logout?${new URLSearchParams({ client_id: clientId, logout_uri: logoutUri }).toString()}`)
      return Promise.resolve()
    },
  }
}
