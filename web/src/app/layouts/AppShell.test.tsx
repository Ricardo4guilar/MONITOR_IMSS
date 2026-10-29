import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { renderRuta } from '@/test/render-ruta'

describe('AppShell', () => {
  it('muestra el logo, la navegación principal y el menú de cuenta', () => {
    renderRuta('/dashboard')

    expect(screen.getByRole('img', { name: 'IMSS Bienestar' })).toBeInTheDocument()

    const nav = screen.getByRole('navigation', { name: 'Navegación principal' })
    expect(within(nav).getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: 'Mapa' })).toBeInTheDocument()

    expect(screen.getByLabelText('Cuenta de usuario')).toBeInTheDocument()
  })

  it('en el Mapa la barra superior ofrece buscador y filtro de región, que ahí sí filtran', () => {
    renderRuta('/mapa')

    expect(screen.getByRole('searchbox', { name: 'Buscar estado o entidad' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Filtrar por región' })).toBeInTheDocument()
  })

  it('redirige la raíz al Dashboard', () => {
    renderRuta('/')

    expect(
      screen.getByRole('heading', { level: 1, name: 'Dashboard — IMSS Bienestar' }),
    ).toBeInTheDocument()
  })

  it('marca como activo el enlace de la pantalla actual', () => {
    renderRuta('/mapa')

    const nav = screen.getByRole('navigation', { name: 'Navegación principal' })
    expect(within(nav).getByRole('link', { name: 'Mapa' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current')
  })

  it('cambia de pantalla y de título al navegar', async () => {
    const usuario = userEvent.setup()
    renderRuta('/dashboard')

    await usuario.click(
      within(screen.getByRole('navigation', { name: 'Navegación principal' })).getByRole('link', { name: 'Mapa' }),
    )

    expect(
      screen.getByRole('heading', { level: 1, name: 'Mapa de México — IMSS Bienestar' }),
    ).toBeInTheDocument()
  })

  it('no depende de AppSheet en ninguna pantalla', () => {
    for (const ruta of ['/dashboard', '/mapa']) {
      const { unmount } = renderRuta(ruta)
      expect(screen.queryByText(/appsheet/i)).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: /appsheet/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /appsheet/i })).not.toBeInTheDocument()
      unmount()
    }
  })
})
