import { aBase64Url } from '@/features/auth/services/base64url'

/**
 * Valor aleatorio criptográfico, legible en una URL. Con 32 bytes salen 43 caracteres (el mínimo del RFC 7636
 * para el verificador PKCE); con 48 bytes, 64.
 */
export function generarAleatorio(bytes = 32): string {
  return aBase64Url(crypto.getRandomValues(new Uint8Array(bytes)))
}

/** `code_challenge` del método S256 (RFC 7636): SHA-256 del verificador, en base64url. */
export async function desafioPkce(verificador: string): Promise<string> {
  const resumen = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verificador))
  return aBase64Url(new Uint8Array(resumen))
}
