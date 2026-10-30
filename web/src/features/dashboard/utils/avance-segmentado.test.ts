import { describe, expect, it } from 'vitest'

import {
  construirSegmentos,
  parsearFecha,
  porcentajeTranscurrido,
} from '@/features/dashboard/utils/avance-segmentado'

describe('parsearFecha', () => {
  it('lee el formato d/m/yyyy de las hojas a medianoche local', () => {
    const fecha = parsearFecha('9/9/2026')
    expect(fecha).not.toBeNull()
    expect(fecha?.getFullYear()).toBe(2026)
    expect(fecha?.getMonth()).toBe(8) // septiembre (0-index)
    expect(fecha?.getDate()).toBe(9)
    expect(fecha?.getHours()).toBe(0)
  })

  it('acepta un Date y lo normaliza a medianoche', () => {
    const fecha = parsearFecha(new Date(2026, 10, 15, 13, 45))
    expect(fecha?.getHours()).toBe(0)
    expect(fecha?.getDate()).toBe(15)
  })

  it('rechaza textos que no son fechas o desbordan el calendario', () => {
    expect(parsearFecha('no es fecha')).toBeNull()
    expect(parsearFecha('31/2/2026')).toBeNull() // 31 de febrero no existe
    expect(parsearFecha('1/1')).toBeNull()
  })
})

describe('construirSegmentos', () => {
  it('genera una barra por día, inclusive los dos extremos', () => {
    const segmentos = construirSegmentos({ inicio: '1/11/2026', fin: '5/11/2026', hoy: '1/11/2026' })
    // Del 1 al 5 de noviembre son 5 días.
    expect(segmentos).toHaveLength(5)
    expect(segmentos[0]?.indice).toBe(0)
    expect(segmentos.at(-1)?.fecha.getDate()).toBe(5)
  })

  it('marca como transcurrido hasta hoy (incluido) y el resto como restante', () => {
    const segmentos = construirSegmentos({ inicio: '1/11/2026', fin: '5/11/2026', hoy: '3/11/2026' })
    expect(segmentos.map((s) => s.estado)).toEqual([
      'transcurrido', // 1
      'transcurrido', // 2
      'transcurrido', // 3 = hoy
      'restante', // 4
      'restante', // 5
    ])
  })

  it('señala los días de corte que caen dentro del periodo y los etiqueta', () => {
    const segmentos = construirSegmentos({
      inicio: '1/11/2026',
      fin: '5/11/2026',
      hoy: '3/11/2026',
      cortes: [{ fecha: '4/11/2026', etiqueta: 'Corte de prueba' }],
    })
    const corte = segmentos.find((s) => s.esCorte)
    expect(corte?.fecha.getDate()).toBe(4)
    expect(corte?.etiquetaCorte).toBe('Corte de prueba')
    // Solo ese día es corte.
    expect(segmentos.filter((s) => s.esCorte)).toHaveLength(1)
  })

  it('ignora los cortes fuera del rango A→B', () => {
    const segmentos = construirSegmentos({
      inicio: '1/11/2026',
      fin: '5/11/2026',
      hoy: '3/11/2026',
      cortes: [{ fecha: '20/12/2026' }],
    })
    expect(segmentos.some((s) => s.esCorte)).toBe(false)
  })

  it('devuelve vacío si alguna fecha es inválida o si B precede a A', () => {
    expect(construirSegmentos({ inicio: 'x', fin: '5/11/2026', hoy: '3/11/2026' })).toEqual([])
    expect(construirSegmentos({ inicio: '5/11/2026', fin: '1/11/2026', hoy: '3/11/2026' })).toEqual([])
  })
})

describe('porcentajeTranscurrido', () => {
  it('es la proporción de barras transcurridas sobre el total', () => {
    const segmentos = construirSegmentos({ inicio: '1/11/2026', fin: '5/11/2026', hoy: '3/11/2026' })
    // 3 de 5 barras transcurridas = 60%.
    expect(porcentajeTranscurrido(segmentos)).toBeCloseTo(60, 5)
  })

  it('es 0 cuando no hay segmentos', () => {
    expect(porcentajeTranscurrido([])).toBe(0)
  })
})
