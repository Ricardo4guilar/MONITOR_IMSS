import { describe, expect, it } from 'vitest'

import {
  colorDeRegion,
  normalizarRegion,
  ordenarRegiones,
  REGIONES_OFICIALES,
} from '@/features/mapa/utils/regiones'

describe('normalizarRegion', () => {
  it('colapsa los espacios repetidos y recorta los extremos', () => {
    expect(normalizarRegion('  Norte/   Occidente ')).toBe('Norte/ Occidente')
  })

  it('devuelve texto vacío si no hay valor', () => {
    expect(normalizarRegion(undefined)).toBe('')
    expect(normalizarRegion(null)).toBe('')
  })
})

describe('REGIONES_OFICIALES', () => {
  it('son las cuatro de la tabla EntidadesFederativas, en su orden', () => {
    expect(REGIONES_OFICIALES.map((r) => r.nombre)).toEqual([
      'Norte/ Occidente',
      'Metropolitano',
      'Centro/Sur',
      'Centro/ Golfo/ Sureste',
    ])
  })
})

describe('ordenarRegiones', () => {
  it('pone primero las oficiales en su orden y después las inesperadas alfabéticamente', () => {
    expect(
      ordenarRegiones(['Zona Z', 'Centro/Sur', 'Zona A', 'Norte/ Occidente']),
    ).toEqual(['Norte/ Occidente', 'Centro/Sur', 'Zona A', 'Zona Z'])
  })

  it('no repite regiones', () => {
    expect(ordenarRegiones(['Metropolitano', 'Metropolitano'])).toEqual(['Metropolitano'])
  })
})

describe('colorDeRegion', () => {
  it('usa el token de la región oficial, aunque el nombre traiga espacios de más', () => {
    expect(colorDeRegion('Norte/  Occidente', 0)).toBe('var(--region-norte-occidente)')
    expect(colorDeRegion('Metropolitano', 0)).toBe('var(--region-metropolitano)')
    expect(colorDeRegion('Centro/Sur', 0)).toBe('var(--region-centro-sur)')
    expect(colorDeRegion('Centro/ Golfo/ Sureste', 0)).toBe('var(--region-centro-golfo-sureste)')
  })

  it('asigna un token de respaldo a una región no prevista, rotando por posición', () => {
    expect(colorDeRegion('Zona A', 0)).toBe('var(--region-extra-1)')
    expect(colorDeRegion('Zona B', 1)).toBe('var(--region-extra-2)')
    expect(colorDeRegion('Zona E', 4)).toBe('var(--region-extra-1)')
  })
})
