import { describe, expect, it } from 'vitest'

import { almacenEnMemoria } from '@/test/render-ruta'
import { CLAVE_TEMA, guardarPreferencia, leerPreferencia, resolverTema } from '@/features/tema/utils/tema'

describe('resolverTema', () => {
  it('claro y oscuro se respetan tal cual, sin importar el sistema', () => {
    expect(resolverTema('claro', true)).toBe('claro')
    expect(resolverTema('oscuro', false)).toBe('oscuro')
  })

  it('«sistema» sigue lo que prefiera el sistema operativo', () => {
    expect(resolverTema('sistema', true)).toBe('oscuro')
    expect(resolverTema('sistema', false)).toBe('claro')
  })
})

describe('leerPreferencia', () => {
  it('sin nada guardado usa oscuro, que es la identidad de la app', () => {
    expect(leerPreferencia(almacenEnMemoria())).toBe('oscuro')
  })

  it.each(['claro', 'oscuro', 'sistema'] as const)('devuelve la guardada: %s', (preferencia) => {
    const almacen = almacenEnMemoria()
    almacen.setItem(CLAVE_TEMA, preferencia)

    expect(leerPreferencia(almacen)).toBe(preferencia)
  })

  it('un valor guardado que no existe se ignora y vuelve al predeterminado', () => {
    const almacen = almacenEnMemoria()
    almacen.setItem(CLAVE_TEMA, 'morado')

    expect(leerPreferencia(almacen)).toBe('oscuro')
  })

  it('si el almacenamiento está bloqueado no rompe la app', () => {
    const bloqueado = {
      getItem: () => {
        throw new DOMException('bloqueado', 'SecurityError')
      },
    } as unknown as Storage

    expect(leerPreferencia(bloqueado)).toBe('oscuro')
  })
})

describe('guardarPreferencia', () => {
  it('la deja guardada para la próxima visita', () => {
    const almacen = almacenEnMemoria()

    guardarPreferencia(almacen, 'claro')

    expect(almacen.getItem(CLAVE_TEMA)).toBe('claro')
  })

  it('si el almacenamiento está bloqueado no rompe la app', () => {
    const bloqueado = {
      setItem: () => {
        throw new DOMException('lleno', 'QuotaExceededError')
      },
    } as unknown as Storage

    expect(() => guardarPreferencia(bloqueado, 'claro')).not.toThrow()
  })
})
