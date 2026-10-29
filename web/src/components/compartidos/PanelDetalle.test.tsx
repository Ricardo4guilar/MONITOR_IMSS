import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PanelDetalle } from '@/components/compartidos/PanelDetalle'

/** Sustituye matchMedia: `escritorio` decide si la consulta «(min-width: 1024px)» se cumple. */
function simularPantalla(escritorio: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: escritorio, addEventListener: () => {}, removeEventListener: () => {} })),
  )
}

afterEach(() => vi.unstubAllGlobals())

describe('PanelDetalle', () => {
  it('en pantalla grande muestra el contenido en su sitio, sin ventana', () => {
    simularPantalla(true)
    render(
      <PanelDetalle abierto={false} onCerrar={() => {}} titulo="Detalle">
        <p>Contenido</p>
      </PanelDetalle>,
    )

    expect(screen.getByText('Contenido')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('en pantalla pequeña y cerrado no muestra nada', () => {
    simularPantalla(false)
    render(
      <PanelDetalle abierto={false} onCerrar={() => {}} titulo="Detalle">
        <p>Contenido</p>
      </PanelDetalle>,
    )

    expect(screen.queryByText('Contenido')).not.toBeInTheDocument()
  })

  it('en pantalla pequeña y abierto lo muestra como panel inferior con título accesible', async () => {
    simularPantalla(false)
    render(
      <PanelDetalle abierto onCerrar={() => {}} titulo="Detalle del estado">
        <p>Contenido</p>
      </PanelDetalle>,
    )

    const panel = await screen.findByRole('dialog', { name: 'Detalle del estado' })
    expect(panel).toHaveTextContent('Contenido')
  })

  it('cerrarlo (Escape) avisa para limpiar la selección', async () => {
    simularPantalla(false)
    const alCerrar = vi.fn()
    render(
      <PanelDetalle abierto onCerrar={alCerrar} titulo="Detalle">
        <p>Contenido</p>
      </PanelDetalle>,
    )
    await screen.findByRole('dialog')

    await userEvent.setup().keyboard('{Escape}')

    expect(alCerrar).toHaveBeenCalledTimes(1)
  })
})
