export function aBase64Url(bytes: Uint8Array): string {
  let binario = ''
  for (const byte of bytes) binario += String.fromCharCode(byte)
  // Alfabeto seguro para URLs y sin relleno «=», como exigen PKCE y los JWT.
  return btoa(binario).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

/** Devuelve el texto UTF-8 que había dentro (los JWT llevan JSON, y los nombres pueden tener acentos). */
export function deBase64Url(texto: string): string {
  const base64 = texto.replaceAll('-', '+').replaceAll('_', '/')
  const binario = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))
  return new TextDecoder().decode(Uint8Array.from(binario, (caracter) => caracter.charCodeAt(0)))
}
