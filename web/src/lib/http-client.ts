/**
 * Único lugar que llama a `fetch`. Devuelve el cuerpo como texto o lanza si la respuesta
 * no sirve: error HTTP, o una página HTML (Google la devuelve cuando la hoja es privada).
 */
export async function obtenerTexto(url: string): Promise<string> {
  const respuesta = await fetch(url, { cache: 'no-store' })
  if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`)

  const texto = await respuesta.text()
  if (/^\s*<(!doctype|html)/i.test(texto)) throw new Error('respuesta no es CSV (¿hoja privada?)')
  return texto
}

/**
 * POST `application/x-www-form-urlencoded` (el formato del endpoint de tokens OAuth 2.0). Devuelve el JSON
 * como `unknown`: quien lo llama lo valida con Zod. Lanza con un error HTTP, sin incluir el cuerpo ni los
 * parámetros, que pueden contener códigos o secretos.
 */
export async function enviarFormulario(url: string, campos: Record<string, string>): Promise<unknown> {
  const respuesta = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(campos).toString(),
    cache: 'no-store',
  })
  if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`)
  return respuesta.json()
}
