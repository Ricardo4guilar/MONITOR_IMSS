import { describe, expect, it } from 'vitest'

import { aBase64Url, deBase64Url } from '@/features/auth/services/base64url'

describe('base64url', () => {
  it('usa el alfabeto seguro para URLs, sin relleno', () => {
    // En base64 normal estos tres bytes dan "+//+": aquí deben salir "-__-".
    expect(aBase64Url(new Uint8Array([251, 255, 254]))).toBe('-__-')
    expect(aBase64Url(new Uint8Array([102, 111]))).toBe('Zm8')
  })

  it('decodifica de vuelta, incluido texto con acentos', () => {
    const original = 'Ana Pérez · IMSS'
    const bytes = new TextEncoder().encode(original)

    expect(deBase64Url(aBase64Url(bytes))).toBe(original)
  })
})
