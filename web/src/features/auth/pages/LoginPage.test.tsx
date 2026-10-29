import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { AuthNoConfigurada, SesionBloqueada, type ServicioAuth } from '@/features/auth/types/auth.types'
import { CLAVE_PRUEBA, renderRuta, USUARIO_PRUEBA } from '@/test/render-ruta'

const titulo = (nombre: string) => screen.getByRole('heading', { level: 1, name: nombre })

async function escribirCredenciales(usuario: string, clave: string) {
  const persona = userEvent.setup()
  if (usuario) await persona.type(screen.getByLabelText('Usuario'), usuario)
  if (clave) await persona.type(screen.getByLabelText('Contraseña'), clave)
  return persona
}

describe('rutas protegidas', () => {
  it.each(['/dashboard', '/mapa', '/directorios'])('sin sesión, %s lleva al login', (ruta) => {
    renderRuta(ruta, { conSesion: false })

    expect(titulo('Iniciar sesión')).toBeInTheDocument()
  })

  it('con sesión abierta se entra directo', () => {
    renderRuta('/mapa', { conSesion: true })

    expect(titulo('Mapa de México — IMSS Bienestar')).toBeInTheDocument()
  })

  it('con sesión abierta, el login lleva al dashboard', () => {
    renderRuta('/login', { conSesion: true })

    expect(titulo('Dashboard — IMSS Bienestar')).toBeInTheDocument()
  })

  it('la raíz sin sesión también lleva al login', () => {
    renderRuta('/', { conSesion: false })

    expect(titulo('Iniciar sesión')).toBeInTheDocument()
  })
})

