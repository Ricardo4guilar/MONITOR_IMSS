import { describe, expect, it } from 'vitest'

import { rutaInterna } from '@/features/auth/utils/ruta-interna'

describe('rutaInterna', () => {
  it.each(['/mapa', '/directorios?vista=contactos&q=jal', '/dashboard#algo'])('acepta la ruta interna %s', (ruta) => {
    expect(rutaInterna(ruta)).toBe(ruta)
  })

  it.each([
    ['https://sitio-malicioso.example/robar', 'una URL absoluta'],
    ['//sitio-malicioso.example', 'una URL sin protocolo'],
    ['/\\sitio-malicioso.example', 'una barra invertida'],
    ['/login', 'el propio login (bucle)'],
    ['/auth/callback?code=1', 'el callback (bucle)'],
    ['javascript:alert(1)', 'un esquema javascript'],
    ['', 'texto vacío'],
    [42, 'un número'],
    [undefined, 'nada'],
  ])('rechaza %s (%s) y vuelve al dashboard', (...caso) => {
    // caso = [ruta, descripción]; la descripción solo sirve para el nombre del test.
    expect(rutaInterna(caso[0])).toBe('/dashboard')
  })

  it('permite otro destino por defecto', () => {
    expect(rutaInterna('https://otro.example', '/mapa')).toBe('/mapa')
  })
})
