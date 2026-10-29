/** Lee un CSV respetando comillas, comas internas y comillas escapadas (""). */
export function parsearCsv(texto: string): string[][] {
  const filas: string[][] = []
  let fila: string[] = []
  let campo = ''
  let entreComillas = false

  for (let i = 0; i < texto.length; i++) {
    const caracter = texto.charAt(i)

    if (entreComillas) {
      if (caracter !== '"') {
        campo += caracter
      } else if (texto.charAt(i + 1) === '"') {
        campo += '"'
        i++
      } else {
        entreComillas = false
      }
      continue
    }

    switch (caracter) {
      case '"':
        entreComillas = true
        break
      case ',':
        fila.push(campo)
        campo = ''
        break
      case '\n':
        fila.push(campo)
        filas.push(fila)
        fila = []
        campo = ''
        break
      case '\r':
        break
      default:
        campo += caracter
    }
  }

  if (campo.length > 0 || fila.length > 0) {
    fila.push(campo)
    filas.push(fila)
  }

  return filas.filter((f) => f.some((valor) => valor.trim() !== ''))
}

/** Convierte las filas en objetos usando la primera como encabezado. */
export function filasAObjetos(filas: readonly string[][]): Record<string, string>[] {
  const [encabezado, ...datos] = filas
  if (!encabezado) return []

  const nombres = encabezado.map((nombre) => nombre.trim())
  return datos.map((fila) =>
    Object.fromEntries(nombres.map((nombre, i) => [nombre, (fila[i] ?? '').trim()])),
  )
}
