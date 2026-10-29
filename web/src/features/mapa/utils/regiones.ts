/** Las cuatro regiones de la tabla EntidadesFederativas, en el orden de la leyenda. `token` es la variable CSS de index.css. */
export const REGIONES_OFICIALES = [
  { nombre: 'Norte/ Occidente', token: 'region-norte-occidente' },
  { nombre: 'Metropolitano', token: 'region-metropolitano' },
  { nombre: 'Centro/Sur', token: 'region-centro-sur' },
  { nombre: 'Centro/ Golfo/ Sureste', token: 'region-centro-golfo-sureste' },
] as const

const TOKENS_DE_RESPALDO = ['region-extra-1', 'region-extra-2', 'region-extra-3', 'region-extra-4'] as const

/** Tolera espacios de más entre la hoja, el CSV y el código ("Norte/  Occidente"). */
export function normalizarRegion(valor: string | null | undefined): string {
  return String(valor ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Oficiales primero, en su orden; las inesperadas después, alfabéticas. Sin repetidas. */
export function ordenarRegiones(presentes: readonly string[]): string[] {
  const unicas = [...new Set(presentes)]
  const oficiales = REGIONES_OFICIALES.map((r) => r.nombre as string).filter((nombre) => unicas.includes(nombre))
  const extras = unicas.filter((region) => !oficiales.includes(region)).sort()
  return [...oficiales, ...extras]
}

/** Color CSS de una región: el de su token si es oficial; si no, uno de respaldo según su posición. */
export function colorDeRegion(region: string, indiceRespaldo: number): string {
  const normalizada = normalizarRegion(region)
  const oficial = REGIONES_OFICIALES.find((r) => r.nombre === normalizada)
  const token = oficial?.token ?? TOKENS_DE_RESPALDO[indiceRespaldo % TOKENS_DE_RESPALDO.length]
  return `var(--${token})`
}
