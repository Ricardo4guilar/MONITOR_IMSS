import { describe, expect, it } from 'vitest'

import { describirDias, describirHorario } from '@/features/directorios/utils/formato'

const TODA_LA_SEMANA = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO']

describe('describirDias', () => {
  it('los siete días se resumen como «Todos los días»', () => {
    expect(describirDias(TODA_LA_SEMANA)).toBe('Todos los días')
  })

  it('de lunes a viernes se resume como un rango', () => {
    expect(describirDias(['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'])).toBe('Lunes a viernes')
  })

  it('otros casos se listan con la inicial en mayúscula, en orden de semana', () => {
    expect(describirDias(['VIERNES', 'LUNES', 'SABADO'])).toBe('Lunes, viernes, sábado')
  })

  it('sin días dice que no hay dato', () => {
    expect(describirDias([])).toBe('Sin dato')
  })
})

describe('describirHorario', () => {
  it('00:00 - 23:59 es «24 horas»', () => {
    expect(describirHorario('00:00 - 23:59')).toBe('24 horas')
  })

  it('00:00 - 23:00 se muestra tal cual: la hoja no dice que sea guardia continua', () => {
    expect(describirHorario('00:00 - 23:00')).toBe('00:00 - 23:00')
  })

  it('un horario normal se muestra tal cual', () => {
    expect(describirHorario('08:00 - 16:00')).toBe('08:00 - 16:00')
  })

  it('vacío dice que no hay dato', () => {
    expect(describirHorario('')).toBe('Sin dato')
  })
})
