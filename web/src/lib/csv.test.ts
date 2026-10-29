import { describe, expect, it } from 'vitest'

import { filasAObjetos, parsearCsv } from '@/lib/csv'

describe('parsearCsv', () => {
  it('separa filas y columnas', () => {
    expect(parsearCsv('a,b\n1,2\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('respeta las comas dentro de comillas', () => {
    expect(parsearCsv('nombre,cantidad\n"Ciudad, de México","1,234"\n')).toEqual([
      ['nombre', 'cantidad'],
      ['Ciudad, de México', '1,234'],
    ])
  })

  it('interpreta las comillas dobles escapadas', () => {
    expect(parsearCsv('a\n"dijo ""hola"""\n')).toEqual([['a'], ['dijo "hola"']])
  })

  it('ignora el retorno de carro de los saltos de línea de Windows', () => {
    expect(parsearCsv('a,b\r\n1,2\r\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('conserva la última fila aunque no termine en salto de línea', () => {
    expect(parsearCsv('a,b\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('descarta las filas completamente vacías', () => {
    expect(parsearCsv('a,b\n\n , \n1,2\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })
})

describe('filasAObjetos', () => {
  it('usa la primera fila como encabezado y recorta los espacios', () => {
    expect(filasAObjetos([[' Clave ', 'Nombre'], [' MXJAL ', ' Jalisco ']])).toEqual([
      { Clave: 'MXJAL', Nombre: 'Jalisco' },
    ])
  })

  it('devuelve una lista vacía si no hay filas', () => {
    expect(filasAObjetos([])).toEqual([])
  })

  it('rellena con texto vacío las columnas que faltan en una fila', () => {
    expect(filasAObjetos([['a', 'b'], ['1']])).toEqual([{ a: '1', b: '' }])
  })
})
