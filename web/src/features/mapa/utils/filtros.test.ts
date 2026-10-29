import { describe, expect, it } from 'vitest'

import type { EstadoGeo } from '@/features/mapa/types/mapa.types'
import { idsVisibles } from '@/features/mapa/utils/filtros'

const ESTADOS: EstadoGeo[] = [
  { id: 'MXJAL', abbr: 'JAL', name: 'Jalisco', capital: 'Guadalajara', region: 'Norte/ Occidente', d: '' },
  { id: 'MXCMX', abbr: 'CMX', name: 'Ciudad de México', capital: 'Ciudad de México', region: 'Metropolitano', d: '' },
  { id: 'MXMEX', abbr: 'MEX', name: 'México', capital: 'Toluca', region: 'Metropolitano', d: '' },
]

const SIN_FILTROS = { texto: '', region: '', regionesOcultas: new Set<string>() }

describe('idsVisibles', () => {
  it('sin filtros muestra todos los estados', () => {
    expect(idsVisibles(ESTADOS, SIN_FILTROS)).toEqual(new Set(['MXJAL', 'MXCMX', 'MXMEX']))
  })

  it.each([
    ['nombre', 'jalis', ['MXJAL']],
    ['abreviatura', 'cmx', ['MXCMX']],
    ['clave', 'mxmex', ['MXMEX']],
    ['capital', 'toluca', ['MXMEX']],
  ])('busca por %s sin distinguir mayúsculas', (_campo, texto, esperados) => {
    expect(idsVisibles(ESTADOS, { ...SIN_FILTROS, texto: texto.toUpperCase() })).toEqual(new Set(esperados))
  })

  it('recorta los espacios del texto buscado', () => {
    expect(idsVisibles(ESTADOS, { ...SIN_FILTROS, texto: '  jalisco  ' })).toEqual(new Set(['MXJAL']))
  })

  it('filtra por región exacta', () => {
    expect(idsVisibles(ESTADOS, { ...SIN_FILTROS, region: 'Metropolitano' })).toEqual(
      new Set(['MXCMX', 'MXMEX']),
    )
  })

  it('oculta las regiones apagadas desde la leyenda', () => {
    expect(
      idsVisibles(ESTADOS, { ...SIN_FILTROS, regionesOcultas: new Set(['Metropolitano']) }),
    ).toEqual(new Set(['MXJAL']))
  })

  it('combina todos los criterios', () => {
    expect(
      idsVisibles(ESTADOS, {
        texto: 'mé',
        region: 'Metropolitano',
        regionesOcultas: new Set<string>(),
      }),
    ).toEqual(new Set(['MXCMX', 'MXMEX']))

    expect(
      idsVisibles(ESTADOS, {
        texto: 'mé',
        region: 'Metropolitano',
        regionesOcultas: new Set(['Metropolitano']),
      }),
    ).toEqual(new Set())
  })
})
