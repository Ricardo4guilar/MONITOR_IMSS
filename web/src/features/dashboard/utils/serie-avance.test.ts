import { describe, expect, it } from 'vitest'

import type { PuntoAvance } from '@/features/dashboard/types/dashboard.types'
import { construirSerieAvance } from '@/features/dashboard/utils/serie-avance'

const punto = (dia: number, acumulado: number, restante: number): PuntoAvance => ({
  dia,
  fecha: `${dia + 1}/9/2026`,
  acumulado,
  instalados: 0,
  restante,
})

describe('construirSerieAvance', () => {
  it('deduce la meta de lo instalado más lo que falta', () => {
    const serie = construirSerieAvance([punto(0, 9060, 15940), punto(1, 9359, 15641)])

    expect(serie.map((p) => p.meta)).toEqual([25000, 25000])
  })

  it('la proyección parte de lo instalado el primer día y llega a la meta el último', () => {
    const serie = construirSerieAvance([punto(0, 100, 900), punto(5, 400, 600), punto(10, 700, 300)])

    expect(serie[0]?.proyeccion).toBe(100)
    expect(serie[2]?.proyeccion).toBe(1000)
  })

  it('la proyección avanza en línea recta entre esos dos extremos', () => {
    const serie = construirSerieAvance([punto(0, 100, 900), punto(5, 400, 600), punto(10, 700, 300)])

    expect(serie[1]?.proyeccion).toBe(550)
  })

  it('conserva los datos originales de cada día', () => {
    const [primero] = construirSerieAvance([punto(0, 100, 900), punto(10, 700, 300)])

    expect(primero).toMatchObject({ dia: 0, fecha: '1/9/2026', acumulado: 100, restante: 900 })
  })

  it('con un solo día la proyección es la meta, sin dividir entre cero', () => {
    expect(construirSerieAvance([punto(0, 100, 900)])[0]?.proyeccion).toBe(1000)
  })

  it('sin datos devuelve una lista vacía', () => {
    expect(construirSerieAvance([])).toEqual([])
  })
})
