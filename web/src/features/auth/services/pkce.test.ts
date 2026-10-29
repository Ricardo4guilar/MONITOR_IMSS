import { describe, expect, it } from 'vitest'

import { desafioPkce, generarAleatorio } from '@/features/auth/services/pkce'

describe('PKCE', () => {
  it('el desafío S256 coincide con el vector oficial del RFC 7636 (apéndice B)', async () => {
    const verificador = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'

    expect(await desafioPkce(verificador)).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM')
  })

  it('genera valores aleatorios distintos, seguros para URL y del largo exigido', () => {
    const a = generarAleatorio()
    const b = generarAleatorio()

    expect(a).not.toBe(b)
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/)
    // 32 bytes en base64url sin relleno son 43 caracteres: el mínimo que permite el RFC para el verificador.
    expect(a).toHaveLength(43)
    expect(generarAleatorio(48)).toHaveLength(64)
  })
})
