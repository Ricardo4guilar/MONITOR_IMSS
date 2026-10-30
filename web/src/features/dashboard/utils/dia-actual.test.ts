import { describe, expect, it } from 'vitest'

import { ubicarDiaActual } from '@/features/dashboard/utils/dia-actual'
import type { PuntoGrafica } from '@/features/dashboard/utils/serie-avance'

const punto = (dia: number, fecha: string): PuntoGrafica => ({
  dia,
  fecha,
  acumulado: 0,
  instalados: 0,
  restante: 0,
  meta: 0,
  proyeccion: 0,
})

const SERIE: PuntoGrafica[] = [
  punto(0, '9/9/2026'),
  punto(1, '10/9/2026'),
  punto(2, '11/9/2026'),
]

describe('ubicarDiaActual', () => {
  it('ancla en el día de la serie que coincide con hoy', () => {
    expect(ubicarDiaActual(SERIE, new Date(2026, 8, 10))).toEqual({ fecha: '10/9/2026', indice: 1 })
  })

  it('si hoy cae antes del primer día, se queda en el extremo inicial (no sale de la gráfica)', () => {
    expect(ubicarDiaActual(SERIE, new Date(2026, 7, 1))).toEqual({ fecha: '9/9/2026', indice: 0 })
  })

  it('si hoy cae después del último día, se queda en el extremo final (no sale de la gráfica)', () => {
    expect(ubicarDiaActual(SERIE, new Date(2026, 11, 31))).toEqual({ fecha: '11/9/2026', indice: 2 })
  })

  it('con hoy entre dos días elige el más cercano', () => {
    // 10/9 por la tarde no cambia nada: comparamos por día. Un hoy a mitad tiende al más próximo.
    expect(ubicarDiaActual(SERIE, new Date(2026, 8, 11))?.indice).toBe(2)
  })

  it('sin serie no hay marcador', () => {
    expect(ubicarDiaActual([], new Date())).toBeNull()
  })
})
