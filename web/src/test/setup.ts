import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

import { simularHojas } from '@/test/fixtures'

// Por defecto toda prueba ve las hojas de ejemplo; una prueba puede volver a simularlas.
beforeEach(() => {
  simularHojas()
  // jsdom no implementa matchMedia. Por defecto el sistema prefiere oscuro; una prueba puede sustituirlo.
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} })),
  )
})

// Sin `globals`, Testing Library no registra su limpieza automática.
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  document.documentElement.classList.remove('dark')
  document.documentElement.style.colorScheme = ''
})

// jsdom no implementa ResizeObserver y Base UI lo usa para posicionar popups.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver ??= ResizeObserverStub
