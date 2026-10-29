import { beforeEach, describe, expect, it } from 'vitest'

import { crearAuthDesarrollo } from '@/features/auth/services/auth.desarrollo'
import { CredencialesInvalidas, SesionBloqueada } from '@/features/auth/types/auth.types'

const USUARIO = 'imss_general'
const CLAVE = 'clave-de-prueba'

/** Almacén en memoria con la misma interfaz que sessionStorage. */
function almacenEnMemoria(): Storage {
  const datos = new Map<string, string>()
  return {
    get length() {
      return datos.size
    },
    clear: () => datos.clear(),
    getItem: (clave) => datos.get(clave) ?? null,
    key: (indice) => [...datos.keys()][indice] ?? null,
    removeItem: (clave) => void datos.delete(clave),
    setItem: (clave, valor) => void datos.set(clave, valor),
  }
}

describe('auth de desarrollo', () => {
  let almacen: Storage
  let ahora: number
  const crear = () => crearAuthDesarrollo({ usuario: USUARIO, clave: CLAVE, almacen, esperaMs: 0, ahora: () => ahora })

  beforeEach(() => {
    almacen = almacenEnMemoria()
    ahora = 1_000_000
  })

  it('con las credenciales correctas abre sesión y la recuerda', async () => {
    const auth = crear()

    await expect(auth.iniciarSesion(USUARIO, CLAVE)).resolves.toEqual({ usuario: USUARIO })
    expect(auth.sesionActual()).toEqual({ usuario: USUARIO })
  })

  it('recorta los espacios del usuario', async () => {
    await expect(crear().iniciarSesion(`  ${USUARIO} `, CLAVE)).resolves.toEqual({ usuario: USUARIO })
  })

  it('con la clave equivocada rechaza y no abre sesión', async () => {
    const auth = crear()

    await expect(auth.iniciarSesion(USUARIO, 'otra')).rejects.toBeInstanceOf(CredencialesInvalidas)
    expect(auth.sesionActual()).toBeNull()
  })

  it('con usuario equivocado da el mismo error que con clave equivocada: no revela cuál falló', async () => {
    const auth = crear()

    const usuarioMal = await auth.iniciarSesion('otro', CLAVE).catch((error: Error) => error)
    const claveMal = await auth.iniciarSesion(USUARIO, 'otra').catch((error: Error) => error)

    expect(usuarioMal).toBeInstanceOf(CredencialesInvalidas)
    expect(usuarioMal).toHaveProperty('message', (claveMal as Error).message)
  })

  it('la clave distingue mayúsculas y minúsculas', async () => {
    await expect(crear().iniciarSesion(USUARIO, CLAVE.toUpperCase())).rejects.toBeInstanceOf(CredencialesInvalidas)
  })

  it('cerrar sesión la borra', async () => {
    const auth = crear()
    await auth.iniciarSesion(USUARIO, CLAVE)

    await auth.cerrarSesion()

    expect(auth.sesionActual()).toBeNull()
    expect(almacen.length).toBe(0)
  })

  it('la sesión sobrevive a recargar la página (otra instancia con el mismo almacén)', async () => {
    await crear().iniciarSesion(USUARIO, CLAVE)

    expect(crear().sesionActual()).toEqual({ usuario: USUARIO })
  })

  it('la sesión caduca a las 8 horas', async () => {
    const auth = crear()
    await auth.iniciarSesion(USUARIO, CLAVE)

    ahora += 8 * 60 * 60 * 1000 - 1
    expect(auth.sesionActual()).not.toBeNull()

    ahora += 2
    expect(auth.sesionActual()).toBeNull()
  })

  it('una sesión guardada con basura no rompe la app: se ignora', () => {
    almacen.setItem('imss.sesion', '{esto no es json')

    expect(crear().sesionActual()).toBeNull()
  })

  it('una sesión guardada de otro usuario se ignora: nadie puede ponerse una sesión a mano', () => {
    almacen.setItem('imss.sesion', JSON.stringify({ usuario: 'intruso', expiraEn: ahora + 1000 }))

    expect(crear().sesionActual()).toBeNull()
  })

  describe('bloqueo por intentos fallidos', () => {
    async function fallar(auth: ReturnType<typeof crear>, veces: number) {
      for (let i = 0; i < veces; i++) await auth.iniciarSesion(USUARIO, 'mal').catch(() => undefined)
    }

    it('tras 5 fallos seguidos bloquea, incluso con la clave correcta', async () => {
      const auth = crear()
      await fallar(auth, 5)

      await expect(auth.iniciarSesion(USUARIO, CLAVE)).rejects.toBeInstanceOf(SesionBloqueada)
    })

    it('el aviso dice cuántos segundos faltan', async () => {
      const auth = crear()
      await fallar(auth, 5)
      ahora += 10_000

      const error = await auth.iniciarSesion(USUARIO, CLAVE).catch((e: unknown) => e)

      expect(error).toBeInstanceOf(SesionBloqueada)
      expect((error as SesionBloqueada).segundos).toBe(20)
    })

    it('pasados 30 segundos deja volver a intentar', async () => {
      const auth = crear()
      await fallar(auth, 5)

      ahora += 30_000

      await expect(auth.iniciarSesion(USUARIO, CLAVE)).resolves.toEqual({ usuario: USUARIO })
    })

    it('un acierto reinicia la cuenta de fallos', async () => {
      const auth = crear()
      await fallar(auth, 4)
      await auth.iniciarSesion(USUARIO, CLAVE)
      await auth.cerrarSesion()

      await fallar(auth, 4)

      await expect(auth.iniciarSesion(USUARIO, CLAVE)).resolves.toEqual({ usuario: USUARIO })
    })
  })
})
