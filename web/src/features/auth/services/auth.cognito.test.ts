import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { CLAVE_PKCE, CLAVE_SESION_COGNITO } from '@/features/auth/services/auth.cognito'
import { desafioPkce } from '@/features/auth/services/pkce'
import { ErrorInicioSesion } from '@/features/auth/types/auth.types'
import {
  CONFIG_COGNITO,
  comenzarInicio,
  crearCognitoDePrueba,
  simularEndpointDeTokens,
  type CargaIdToken,
} from '@/test/cognito'

const AHORA = Date.UTC(2026, 9, 29, 12, 0, 0)
let reloj = AHORA

const nuevo = () => crearCognitoDePrueba(() => reloj)

beforeEach(() => {
  reloj = AHORA
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

describe('adaptador de Cognito: salida hacia la página de acceso', () => {
  it('es un servicio por redirección: la app no maneja la contraseña', () => {
    expect(nuevo().servicio.modo).toBe('redireccion')
  })

  it('envía a /oauth2/authorize con código + PKCE (S256), state y nonce', async () => {
    const cognito = nuevo()

    const { urlAutorizacion: url } = await comenzarInicio(cognito)

    expect(cognito.redirigir).toHaveBeenCalledTimes(1)
    expect(`${url.origin}${url.pathname}`).toBe(`${CONFIG_COGNITO.dominio}/oauth2/authorize`)
    expect(url.searchParams.get('response_type')).toBe('code')
    expect(url.searchParams.get('client_id')).toBe(CONFIG_COGNITO.clientId)
    expect(url.searchParams.get('redirect_uri')).toBe(CONFIG_COGNITO.redirectUri)
    expect(url.searchParams.get('scope')).toBe('openid email')
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(url.searchParams.get('code_challenge')).toHaveLength(43)
    expect(url.searchParams.get('state')).toHaveLength(43)
    expect(url.searchParams.get('nonce')).toHaveLength(43)
  })

  it('el desafío de la URL corresponde al verificador guardado, que nunca viaja en la URL', async () => {
    const cognito = nuevo()

    const { urlAutorizacion: url } = await comenzarInicio(cognito)

    const guardado = z.object({ verificador: z.string() }).parse(JSON.parse(cognito.almacen.getItem(CLAVE_PKCE) ?? ''))
    expect(await desafioPkce(guardado.verificador)).toBe(url.searchParams.get('code_challenge'))
    expect(url.toString()).not.toContain(guardado.verificador)
  })

  it('cada intento usa valores nuevos', async () => {
    const cognito = nuevo()

    const primero = await comenzarInicio(cognito)
    const segundo = await comenzarInicio(cognito)

    expect(segundo.state).not.toBe(primero.state)
    expect(segundo.nonce).not.toBe(primero.nonce)
  })
})

describe('adaptador de Cognito: regreso con el código', () => {
  it('canjea el código por tokens y abre la sesión con el correo del usuario', async () => {
    const cognito = nuevo()
    const { callback, nonce } = await comenzarInicio(cognito, '/mapa?q=jal')
    const fetchFalso = simularEndpointDeTokens(cognito, nonce)

    const resultado = await cognito.servicio.completarInicio(callback)

    expect(resultado).toEqual({ sesion: { usuario: 'ana@imss.gob.mx' }, destino: '/mapa?q=jal' })
    expect(cognito.servicio.sesionActual()).toEqual({ usuario: 'ana@imss.gob.mx' })

    const llamada = fetchFalso.mock.calls.find(([url]) => String(url).endsWith('/oauth2/token'))
    expect(llamada?.[1]?.method).toBe('POST')
    const cuerpo = new URLSearchParams(String(llamada?.[1]?.body))
    expect(cuerpo.get('grant_type')).toBe('authorization_code')
    expect(cuerpo.get('code')).toBe('codigo-123')
    expect(cuerpo.get('client_id')).toBe(CONFIG_COGNITO.clientId)
    expect(cuerpo.get('redirect_uri')).toBe(CONFIG_COGNITO.redirectUri)
    const guardado = z.object({ verificador: z.string() }).safeParse(JSON.parse(cognito.almacen.getItem(CLAVE_PKCE) ?? 'null'))
    // El verificador se consume al volver: no queda guardado para reutilizarlo.
    expect(guardado.success).toBe(false)
    expect(cuerpo.get('code_verifier')).toHaveLength(64)
    // Cognito acepta clientes públicos sin secreto: nunca debe enviarse uno.
    expect(cuerpo.has('client_secret')).toBe(false)
  })

  it('si el token no trae correo usa el nombre de usuario y, en su defecto, el identificador', async () => {
    const conNombre = nuevo()
    const a = await comenzarInicio(conNombre)
    simularEndpointDeTokens(conNombre, a.nonce, { carga: { email: undefined, 'cognito:username': 'ana.perez' } })
    expect((await conNombre.servicio.completarInicio(a.callback)).sesion.usuario).toBe('ana.perez')

    const soloId = nuevo()
    const b = await comenzarInicio(soloId)
    simularEndpointDeTokens(soloId, b.nonce, { carga: { email: undefined } })
    expect((await soloId.servicio.completarInicio(b.callback)).sesion.usuario).toBe('sub-1')
  })

  it('no guarda ningún token: solo quién es y cuándo caduca', async () => {
    const cognito = nuevo()
    const { callback, nonce } = await comenzarInicio(cognito)
    simularEndpointDeTokens(cognito, nonce)

    await cognito.servicio.completarInicio(callback)

    const guardado = Array.from({ length: cognito.almacen.length }, (_, i) => cognito.almacen.getItem(cognito.almacen.key(i) ?? '') ?? '')
    expect(guardado.length).toBeGreaterThan(0)
    // Todo JWT empieza por «eyJ» (el JSON de su cabecera en base64).
    expect(guardado.some((valor) => valor.includes('eyJ'))).toBe(false)
  })

  it('rechaza un state distinto (posible CSRF) sin llegar a pedir tokens', async () => {
    const cognito = nuevo()
    const { nonce } = await comenzarInicio(cognito)
    const fetchFalso = simularEndpointDeTokens(cognito, nonce)

    await expect(
      cognito.servicio.completarInicio(`${CONFIG_COGNITO.redirectUri}?code=codigo-123&state=otro-state`),
    ).rejects.toBeInstanceOf(ErrorInicioSesion)

    expect(fetchFalso.mock.calls.some(([url]) => String(url).endsWith('/oauth2/token'))).toBe(false)
    expect(cognito.servicio.sesionActual()).toBeNull()
  })

  it('rechaza un regreso que no empezó en esta pestaña (no hay inicio en curso)', async () => {
    const cognito = nuevo()
    simularEndpointDeTokens(cognito, 'x')

    await expect(
      cognito.servicio.completarInicio(`${CONFIG_COGNITO.redirectUri}?code=codigo-123&state=cualquiera`),
    ).rejects.toBeInstanceOf(ErrorInicioSesion)
  })

  it('un inicio abandonado más de 10 minutos ya no vale', async () => {
    const cognito = nuevo()
    const { callback, nonce } = await comenzarInicio(cognito)
    simularEndpointDeTokens(cognito, nonce)
    reloj += 10 * 60 * 1000 + 1

    await expect(cognito.servicio.completarInicio(callback)).rejects.toBeInstanceOf(ErrorInicioSesion)
  })

  it('si Cognito vuelve con un error (por ejemplo, acceso denegado) no abre sesión', async () => {
    const cognito = nuevo()
    await comenzarInicio(cognito)

    await expect(
      cognito.servicio.completarInicio(`${CONFIG_COGNITO.redirectUri}?error=access_denied&error_description=lo+que+sea`),
    ).rejects.toBeInstanceOf(ErrorInicioSesion)

    expect(cognito.servicio.sesionActual()).toBeNull()
  })

  it('un regreso sin código no sirve', async () => {
    const cognito = nuevo()
    const { state } = await comenzarInicio(cognito)

    await expect(cognito.servicio.completarInicio(`${CONFIG_COGNITO.redirectUri}?state=${state}`)).rejects.toBeInstanceOf(
      ErrorInicioSesion,
    )
  })

  it('si Cognito rechaza el canje del código (HTTP 400) no abre sesión', async () => {
    const cognito = nuevo()
    const { callback, nonce } = await comenzarInicio(cognito)
    simularEndpointDeTokens(cognito, nonce, { estado: 400 })

    await expect(cognito.servicio.completarInicio(callback)).rejects.toBeInstanceOf(ErrorInicioSesion)

    expect(cognito.servicio.sesionActual()).toBeNull()
  })

  it('el mismo regreso procesado dos veces (StrictMode) canjea el código una sola vez', async () => {
    const cognito = nuevo()
    const { callback, nonce } = await comenzarInicio(cognito)
    const fetchFalso = simularEndpointDeTokens(cognito, nonce)

    const [a, b] = await Promise.all([cognito.servicio.completarInicio(callback), cognito.servicio.completarInicio(callback)])

    expect(a).toEqual(b)
    expect(fetchFalso.mock.calls.filter(([url]) => String(url).endsWith('/oauth2/token'))).toHaveLength(1)
  })

  const tokensInvalidos: [string, Partial<CargaIdToken>][] = [
    ['de otro emisor', { iss: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_OtroPool' }],
    ['para otro cliente', { aud: 'otro-cliente' }],
    ['que no es un ID token', { token_use: 'access' }],
    ['con otro nonce (repetición)', { nonce: 'otro-nonce' }],
    ['ya caducado', { exp: Math.floor(AHORA / 1000) - 1 }],
  ]

  it.each(tokensInvalidos)('rechaza un ID token %s', async (_motivo, carga) => {
    const cognito = nuevo()
    const { callback, nonce } = await comenzarInicio(cognito)
    simularEndpointDeTokens(cognito, nonce, { carga })

    await expect(cognito.servicio.completarInicio(callback)).rejects.toBeInstanceOf(ErrorInicioSesion)

    expect(cognito.servicio.sesionActual()).toBeNull()
  })

  it('un ID token mal formado no abre sesión', async () => {
    const cognito = nuevo()
    const { callback } = await comenzarInicio(cognito)
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(Response.json({ id_token: 'esto-no-es-un-jwt' }))),
    )

    await expect(cognito.servicio.completarInicio(callback)).rejects.toBeInstanceOf(ErrorInicioSesion)
  })

  it('el mensaje de error no revela detalles internos', async () => {
    const cognito = nuevo()
    await comenzarInicio(cognito)

    const error = await cognito.servicio
      .completarInicio(`${CONFIG_COGNITO.redirectUri}?error=server_error&error_description=detalle+interno`)
      .catch((fallo: unknown) => fallo)

    expect(error).toBeInstanceOf(ErrorInicioSesion)
    expect(error instanceof Error && error.message).toBe('No se pudo completar el inicio de sesión. Intenta de nuevo.')
  })
})

describe('adaptador de Cognito: sesión', () => {
  it('sin haber entrado no hay sesión', () => {
    expect(nuevo().servicio.sesionActual()).toBeNull()
  })

  it('la sesión caduca cuando caduca el ID token', async () => {
    const cognito = nuevo()
    const { callback, nonce } = await comenzarInicio(cognito)
    simularEndpointDeTokens(cognito, nonce)
    await cognito.servicio.completarInicio(callback)

    reloj += 3600 * 1000 - 1000
    expect(cognito.servicio.sesionActual()).not.toBeNull()

    reloj += 2000
    expect(cognito.servicio.sesionActual()).toBeNull()
  })

  it('un valor corrupto en el almacén se trata como «sin sesión»', () => {
    const cognito = nuevo()
    cognito.almacen.setItem(CLAVE_SESION_COGNITO, 'no es json')
    expect(cognito.servicio.sesionActual()).toBeNull()

    cognito.almacen.setItem(CLAVE_SESION_COGNITO, JSON.stringify({ usuario: 7 }))
    expect(cognito.servicio.sesionActual()).toBeNull()
  })
})

describe('adaptador de Cognito: cerrar sesión', () => {
  it('borra la sesión local y también cierra la de Cognito, para que no se pueda volver a entrar sin credenciales', async () => {
    const cognito = nuevo()
    const { callback, nonce } = await comenzarInicio(cognito)
    simularEndpointDeTokens(cognito, nonce)
    await cognito.servicio.completarInicio(callback)

    await cognito.servicio.cerrarSesion()

    expect(cognito.servicio.sesionActual()).toBeNull()
    const destino = new URL(String(cognito.redirigir.mock.calls.at(-1)?.[0]))
    expect(`${destino.origin}${destino.pathname}`).toBe(`${CONFIG_COGNITO.dominio}/logout`)
    expect(destino.searchParams.get('client_id')).toBe(CONFIG_COGNITO.clientId)
    expect(destino.searchParams.get('logout_uri')).toBe(CONFIG_COGNITO.logoutUri)
  })
})
