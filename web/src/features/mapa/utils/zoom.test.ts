import { describe, expect, it } from 'vitest'

import type { VistaMapa } from '@/features/mapa/types/mapa.types'
import {
  aCoordenadasDelMapa,
  acercar,
  alejar,
  factorZoom,
  panear,
  unidadesPorPixel,
  zoomConRueda,
  ZOOM_MAX,
} from '@/features/mapa/utils/zoom'

const BASE: VistaMapa = { x: 0, y: 0, w: 1000, h: 630 }

const cerca = (valor: number, esperado: number) => expect(valor).toBeCloseTo(esperado, 6)

describe('factorZoom', () => {
  it('es 1 (100 %) en la vista original', () => {
    expect(factorZoom(BASE, BASE)).toBe(1)
  })
})

describe('acercar', () => {
  it('reduce la vista 1.4 veces manteniendo el centro', () => {
    const vista = acercar(BASE, BASE)

    cerca(vista.w, 1000 / 1.4)
    cerca(vista.h, 630 / 1.4)
    cerca(vista.x + vista.w / 2, 500)
    cerca(vista.y + vista.h / 2, 315)
  })

  it('no pasa del acercamiento máximo', () => {
    let vista = BASE
    for (let i = 0; i < 30; i++) vista = acercar(vista, BASE)

    cerca(factorZoom(vista, BASE), ZOOM_MAX)
  })
})

describe('alejar', () => {
  it('no sale de la vista original', () => {
    expect(alejar(BASE, BASE)).toEqual(BASE)
  })

  it('deshace un acercamiento', () => {
    const vista = alejar(acercar(BASE, BASE), BASE)

    cerca(vista.w, 1000)
    cerca(vista.x, 0)
    cerca(vista.y, 0)
  })
})

describe('zoomConRueda', () => {
  it('acerca manteniendo bajo el cursor el punto del mapa que apuntaba', () => {
    const vista = zoomConRueda(BASE, BASE, 'acercar', 200, 100)

    // El punto (200, 100) conserva su posición relativa dentro de la vista.
    cerca((200 - vista.x) / vista.w, 200 / 1000)
    cerca((100 - vista.y) / vista.h, 100 / 630)
    cerca(vista.w, 1000 / 1.4)
  })

  it('alejar sobre la vista original no cambia nada', () => {
    expect(zoomConRueda(BASE, BASE, 'alejar', 500, 300)).toEqual(BASE)
  })
})

describe('panear', () => {
  const ACERCADA = acercar(acercar(BASE, BASE), BASE)

  it('mueve la vista en sentido contrario al arrastre', () => {
    const vista = panear(ACERCADA, BASE, 10, 5)

    cerca(vista.x, ACERCADA.x - 10)
    cerca(vista.y, ACERCADA.y - 5)
  })

  it('no deja la vista salirse del mapa', () => {
    const izquierda = panear(ACERCADA, BASE, 99999, 99999)
    expect(izquierda.x).toBe(0)
    expect(izquierda.y).toBe(0)

    const derecha = panear(ACERCADA, BASE, -99999, -99999)
    cerca(derecha.x + derecha.w, 1000)
    cerca(derecha.y + derecha.h, 630)
  })

  it('a 100 % no se puede mover: ya se ve todo el mapa', () => {
    expect(panear(BASE, BASE, 50, 50)).toEqual(BASE)
  })
})

// El SVG conserva su proporción y se centra: si el contenedor es más alto que el mapa, sobran bandas arriba y abajo.
describe('conversión de píxeles a coordenadas del mapa', () => {
  const AJUSTADO = { left: 0, top: 0, width: 1000, height: 630 }
  const CUADRADO = { left: 100, top: 50, width: 1000, height: 1000 }

  it('unidadesPorPixel usa el lado que limita el ajuste', () => {
    expect(unidadesPorPixel(AJUSTADO, BASE)).toBe(1)
    expect(unidadesPorPixel({ left: 0, top: 0, width: 500, height: 900 }, BASE)).toBe(2)
  })

  it('un punto del contenedor ajustado se traduce a su coordenada del mapa', () => {
    expect(aCoordenadasDelMapa(AJUSTADO, BASE, 500, 315)).toEqual({ x: 500, y: 315 })
  })

  it('descuenta la banda vacía cuando el contenedor es más alto que el mapa', () => {
    // Banda superior = (1000 - 630) / 2 = 185 px; el punto (600, 50 + 185 + 315) cae en el centro del mapa.
    const punto = aCoordenadasDelMapa(CUADRADO, BASE, 600, 550)

    expect(punto.x).toBeCloseTo(500, 6)
    expect(punto.y).toBeCloseTo(315, 6)
  })

  it('tiene en cuenta el acercamiento y el desplazamiento de la vista', () => {
    const vista = acercar(BASE, BASE)

    const centro = aCoordenadasDelMapa(AJUSTADO, vista, 500, 315)

    expect(centro.x).toBeCloseTo(500, 6)
    expect(centro.y).toBeCloseTo(315, 6)
  })
})
