import { describe, expect, it } from 'vitest'

import type { EstadoGeo } from '@/features/mapa/types/mapa.types'
import { aplicarEntidades } from '@/features/mapa/utils/entidades'

const BASE: EstadoGeo[] = [
  { id: 'MXJAL', abbr: 'JAL', name: 'Jalisco', capital: 'Guadalajara', region: 'Occidente', d: 'M0 0' },
  { id: 'MXCMX', abbr: 'CMX', name: 'CDMX', capital: 'Ciudad de México', region: 'Centro', d: 'M1 1' },
]

describe('aplicarEntidades', () => {
  it('sustituye la región y el nombre con los de la tabla, por clave', () => {
    const resultado = aplicarEntidades(BASE, [
      { clave: 'MXJAL', nombre: 'Jalisco', region: 'Norte/ Occidente' },
      { clave: 'MXCMX', nombre: 'Ciudad de México', region: 'Metropolitano' },
    ])

    expect(resultado.find((e) => e.id === 'MXJAL')?.region).toBe('Norte/ Occidente')
    expect(resultado.find((e) => e.id === 'MXCMX')?.name).toBe('Ciudad de México')
    expect(resultado.find((e) => e.id === 'MXCMX')?.region).toBe('Metropolitano')
  })

  it('normaliza los espacios de la región que llega de la hoja', () => {
    const [jalisco] = aplicarEntidades(BASE, [
      { clave: 'MXJAL', nombre: 'Jalisco', region: 'Norte/   Occidente ' },
    ])

    expect(jalisco?.region).toBe('Norte/ Occidente')
  })

  it('ignora las filas cuya clave no corresponde a un estado del mapa', () => {
    const resultado = aplicarEntidades(BASE, [{ clave: 'MXXXX', nombre: 'Atlantis', region: 'Mar' }])

    expect(resultado.map((e) => e.id)).toEqual(['MXJAL', 'MXCMX'])
    expect(resultado.some((e) => e.region === 'Mar')).toBe(false)
  })

  it('conserva la región y el nombre del mapa si la fila viene vacía', () => {
    const [jalisco] = aplicarEntidades(BASE, [{ clave: 'MXJAL', nombre: '', region: '' }])

    expect(jalisco?.region).toBe('Occidente')
    expect(jalisco?.name).toBe('Jalisco')
  })

  it('sin tabla deja las regiones por defecto del mapa, normalizadas', () => {
    const resultado = aplicarEntidades(
      [{ id: 'MXJAL', abbr: 'JAL', name: 'Jalisco', capital: 'Guadalajara', region: ' Oc  cidente ', d: 'M0 0' }],
      null,
    )

    expect(resultado[0]?.region).toBe('Oc cidente')
  })

  it('no modifica la lista original', () => {
    aplicarEntidades(BASE, [{ clave: 'MXJAL', nombre: 'Jalisco', region: 'Norte/ Occidente' }])

    expect(BASE[0]?.region).toBe('Occidente')
  })
})
