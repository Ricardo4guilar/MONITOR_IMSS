import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { renderRuta, USUARIO_PRUEBA } from '@/test/render-ruta'

const esOscuro = () => document.documentElement.classList.contains('dark')

async function abrirMenuDeUsuario() {
  const persona = userEvent.setup()
  await persona.click(screen.getByRole('button', { name: 'Cuenta de usuario' }))
  return { persona, menu: await screen.findByRole('menu') }
}

describe('menú de usuario (avatar)', () => {
  it('muestra quién tiene la sesión abierta y las opciones Ajustes y Cerrar sesión', async () => {
    renderRuta('/dashboard')

    const { menu } = await abrirMenuDeUsuario()

    expect(within(menu).getByText(USUARIO_PRUEBA)).toBeInTheDocument()
    expect(within(menu).getByRole('menuitem', { name: 'Ajustes' })).toBeInTheDocument()
    expect(within(menu).getByRole('menuitem', { name: 'Cerrar sesión' })).toBeInTheDocument()
  })

  it('«Ajustes» lleva a la pantalla de ajustes', async () => {
    renderRuta('/dashboard')
    const { persona, menu } = await abrirMenuDeUsuario()

    await persona.click(within(menu).getByRole('menuitem', { name: 'Ajustes' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Ajustes — IMSS Bienestar' })).toBeInTheDocument()
  })

  it('«Cerrar sesión» cierra la sesión y lleva al login', async () => {
    const { servicio } = renderRuta('/dashboard')
    const { persona, menu } = await abrirMenuDeUsuario()

    await persona.click(within(menu).getByRole('menuitem', { name: 'Cerrar sesión' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(servicio.sesionActual()).toBeNull()
  })

  it('al cerrar sesión se borran los datos en memoria: nadie los ve al entrar otra persona', async () => {
    const { queryClient } = renderRuta('/directorios')
    await screen.findByRole('button', { name: 'HOSPITAL CIVIL DE GUADALAJARA' })
    expect(queryClient.getQueryCache().getAll().length).toBeGreaterThan(0)
    const { persona, menu } = await abrirMenuDeUsuario()

    await persona.click(within(menu).getByRole('menuitem', { name: 'Cerrar sesión' }))

    await screen.findByRole('heading', { level: 1, name: 'Iniciar sesión' })
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
  })

  it('tras cerrar sesión, volver atrás o abrir una ruta interna pide iniciar sesión', async () => {
    renderRuta('/mapa')
    const { persona, menu } = await abrirMenuDeUsuario()
    await persona.click(within(menu).getByRole('menuitem', { name: 'Cerrar sesión' }))
    await screen.findByRole('heading', { level: 1, name: 'Iniciar sesión' })

    expect(screen.queryByRole('navigation', { name: 'Navegación principal' })).not.toBeInTheDocument()
  })
})

describe('pantalla de ajustes', () => {
  it('ofrece los tres modos de apariencia y marca el actual (oscuro por defecto)', () => {
    renderRuta('/ajustes')

    expect(screen.getByRole('radio', { name: /Claro/ })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: /Oscuro/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: /Sistema/ })).not.toBeChecked()
  })

  it('elegir «Claro» cambia el tema de toda la app al instante', async () => {
    renderRuta('/ajustes')
    expect(esOscuro()).toBe(true)

    await userEvent.setup().click(screen.getByRole('radio', { name: /Claro/ }))

    await waitFor(() => expect(esOscuro()).toBe(false))
    expect(screen.getByRole('radio', { name: /Claro/ })).toBeChecked()
  })

  it('se puede volver a «Oscuro»', async () => {
    renderRuta('/ajustes')
    const persona = userEvent.setup()
    await persona.click(screen.getByRole('radio', { name: /Claro/ }))

    await persona.click(screen.getByRole('radio', { name: /Oscuro/ }))

    await waitFor(() => expect(esOscuro()).toBe(true))
  })

  it('muestra con qué usuario se inició sesión y permite cerrarla', async () => {
    const { servicio } = renderRuta('/ajustes')
    const sesion = screen.getByRole('region', { name: 'Sesión' })
    expect(within(sesion).getByText(USUARIO_PRUEBA)).toBeInTheDocument()

    await userEvent.setup().click(within(sesion).getByRole('button', { name: 'Cerrar sesión' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(servicio.sesionActual()).toBeNull()
  })

  it('el engranaje del menú lateral lleva a Ajustes', async () => {
    renderRuta('/dashboard')

    await userEvent
      .setup()
      .click(within(screen.getByRole('navigation', { name: 'Navegación principal' })).getByRole('link', { name: 'Ajustes' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Ajustes — IMSS Bienestar' })).toBeInTheDocument()
  })

  it('en móvil, la barra inferior tiene los cuatro destinos', () => {
    renderRuta('/dashboard')

    const barra = screen.getByRole('navigation', { name: 'Navegación móvil' })

    for (const nombre of ['Dashboard', 'Mapa', 'Directorios', 'Ajustes']) {
      expect(within(barra).getByRole('link', { name: nombre })).toBeInTheDocument()
    }
  })

  it('la barra inferior marca la pantalla actual', () => {
    renderRuta('/directorios')

    const barra = screen.getByRole('navigation', { name: 'Navegación móvil' })

    expect(within(barra).getByRole('link', { name: 'Directorios' })).toHaveAttribute('aria-current', 'page')
  })

  it('en Ajustes no hay buscador ni filtro de región, que aquí no sirven', () => {
    renderRuta('/ajustes')

    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Filtrar por región' })).not.toBeInTheDocument()
  })
})
