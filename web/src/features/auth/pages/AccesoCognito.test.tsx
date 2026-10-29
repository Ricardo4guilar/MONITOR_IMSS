import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import {
  ErrorInicioSesion,
  type ServicioAuth,
  type ServicioAuthRedireccion,
  type Sesion,
} from '@/features/auth/types/auth.types'
import { renderRuta } from '@/test/render-ruta'

const titulo = (nombre: string) => screen.getByRole('heading', { level: 1, name: nombre })

type Opciones = {
  /** Ruta a la que `completarInicio` manda al terminar. */
  destino?: string
  /** El canje del código falla. */
  falla?: boolean
  /** `iniciarSesionPorRedireccion` queda esperando (como mientras el navegador sale hacia Cognito). */
  salidaLenta?: boolean
}

/** Proveedor por redirección de mentira: lo que importa aquí es qué hace la pantalla con él. */
function crearAuthRedireccion({ destino = '/dashboard', falla = false, salidaLenta = false }: Opciones = {}) {
  let sesion: Sesion | null = null
  const iniciarSesionPorRedireccion = vi.fn<ServicioAuthRedireccion['iniciarSesionPorRedireccion']>(() =>
    salidaLenta ? new Promise<void>(() => {}) : Promise.resolve(),
  )
  const completarInicio = vi.fn<ServicioAuthRedireccion['completarInicio']>(() => {
    if (falla) return Promise.reject(new ErrorInicioSesion())
    sesion = { usuario: 'ana@imss.gob.mx' }
    return Promise.resolve({ sesion, destino })
  })
  const cerrarSesion = vi.fn(() => {
    sesion = null
    return Promise.resolve()
  })
  const servicio: ServicioAuth = {
    modo: 'redireccion',
    sesionActual: () => sesion,
    cerrarSesion,
    iniciarSesionPorRedireccion,
    completarInicio,
  }
  return { servicio, iniciarSesionPorRedireccion, completarInicio, cerrarSesion }
}

describe('acceso por redirección (Cognito)', () => {
  it('la pantalla de acceso no pide usuario ni contraseña: eso lo hace Cognito', () => {
    const { servicio } = crearAuthRedireccion()
    renderRuta('/login', { auth: servicio })

    expect(titulo('Iniciar sesión')).toBeInTheDocument()
    expect(screen.queryByLabelText('Usuario')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Contraseña')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeInTheDocument()
  })

  it('«Continuar» sale hacia el proveedor y vuelve al dashboard por defecto', async () => {
    const { servicio, iniciarSesionPorRedireccion } = crearAuthRedireccion()
    renderRuta('/login', { auth: servicio })

    await userEvent.setup().click(screen.getByRole('button', { name: 'Continuar' }))

    expect(iniciarSesionPorRedireccion).toHaveBeenCalledWith('/dashboard')
  })

  it('recuerda a qué pantalla se iba para volver ahí después de entrar', async () => {
    const { servicio, iniciarSesionPorRedireccion } = crearAuthRedireccion()
    renderRuta('/directorios?vista=contactos', { auth: servicio })

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Continuar' }))

    expect(iniciarSesionPorRedireccion).toHaveBeenCalledWith('/directorios?vista=contactos')
  })

  it('mientras sale hacia el proveedor el botón queda ocupado, para no lanzar dos inicios', async () => {
    const { servicio, iniciarSesionPorRedireccion } = crearAuthRedireccion({ salidaLenta: true })
    renderRuta('/login', { auth: servicio })
    const persona = userEvent.setup()

    await persona.click(screen.getByRole('button', { name: 'Continuar' }))

    const boton = await screen.findByRole('button', { name: /Redirigiendo/ })
    expect(boton).toBeDisabled()
    await persona.click(boton)
    expect(iniciarSesionPorRedireccion).toHaveBeenCalledTimes(1)
  })

  it('si no se puede salir hacia el proveedor, avisa con un mensaje genérico', async () => {
    const { servicio, iniciarSesionPorRedireccion } = crearAuthRedireccion()
    iniciarSesionPorRedireccion.mockRejectedValueOnce(new Error('crypto.subtle no disponible'))
    renderRuta('/login', { auth: servicio })

    await userEvent.setup().click(screen.getByRole('button', { name: 'Continuar' }))

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent('No se pudo iniciar sesión. Intenta de nuevo.')
    expect(alerta).not.toHaveTextContent('crypto')
  })

  it('con sesión abierta, el acceso lleva directo al dashboard', async () => {
    const { servicio, completarInicio } = crearAuthRedireccion()
    await completarInicio('https://x/auth/callback?code=c&state=s')

    renderRuta('/login', { auth: servicio })

    expect(titulo('Dashboard — IMSS Bienestar')).toBeInTheDocument()
  })

  it('cerrar sesión llama al proveedor, que cierra también la suya', async () => {
    const { servicio, completarInicio, cerrarSesion } = crearAuthRedireccion()
    await completarInicio('https://x/auth/callback?code=c&state=s')
    renderRuta('/dashboard', { auth: servicio })
    const persona = userEvent.setup()

    await persona.click(screen.getByRole('button', { name: 'Cuenta de usuario' }))
    await persona.click(await screen.findByRole('menuitem', { name: 'Cerrar sesión' }))

    await waitFor(() => expect(cerrarSesion).toHaveBeenCalledTimes(1))
  })
})

describe('página de regreso del proveedor (/auth/callback)', () => {
  it('canjea el código con la URL que recibió y manda a la pantalla que se pedía', async () => {
    const { servicio, completarInicio } = crearAuthRedireccion({ destino: '/mapa' })

    renderRuta('/auth/callback?code=abc&state=xyz', { auth: servicio })

    expect(await screen.findByRole('heading', { level: 1, name: 'Mapa de México — IMSS Bienestar' })).toBeInTheDocument()
    expect(completarInicio).toHaveBeenCalledTimes(1)
    const url = new URL(String(completarInicio.mock.calls[0]?.[0]))
    expect(url.pathname).toBe('/auth/callback')
    expect(url.searchParams.get('code')).toBe('abc')
    expect(url.searchParams.get('state')).toBe('xyz')
  })

  it('mientras trabaja avisa que está completando el acceso', () => {
    const { servicio } = crearAuthRedireccion()

    renderRuta('/auth/callback?code=abc&state=xyz', { auth: servicio, conSesion: false })

    expect(screen.getByRole('status')).toHaveTextContent('Completando el inicio de sesión')
  })

  it('si falla, lo dice sin detalles técnicos y ofrece volver a intentarlo', async () => {
    const { servicio } = crearAuthRedireccion({ falla: true })

    renderRuta('/auth/callback?code=abc&state=xyz', { auth: servicio })

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent('No se pudo completar el inicio de sesión. Intenta de nuevo.')
    await userEvent.setup().click(within(document.body).getByRole('link', { name: 'Volver a iniciar sesión' }))
    expect(await screen.findByRole('button', { name: 'Continuar' })).toBeInTheDocument()
  })

  it('con el adaptador de formulario (desarrollo) no aplica: regresa al login', async () => {
    renderRuta('/auth/callback?code=abc&state=xyz', { conSesion: false })

    expect(await screen.findByRole('heading', { level: 1, name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(screen.getByLabelText('Usuario')).toBeInTheDocument()
  })
})
