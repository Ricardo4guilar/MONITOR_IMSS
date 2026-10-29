import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ThemeProvider } from '@/features/tema/ThemeProvider'
import { useTema } from '@/features/tema/useTema'
import { CLAVE_TEMA } from '@/features/tema/utils/tema'
import { almacenEnMemoria } from '@/test/render-ruta'

/** Sustituye matchMedia por un sistema que prefiere oscuro o claro y que se puede cambiar en vivo. */
function simularSistema(prefiereOscuro: boolean) {
  let oyente: ((evento: { matches: boolean }) => void) | null = null
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: prefiereOscuro,
      addEventListener: (_tipo: string, funcion: (evento: { matches: boolean }) => void) => {
        oyente = funcion
      },
      removeEventListener: () => {
        oyente = null
      },
    })),
  )
  return { cambiarA: (oscuro: boolean) => act(() => oyente?.({ matches: oscuro })) }
}

function Sonda() {
  const { preferencia, tema, cambiar } = useTema()
  return (
    <div>
      <p data-testid="estado">{`${preferencia}/${tema}`}</p>
      <button type="button" onClick={() => cambiar('claro')}>Claro</button>
      <button type="button" onClick={() => cambiar('sistema')}>Sistema</button>
    </div>
  )
}

const esOscuro = () => document.documentElement.classList.contains('dark')

afterEach(() => {
  document.documentElement.classList.remove('dark')
  document.documentElement.style.colorScheme = ''
  vi.unstubAllGlobals()
})

describe('ThemeProvider', () => {
  it('sin preferencia guardada arranca en oscuro y lo aplica a la página', () => {
    simularSistema(false)
    render(<ThemeProvider almacen={almacenEnMemoria()}><Sonda /></ThemeProvider>)

    expect(screen.getByTestId('estado')).toHaveTextContent('oscuro/oscuro')
    expect(esOscuro()).toBe(true)
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })

  it('arranca con la preferencia guardada', () => {
    simularSistema(true)
    const almacen = almacenEnMemoria()
    almacen.setItem(CLAVE_TEMA, 'claro')

    render(<ThemeProvider almacen={almacen}><Sonda /></ThemeProvider>)

    expect(screen.getByTestId('estado')).toHaveTextContent('claro/claro')
    expect(esOscuro()).toBe(false)
    expect(document.documentElement.style.colorScheme).toBe('light')
  })

  it('cambiar de tema actualiza la página y lo recuerda', async () => {
    simularSistema(false)
    const almacen = almacenEnMemoria()
    render(<ThemeProvider almacen={almacen}><Sonda /></ThemeProvider>)

    await userEvent.setup().click(screen.getByRole('button', { name: 'Claro' }))

    expect(esOscuro()).toBe(false)
    expect(almacen.getItem(CLAVE_TEMA)).toBe('claro')
  })

  it('«sistema» toma el tema del sistema operativo', async () => {
    simularSistema(true)
    render(<ThemeProvider almacen={almacenEnMemoria()}><Sonda /></ThemeProvider>)

    await userEvent.setup().click(screen.getByRole('button', { name: 'Sistema' }))

    expect(screen.getByTestId('estado')).toHaveTextContent('sistema/oscuro')
    expect(esOscuro()).toBe(true)
  })

  it('con «sistema», si el sistema cambia de tema con la app abierta, la app lo sigue', async () => {
    const sistema = simularSistema(true)
    const almacen = almacenEnMemoria()
    almacen.setItem(CLAVE_TEMA, 'sistema')
    render(<ThemeProvider almacen={almacen}><Sonda /></ThemeProvider>)
    expect(esOscuro()).toBe(true)

    sistema.cambiarA(false)

    expect(esOscuro()).toBe(false)
    expect(screen.getByTestId('estado')).toHaveTextContent('sistema/claro')
  })

  it('con una preferencia fija, los cambios del sistema no la tocan', () => {
    const sistema = simularSistema(true)
    const almacen = almacenEnMemoria()
    almacen.setItem(CLAVE_TEMA, 'oscuro')
    render(<ThemeProvider almacen={almacen}><Sonda /></ThemeProvider>)

    sistema.cambiarA(false)

    expect(esOscuro()).toBe(true)
  })

  it('usar el hook fuera del proveedor avisa con un error claro', () => {
    const consola = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => render(<Sonda />)).toThrow('useTema debe usarse dentro de <ThemeProvider>')
    consola.mockRestore()
  })
})
