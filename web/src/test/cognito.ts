import { vi } from 'vitest'

import { crearAuthCognito } from '@/features/auth/services/auth.cognito'
import { almacenEnMemoria } from '@/test/render-ruta'

export const CONFIG_COGNITO = {
  dominio: 'https://imss-monitor.auth.us-east-1.amazoncognito.com',
  clientId: 'cliente-123',
  userPoolId: 'us-east-1_AbCdEf123',
  redirectUri: 'https://monitor.example.com/auth/callback',
  logoutUri: 'https://monitor.example.com/login',
} as const

export const EMISOR = 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_AbCdEf123'

/** Lo que Cognito pone en un ID token y que la app revisa. */
export type CargaIdToken = {
  iss: string
  aud: string
  token_use: string
  nonce: string
  sub: string
  exp: number
  email?: string
  'cognito:username'?: string
}

const aBase64Url = (texto: string) => btoa(texto).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')

/** JWT sin firma real: la app no verifica la firma (el token llega directo del endpoint por TLS), solo su contenido. */
export function crearIdToken(carga: CargaIdToken): string {
  return [aBase64Url(JSON.stringify({ alg: 'RS256', kid: 'k1' })), aBase64Url(JSON.stringify(carga)), 'firma'].join('.')
}

export type CognitoDePrueba = ReturnType<typeof crearCognitoDePrueba>

/** Adaptador de Cognito real con almacén en memoria y la redirección del navegador sustituida por un espía. */
export function crearCognitoDePrueba(ahora: () => number = Date.now) {
  const almacen = almacenEnMemoria()
  const redirigir = vi.fn<(url: string) => void>()
  const servicio = crearAuthCognito({ ...CONFIG_COGNITO, almacen, redirigir, ahora })
  return { servicio, almacen, redirigir, ahora }
}

/** Arranca el inicio de sesión y devuelve lo que el navegador presentaría al volver de Cognito. */
export async function comenzarInicio(cognito: CognitoDePrueba, destino = '/dashboard') {
  await cognito.servicio.iniciarSesionPorRedireccion(destino)
  const urlAutorizacion = new URL(String(cognito.redirigir.mock.calls.at(-1)?.[0]))
  const state = urlAutorizacion.searchParams.get('state') ?? ''
  const nonce = urlAutorizacion.searchParams.get('nonce') ?? ''
  const callback = `${CONFIG_COGNITO.redirectUri}?code=codigo-123&state=${state}`
  return { urlAutorizacion, state, nonce, callback }
}

type RespuestaDeTokens = {
  /** Claims que se sobrescriben respecto a un token válido. */
  carga?: Partial<CargaIdToken>
  /** Otro código HTTP simula que Cognito rechaza el canje. */
  estado?: number
}

/** Sustituye `fetch`: el endpoint de tokens responde lo indicado y todo lo demás sigue siendo las hojas de ejemplo. */
export function simularEndpointDeTokens(
  cognito: CognitoDePrueba,
  nonce: string,
  { carga = {}, estado = 200 }: RespuestaDeTokens = {},
) {
  const hojas = globalThis.fetch
  const fetchFalso = vi.fn((url: RequestInfo | URL, init?: RequestInit) => {
    if (String(url) !== `${CONFIG_COGNITO.dominio}/oauth2/token`) return hojas(url, init)
    if (estado !== 200) return Promise.resolve(Response.json({ error: 'invalid_grant' }, { status: estado }))

    const completa: CargaIdToken = {
      iss: EMISOR,
      aud: CONFIG_COGNITO.clientId,
      token_use: 'id',
      sub: 'sub-1',
      email: 'ana@imss.gob.mx',
      nonce,
      exp: Math.floor(cognito.ahora() / 1000) + 3600,
      ...carga,
    }
    return Promise.resolve(Response.json({ id_token: crearIdToken(completa), token_type: 'Bearer', expires_in: 3600 }))
  })
  vi.stubGlobal('fetch', fetchFalso)
  return fetchFalso
}
