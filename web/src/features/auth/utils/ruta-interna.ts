const RUTAS_DE_ACCESO = /^\/(login|auth\/callback)(?:[/?#]|$)/

const tieneControl = (texto: string) => [...texto].some((caracter) => caracter.charCodeAt(0) < 32)

/**
 * A dónde volver tras iniciar sesión. Solo rutas internas: si el destino pudiera ser cualquier URL,
 * el login serviría de redirección abierta hacia un sitio malicioso. Las propias pantallas de acceso
 * tampoco valen, porque llevarían a un bucle.
 */
export function rutaInterna(destino: unknown, porDefecto = '/dashboard'): string {
  if (typeof destino !== 'string' || destino === '') return porDefecto
  const esInterna = destino.startsWith('/') && !destino.startsWith('//') && !destino.includes('\\') && !tieneControl(destino)
  return esInterna && !RUTAS_DE_ACCESO.test(destino) ? destino : porDefecto
}