describe('pantalla de login', () => {
  it('muestra el logo, el formulario y el botón', () => {
    renderRuta('/login', { conSesion: false })

    expect(screen.getAllByRole('img', { name: 'IMSS Bienestar' }).length).toBeGreaterThan(0)
    expect(screen.getByLabelText('Usuario')).toBeInTheDocument()
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument()
  })

  it('los campos piden a los gestores de contraseñas lo que corresponde', () => {
    renderRuta('/login', { conSesion: false })

    expect(screen.getByLabelText('Usuario')).toHaveAttribute('autocomplete', 'username')
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('autocomplete', 'current-password')
  })

  it('la contraseña no se ve y se puede mostrar y ocultar', async () => {
    const persona = userEvent.setup()
    renderRuta('/login', { conSesion: false })
    const campo = screen.getByLabelText('Contraseña')
    expect(campo).toHaveAttribute('type', 'password')

    await persona.click(screen.getByRole('button', { name: 'Mostrar contraseña' }))
    expect(campo).toHaveAttribute('type', 'text')

    await persona.click(screen.getByRole('button', { name: 'Ocultar contraseña' }))
    expect(campo).toHaveAttribute('type', 'password')
  })

  it('al enviar vacío pide los dos datos y no intenta entrar', async () => {
    const persona = userEvent.setup()
    renderRuta('/login', { conSesion: false })

    await persona.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(await screen.findByText('Escribe tu usuario')).toBeInTheDocument()
    expect(screen.getByText('Escribe tu contraseña')).toBeInTheDocument()
    expect(titulo('Iniciar sesión')).toBeInTheDocument()
  })

  it('con credenciales correctas entra al dashboard', async () => {
    renderRuta('/login', { conSesion: false })
    const persona = await escribirCredenciales(USUARIO_PRUEBA, CLAVE_PRUEBA)

    await persona.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard — IMSS Bienestar' })).toBeInTheDocument()
  })

  it('con Enter también envía el formulario', async () => {
    renderRuta('/login', { conSesion: false })
    const persona = await escribirCredenciales(USUARIO_PRUEBA, CLAVE_PRUEBA)

    await persona.keyboard('{Enter}')

    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard — IMSS Bienestar' })).toBeInTheDocument()
  })

  it('tras entrar vuelve a la pantalla que se quería abrir', async () => {
    renderRuta('/directorios', { conSesion: false })
    const persona = await escribirCredenciales(USUARIO_PRUEBA, CLAVE_PRUEBA)

    await persona.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Directorios — IMSS Bienestar' })).toBeInTheDocument()
  })

  describe('cuando algo sale mal', () => {
    it('con credenciales incorrectas avisa, conserva el usuario y vacía la contraseña', async () => {
      renderRuta('/login', { conSesion: false })
      const persona = await escribirCredenciales(USUARIO_PRUEBA, 'otra-clave')

      await persona.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('Usuario o contraseña incorrectos')
      expect(screen.getByLabelText('Usuario')).toHaveValue(USUARIO_PRUEBA)
      expect(screen.getByLabelText('Contraseña')).toHaveValue('')
      expect(titulo('Iniciar sesión')).toBeInTheDocument()
    })

    it('el aviso no distingue si falló el usuario o la contraseña', async () => {
      renderRuta('/login', { conSesion: false })
      const persona = await escribirCredenciales('nadie', CLAVE_PRUEBA)

      await persona.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('Usuario o contraseña incorrectos')
    })

    it('si hay bloqueo por intentos, dice cuánto esperar', async () => {
      const auth: ServicioAuth = {
        modo: 'formulario',
        sesionActual: () => null,
        cerrarSesion: () => Promise.resolve(),
        iniciarSesion: () => Promise.reject(new SesionBloqueada(30)),
      }
      renderRuta('/login', { auth })
      const persona = await escribirCredenciales(USUARIO_PRUEBA, CLAVE_PRUEBA)

      await persona.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('Demasiados intentos. Intenta de nuevo en 30 segundos.')
    })

    it('si el inicio de sesión no está configurado en este entorno, lo dice', async () => {
      const auth: ServicioAuth = {
        modo: 'formulario',
        sesionActual: () => null,
        cerrarSesion: () => Promise.resolve(),
        iniciarSesion: () => Promise.reject(new AuthNoConfigurada()),
      }
      renderRuta('/login', { auth })
      const persona = await escribirCredenciales(USUARIO_PRUEBA, CLAVE_PRUEBA)

      await persona.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('El inicio de sesión no está disponible en este entorno.')
    })

    it('un error inesperado se muestra con un mensaje genérico, sin filtrar detalles técnicos', async () => {
      const auth: ServicioAuth = {
        modo: 'formulario',
        sesionActual: () => null,
        cerrarSesion: () => Promise.resolve(),
        iniciarSesion: () => Promise.reject(new Error('ECONNRESET en 10.0.3.14:8443')),
      }
      renderRuta('/login', { auth })
      const persona = await escribirCredenciales(USUARIO_PRUEBA, CLAVE_PRUEBA)

      await persona.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

      const alerta = await screen.findByRole('alert')
      expect(alerta).toHaveTextContent('No se pudo iniciar sesión. Intenta de nuevo.')
      expect(alerta).not.toHaveTextContent('10.0.3.14')
    })
  })

  it('mientras valida, el botón se deshabilita y avisa que está trabajando', async () => {
    let terminar: () => void = () => {}
    const auth: ServicioAuth = {
      modo: 'formulario',
      sesionActual: () => null,
      cerrarSesion: () => Promise.resolve(),
      iniciarSesion: () =>
        new Promise((resolver) => {
          terminar = () => resolver({ usuario: USUARIO_PRUEBA })
        }),
    }
    renderRuta('/login', { auth })
    const persona = await escribirCredenciales(USUARIO_PRUEBA, CLAVE_PRUEBA)

    await persona.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    const boton = await screen.findByRole('button', { name: 'Iniciando sesión…' })
    expect(boton).toBeDisabled()
    expect(within(boton).queryByText('Iniciar sesión')).not.toBeInTheDocument()
    terminar()
    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard — IMSS Bienestar' })).toBeInTheDocument()
  })
})
